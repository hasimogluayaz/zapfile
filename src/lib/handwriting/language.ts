/**
 * Language-aware correction for Handwriting to Text (pure, Node-testable).
 *
 * The recognizer hardly ever outputs Turkish letters in handwriting (ı, ş,
 * ğ, ç come out as i, s, g, c) and readily confuses a handwritten "a" with
 * "o". On a Turkish page each word is re-scored against a word list: a
 * listed word wins when the recognizer's own character probabilities (CTC
 * likelihood over the word's time steps) plus the word's frequency beat what
 * was read. Candidates come from the recognizer's alternatives at each
 * character, so a clearly written word is never replaced by a "plausible"
 * one it doesn't look like.
 *
 * Measured on a real notebook page (Turkish history notes): 29.2 % → 20.4 %
 * character errors.
 */

// ── Folding ────────────────────────────────────────────────────────────────

const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

/** Lower case (Turkish rules) without Turkish diacritics: what the recognizer can tell apart. */
export function foldTurkish(s: string): string {
  return s.toLocaleLowerCase("tr").replace(/[çğıöşüâîû]/g, (c) => FOLD[c]);
}

// ── Word list ──────────────────────────────────────────────────────────────

export interface Lexicon {
  /** Folded form → the most frequent word with that form, and its frequency rank (1 = most frequent). */
  forms: Map<string, { word: string; rank: number }>;
}

/** Word list text: one word per line, most frequent first; lines starting with # are comments. */
export function parseLexicon(text: string): Lexicon {
  const forms = new Map<string, { word: string; rank: number }>();
  let rank = 0;
  for (const raw of text.split("\n")) {
    const word = raw.trim();
    if (!word || word.startsWith("#")) continue;
    rank++;
    const key = foldTurkish(word);
    if (!forms.has(key)) forms.set(key, { word, rank });
  }
  return { forms };
}

/** Log-frequency of a word by rank (Zipf fit on Turkish word counts), relative to an unseen word. */
const frequencyScore = (rank: number) => 16.8 - 1.05 * Math.log(rank);

// ── Recognizer scores ──────────────────────────────────────────────────────

/** The `k` likeliest classes of each time step (enough to score candidate words). */
export interface SparseScores {
  steps: number;
  k: number;
  cls: Uint16Array;
  p: Float32Array;
}

export function sparsifyScores(scores: Float32Array, steps: number, classes: number, k = 8): SparseScores {
  const cls = new Uint16Array(steps * k);
  const p = new Float32Array(steps * k);
  for (let t = 0; t < steps; t++) {
    const row = t * classes;
    const o = t * k;
    // Insertion into a small sorted list (descending).
    let n = 0;
    for (let c = 0; c < classes; c++) {
      const v = scores[row + c];
      if (n === k && v <= p[o + k - 1]) continue;
      let i = n < k ? n++ : k - 1;
      while (i > 0 && p[o + i - 1] < v) {
        p[o + i] = p[o + i - 1];
        cls[o + i] = cls[o + i - 1];
        i--;
      }
      p[o + i] = v;
      cls[o + i] = c;
    }
  }
  return { steps, k, cls, p };
}

const FLOOR = 1e-6;

/** Probability of any class of `set` at step `t`. */
function prob(s: SparseScores, t: number, set: number[]): number {
  const o = t * s.k;
  let p = 0;
  for (let i = 0; i < s.k; i++) if (set.includes(s.cls[o + i])) p += s.p[o + i];
  return Math.max(FLOOR, p);
}

const BLANK = [0];

const logAdd = (a: number, b: number) => (a === -Infinity ? b : b === -Infinity ? a : Math.max(a, b) + Math.log1p(Math.exp(-Math.abs(a - b))));

/**
 * CTC log-likelihood of a label sequence over time steps `t0 … t1`. Each
 * label is a set of equivalent classes (a letter with and without its
 * Turkish diacritic); blank = class 0.
 */
