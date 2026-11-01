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

/**
 * Word list text (models/lexicons/tr.txt). Lines starting with # are
 * comments. "=R" starts a group of words of about frequency rank R, whose
 * lines are front-coded: a digit (characters shared with the previous word)
 * then the rest of the word. Plain word lines (most frequent first, rank =
 * line number) are read too.
 */
export function parseLexicon(text: string): Lexicon {
  const forms = new Map<string, { word: string; rank: number }>();
  let rank = 0, group = 0, prev = "";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("=")) {
      group = Number(line.slice(1)) || 1;
      prev = "";
      continue;
    }
    let word = line;
    if (line[0] >= "0" && line[0] <= "9") {
      word = prev.slice(0, Number(line[0])) + line.slice(1);
      prev = word;
    }
    rank++;
    const key = foldTurkish(word);
    if (!forms.has(key)) forms.set(key, { word, rank: group || rank });
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

/**
 * A CTC label: classes that count as this letter, each with a weight (1 for
 * the letter with or without its diacritic; less for a letter this writer's
 * hand is often read as, see `learnConfusions`).
 */
export interface Label {
  ids: number[];
  weights: number[];
}

/** Probability of the label at step `t`. */
function prob(s: SparseScores, t: number, label: Label): number {
  const o = t * s.k;
  let p = 0;
  for (let i = 0; i < s.k; i++) {
    const j = label.ids.indexOf(s.cls[o + i]);
    if (j >= 0) p += label.weights[j] * s.p[o + i];
  }
  return Math.max(FLOOR, p);
}

const BLANK: Label = { ids: [0], weights: [1] };

const logAdd = (a: number, b: number) => (a === -Infinity ? b : b === -Infinity ? a : Math.max(a, b) + Math.log1p(Math.exp(-Math.abs(a - b))));

/**
 * CTC log-likelihood of a label sequence over time steps `t0 … t1`. Each
 * label is a set of equivalent classes (a letter with and without its
 * Turkish diacritic); blank = class 0.
 */
export function ctcLogLikelihood(s: SparseScores, t0: number, t1: number, labels: Label[]): number {
  const ext: Label[] = [BLANK];
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
  /**
   * How often this writer's letters are read as another letter, by folded
   * letter: `{ a: { o: 0.4 } }` = an "a" of this hand is read as "o" 40 % of
   * the time (`learnConfusions`).
   */
  confusions?: Confusions;
}

export type Confusions = Record<string, Record<string, number>>;

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
  { weight = 1, minLength = 3, onChange, confusions = {} }: CorrectOptions = {},
): { text: string; positions: number[]; changed: number; words: [string, string][] } {
  const chars = [...line.text];
  if (chars.length !== line.spans.length) return { text: line.text, positions: line.positions, changed: 0, words: [] };
  // Classes of each folded letter, by case: "c" → c, ç; "I" → I, İ.
  const classes = new Map<string, number[]>();
  alphabet.forEach((c, i) => {
    if (!c || !isLetter(c)) return;
    const key = foldTurkish(c) + (c === c.toLocaleLowerCase("tr") ? "" : "^");
    classes.set(key, [...(classes.get(key) ?? []), i]);
  });
  // One Label object per letter and case (CTC compares labels by identity);
  // short words ("osm") only get the plain letters.
  const groups = new Map<string, Label>();
  const plain = new Map<string, Label>();
  for (const [key, ids] of classes) {
    plain.set(key, { ids, weights: ids.map(() => 1) });
    const letter = key.replace("^", ""), upper = key.endsWith("^");
    const label: Label = { ids: [...ids], weights: ids.map(() => 1) };
    for (const [other, rate] of Object.entries(confusions[letter] ?? {})) {
      for (const id of classes.get(other + (upper ? "^" : "")) ?? []) {
        label.ids.push(id);
        label.weights.push(rate);
      }
    }
    groups.set(key, label);
  }
  const words: [string, string][] = [];
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
  return { text: outText.join(""), positions: outPos, changed, words };

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
    const labels = (folded: string): Label[] | null => {
      const out: Label[] = [];
      const f = [...folded];
      for (let q = 0; q < f.length; q++) {
        const upper = q < word.length && word[q] !== word[q].toLocaleLowerCase("tr");
        const g = word.length <= 3 ? plain : groups;
        const set = (upper && g.get(f[q] + "^")) || g.get(f[q]);
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
    words.push([word.join(""), best.word]);
    // Keep a capital first letter (Turkish casing: i → İ).
    const first = word[0] !== word[0].toLowerCase();
    const result = first ? best.word[0].toLocaleUpperCase("tr") + best.word.slice(1) : best.word;
    if (result !== word.join("")) onChange?.(word.join(""), result, best.score);
    return result;
  }
}

/**
 * Learn how this writer's vowels get misread, from the words of a page that
 * matched the word list: if many words came out right only after an "o"
 * became "a" ("kodor" → "kadar", "olmosi" → "olması"), this hand's "a" looks
 * like an "o", and a second pass lets the recognizer's "o" count as weak
 * evidence for "a" everywhere — enough for rarer words ("Troblusgorp").
 */
export function learnConfusions(words: [string, string][], { minSamples = 8, minRate = 0.15, maxRate = 0.6 } = {}): Confusions {
  const seen: Record<string, number> = {};
  const misread: Record<string, Record<string, number>> = {};
  for (const [read, final] of words) {
    const r = [...foldTurkish(read)], f = [...foldTurkish(final)];
    if (r.length !== f.length) continue;
    f.forEach((letter, i) => {
      if (!CONFUSABLE.has(letter)) return;
      seen[letter] = (seen[letter] ?? 0) + 1;
      if (r[i] !== letter && CONFUSED[r[i]] !== undefined) {
        misread[letter] ??= {};
        misread[letter][r[i]] = (misread[letter][r[i]] ?? 0) + 1;
      }
    });
  }
  const out: Confusions = {};
  for (const [letter, counts] of Object.entries(misread)) {
    if ((seen[letter] ?? 0) < minSamples) continue;
    for (const [as, n] of Object.entries(counts)) {
      const rate = n / seen[letter];
      if (rate >= minRate) (out[letter] ??= {})[as] = Math.min(maxRate, rate);
    }
  }
  return out;
}

const CONFUSABLE = new Set(Object.keys(CONFUSED));

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