export function ctcLogLikelihood(s: SparseScores, t0: number, t1: number, labels: number[][]): number {
  const ext: number[][] = [BLANK];
  for (const c of labels) ext.push(c, BLANK);
  const n = ext.length;
  let a = new Float64Array(n).fill(-Infinity);
  a[0] = Math.log(prob(s, t0, BLANK));
  if (n > 1) a[1] = Math.log(prob(s, t0, ext[1]));
  for (let t = t0 + 1; t <= t1; t++) {
    const b = new Float64Array(n).fill(-Infinity);
    for (let i = 0; i < n; i++) {
      let v = a[i];
      if (i > 0) v = logAdd(v, a[i - 1]);
      if (i > 1 && ext[i] !== BLANK && ext[i] !== ext[i - 2]) v = logAdd(v, a[i - 2]);
      if (v !== -Infinity) b[i] = v + Math.log(prob(s, t, ext[i]));
    }
    a = b;
  }
  return n > 1 ? logAdd(a[n - 1], a[n - 2]) : a[0];
}

// ── Word correction ────────────────────────────────────────────────────────

/** Letter shapes handwriting confuses that the recognizer may be sure about anyway. */
const CONFUSED: Record<string, string> = { o: "a", a: "o", u: "o" };
/** Most combinations tried per word. */
const MAX_COMBINATIONS = 3000;

export interface CorrectOptions {
  /** Weight of word frequency against the recognizer's likelihood. */
  weight?: number;
  /** Characters a word needs before it is re-scored. */
  minLength?: number;
  /** Called for each replaced word (tests, tuning). */
  onChange?: (from: string, to: string, score: number) => void;
}

export interface DecodedLine {
  text: string;
  positions: number[];
  /** Time steps `[from, to]` of each character of `text`. */
  spans: [number, number][];
}

const isLetter = (c: string) => /\p{L}/u.test(c);

/**
 * Re-score the words of a decoded line against the word list, returning the
 * corrected text with each character's position along the box.
 */
export function correctLine(
  line: DecodedLine,
  scores: SparseScores,
  alphabet: string[],
  lexicon: Lexicon,
  { weight = 1, minLength = 3, onChange }: CorrectOptions = {},
): { text: string; positions: number[]; changed: number } {
  const chars = [...line.text];
  if (chars.length !== line.spans.length) return { text: line.text, positions: line.positions, changed: 0 };
  // Classes of each folded letter, by case: "c" → c, ç; "I" → I, İ.
  const groups = new Map<string, number[]>();
  alphabet.forEach((c, i) => {
    if (!c || !isLetter(c)) return;
    const key = foldTurkish(c) + (c === c.toLocaleLowerCase("tr") ? "" : "^");
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  const outText: string[] = [];
  const outPos: number[] = [];
  let changed = 0;
  let k = 0;
  while (k < chars.length) {
    if (!isLetter(chars[k])) {
      outText.push(chars[k]);
      outPos.push(line.positions[k]);
      k++;
      continue;
    }
    let e = k;
    while (e < chars.length && isLetter(chars[e])) e++;
    const word = chars.slice(k, e);
    const replacement = correctWord(word, k, e);
    if (replacement && replacement !== word.join("")) {
      changed++;
      const r = [...replacement];
      const p0 = line.positions[k], p1 = line.positions[e - 1];
      r.forEach((c, i) => {
        outText.push(c);
        outPos.push(r.length > 1 ? p0 + ((p1 - p0) * i) / (r.length - 1) : p0);
      });
    } else {
      for (let q = k; q < e; q++) {
        outText.push(chars[q]);
        outPos.push(line.positions[q]);
      }
    }
    k = e;
  }
  return { text: outText.join(""), positions: outPos, changed };

  function correctWord(word: string[], k: number, e: number): string | null {
    if (word.length < minLength) return null;
    // Acronyms and abbreviations ("TL", "ABD") stay as they are.
    if (word.every((c) => c === c.toLocaleUpperCase("tr") && c !== c.toLocaleLowerCase("tr"))) return null;
    // The word's time steps, including the blanks around it.
    const t0 = k > 0 ? line.spans[k - 1][1] + 1 : 0;
    const t1 = e < chars.length ? line.spans[e][0] - 1 : scores.steps - 1;
    if (t1 < t0) return null;
    // Alternatives at each character: the recognizer's likeliest letters there.
    const options: string[][] = word.map((c, q) => {
      const [from, to] = line.spans[k + q];
      const best = new Map<string, number>();
      for (let t = from; t <= to; t++) {
        const o = t * scores.k;
        for (let i = 0; i < scores.k; i++) {
          const ch = alphabet[scores.cls[o + i]] ?? "";
          if (!ch || !isLetter(ch) || scores.p[o + i] < 0.003) continue;
          const f = foldTurkish(ch);
          best.set(f, Math.max(best.get(f) ?? 0, scores.p[o + i]));
        }
      }
      const own = foldTurkish(c);
      const list = [own, ...[...best.entries()].filter(([f]) => f !== own).sort((a, b) => b[1] - a[1]).map(([f]) => f)].slice(0, 3);
      const confused = CONFUSED[own];
      if (confused && !list.includes(confused)) list.push(confused);
      return list;
    });
    // Labels for scoring: the folded letters (with or without diacritic), in the case the recognizer read.
    const labels = (folded: string): number[][] | null => {
      const out: number[][] = [];
      const f = [...folded];
      for (let q = 0; q < f.length; q++) {
        const upper = q < word.length && word[q] !== word[q].toLocaleLowerCase("tr");
        const set = (upper && groups.get(f[q] + "^")) || groups.get(f[q]);
        if (!set) return null;
        out.push(set);
      }
      return out;
    };
    const readLabels = labels(foldTurkish(word.join("")));
    if (!readLabels || readLabels.length !== word.length) return null;
    const base = ctcLogLikelihood(scores, t0, t1, readLabels);
    let best: { score: number; word: string } | null = null;
    const counter = new Array(word.length).fill(0);
    for (let n = 0; n < MAX_COMBINATIONS; n++) {
      const folded = counter.map((v, q) => options[q][v]).join("");
      const entry = lexicon.forms.get(folded);
      if (entry) {
        const l = labels(folded);
        if (l) {
          const score = ctcLogLikelihood(scores, t0, t1, l) - base + weight * frequencyScore(entry.rank);
          if (score > 0 && (!best || score > best.score)) best = { score, word: entry.word };
        }
      }
      // Next combination (odometer).
      let q = word.length - 1;
      while (q >= 0 && ++counter[q] >= options[q].length) counter[q--] = 0;
      if (q < 0) break;
    }
    if (!best) return null;
    // Short words ("osm" for Osmanlı) need clear evidence to change letters;
    // putting back Turkish letters ("ait", "kız") needs none.
    if (word.length <= 3 && best.score < 3 && foldTurkish(best.word) !== foldTurkish(word.join(""))) return null;
    // Keep a capital first letter (Turkish casing: i → İ).
    const first = word[0] !== word[0].toLowerCase();
    const result = first ? best.word[0].toLocaleUpperCase("tr") + best.word.slice(1) : best.word;
    if (result !== word.join("")) onChange?.(word.join(""), result, best.score);
    return result;
  }
}

// ── Language detection ─────────────────────────────────────────────────────

const TURKISH_WORDS = new Set(
  ("ve bir bu ile icin da de ne gibi daha cok olarak kadar ama en her sonra once ilk olan ki var yok ise veya mi mu " +
    "ben sen biz siz onlar onu bunu sunu nasil neden cunku yani hem ya tum butun cok cok degil gore kez ayrica ancak " +
    "hangi bile icinde arasinda uzerinde hic simdi zaman yer iki uc dort bes buyuk kucuk yeni eski yil gun").split(" "),
);
const ENGLISH_WORDS = new Set(
  ("the and of to is in it you that for on with are was be this have i my an at by from not but or do does did " +
    "he she we they his her their what which who when where why how will would can could should there here").split(" "),
);
const TURKISH_ENDINGS = /(lar|ler|nin|nun|dir|dur|tir|tur|mis|yor|dan|den|tan|ten|nda|nde|masi|mesi|lari|leri|ini|ina|ya|ye)$/;

/**
 * Whether recognized text is Turkish. `hint` is the page language: on a
 * Turkish page, text counts as Turkish unless it clearly reads as English.
 */
export function looksTurkish(texts: string[], hint?: string): boolean {
  let tr = 0, en = 0;
  for (const text of texts) {
    for (const raw of text.split(/[^\p{L}]+/u)) {
      if (!raw) continue;
      if (/[ğışİ]/.test(raw)) tr += 2;
      const w = foldTurkish(raw);
      if (TURKISH_WORDS.has(w)) tr++;
      else if (ENGLISH_WORDS.has(w)) en++;
      else if (w.length >= 5 && TURKISH_ENDINGS.test(w)) tr += 0.5;
    }
  }
  if (hint === "tr") return tr >= en;
  return tr >= 3 && tr > 2 * en;
}
