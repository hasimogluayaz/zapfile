/**
 * Checks for the pure Handwriting to Text code (src/lib/handwriting/pipeline.ts,
 * language.ts): note clean-up rules (including cases that must stay
 * untouched), CTC decoding, margin marks, column reading and the Turkish
 * word-list correction. Run: npm run test:handwriting
 */
import assert from "node:assert/strict";

const P = await import("../src/lib/handwriting/pipeline.ts");
const L = await import("../src/lib/handwriting/language.ts");

// ── Note clean-up ──────────────────────────────────────────────────────────
const lines = [
  ["Present simple (1do)", "Present simple (I do)"],
  ["Present simple (Ido)", "Present simple (I do)"],
  ["-) it takes me an hour", "→ it takes me an hour"],
  ["—) 1 always do an l'm always doing.", "→ I always do an I'm always doing."],
  ["l've lost my keys", "I've lost my keys"],
  ["x -> y", "x → y"],
  // must not change
  ["Step 1 do this first", "Step 1 do this first"],
  ["1 tane elma al", "1 tane elma al"],
  ["Verb (-s) takısı", "Verb (-s) takısı"],
  ["L size shirt", "L size shirt"],
  ["Toplam 1.250 TL", "Toplam 1.250 TL"],
  ["Saat 10'da gel", "Saat 10'da gel"],
  ["land and sea", "land and sea"],
  ["the 1 thing", "the 1 thing"],
  ["a smiley :-) here", "a smiley :-) here"],
  // arrows whose shaft was lost, dot bullets
  [") Nedenleri: siyasi birlik", "→ Nedenleri: siyasi birlik"],
  ["> Itolyo, abluka", "→ Itolyo, abluka"],
  [". Trablusgarp halkı", "• Trablusgarp halkı"],
  ["> 5 kişi", "> 5 kişi"],
  ["...ve sonra", "...ve sonra"],
];
for (const [input, want] of lines) assert.equal(P.cleanNoteLines([input])[0], want, input);
assert.deepEqual(P.cleanNoteLines(["L He comes there.", "L) when does he come?", "4 She doesn't."]), ["↳ He comes there.", "↳ when does he come?", "↳ She doesn't."]);
assert.deepEqual(P.cleanNoteLines(["4 eggs", "4 apples"]), ["4 eggs", "4 apples"], "quantities are not bullets");
assert.deepEqual(P.cleanNoteLines(["4 Eier", "4 Äpfel kaufen"]), ["4 Eier", "4 Äpfel kaufen"], "capitalized nouns are not bullets");
assert.deepEqual(
  P.cleanNoteLines(["4 It would be nice to buy a new car.", "4 It's a shame you didn't see the film."]),
  ["↳ It would be nice to buy a new car.", "↳ It's a shame you didn't see the film."],
);
assert.deepEqual(P.cleanNoteLines(["L He comes."]), ["L He comes."], "one mark alone is not a bullet");

// ── CTC decoding: letters and digits stay consistent within a word ─────────
{
  const alphabet = P.buildAlphabet(["d", "o", "0", "1", "l", " "]);
  const classes = alphabet.length - 1; // the model has no appended space
  const frame = (probs) => Array.from({ length: classes }, (_, c) => probs[c] ?? 0);
  // "d", blank, then a frame torn between "0" (0.55) and "o" (0.45).
  const steps = [frame({ 1: 1 }), frame({ 0: 1 }), frame({ 3: 0.55, 2: 0.45 })];
  const scores = Float32Array.from(steps.flat());
  assert.equal(P.ctcDecode(scores, 3, classes, alphabet).text, "d0");
  assert.equal(P.ctcDecode(scores, 3, classes, alphabet, { typeRatio: 0.05 }).text, "do");
}

// ── Margin marks: spiral binding rings read as stray characters ────────────
{
  const box = (text, x, y, w, confidence) => ({ text, confidence, box: { cx: x + w / 2, cy: y, w, h: 28, ux: 1, uy: 0, score: 1 } });
  const text = [0, 1, 2, 3, 4, 5].map((i) => box(`Satır ${i} burada yazıyor`, 160, 100 + 40 * i, 700, 0.9));
  const rings = [box("9", 90, 100, 25, 0.46), box("a", 90, 140, 27, 0.2), box("0", 90, 180, 24, 0.36), box("4", 92, 220, 22, 0.92)];
  const pageNumber = box("1", 1080, 40, 30, 1);
  assert.deepEqual(P.dropMarginMarks([...text, ...rings, pageNumber]), [...text, pageNumber]);
  // A numbered list in the margin reads with confidence and stays.
  const numbers = [box("1.", 90, 100, 30, 0.95), box("2.", 90, 140, 30, 0.93), box("3.", 90, 180, 30, 0.96)];
  assert.equal(P.dropMarginMarks([...text, ...numbers]).length, text.length + numbers.length);
}

// ── Turkish word list: ı/ş/ğ/ç back, handwritten "a" read as "o" ───────────
{
  assert.equal(L.foldTurkish("Savaşı İtalya ÇIKTI"), "savasi italya cikti");
  const lex = L.parseLexicon("# comment\nve\nsavaşı\nçay\ngay\nkadar\n");
  assert.equal(lex.forms.get("savasi").word, "savaşı");
  assert.equal(lex.forms.get("cay").rank, 3);
  const letters = ["a", "o", "s", "v", "i", "ı", "ç", "c", "g", "y", "k", "d", "r", "x", "q", "z"];
  const alphabet = P.buildAlphabet(letters);
  const classes = alphabet.length - 1;
  const id = (c) => alphabet.indexOf(c);
  /** One step per character (with alternatives) and a blank step between characters. */
  const decode = (spec) => {
    const rows = [];
    for (const step of spec) {
      rows.push(Array.from({ length: classes }, (_, c) => step[alphabet[c]] ?? 0));
      rows.push(Array.from({ length: classes }, (_, c) => (c === 0 ? 1 : 0)));
    }
    const scores = Float32Array.from(rows.flat());
    const d = P.ctcDecode(scores, rows.length, classes, alphabet);
    return { d, sparse: L.sparsifyScores(scores, rows.length, classes, 6) };
  };
  const fix = (spec) => {
    const { d, sparse } = decode(spec);
    return L.correctLine(d, sparse, alphabet, lex).text;
  };
  // "sovasi": the o is unsure (a has 10 %) → "savaşı".
  assert.equal(fix([{ s: 1 }, { o: 0.9, a: 0.1 }, { v: 1 }, { a: 1 }, { s: 1 }, { i: 1 }]), "savaşı");
  // Even a sure "o" becomes "a" in a listed word ("kodor" → "kadar"): handwriting confuses them.
  assert.equal(fix([{ k: 1 }, { o: 0.98, a: 0.02 }, { d: 1 }, { o: 0.97, a: 0.03 }, { r: 1 }]), "kadar");
  // A clearly read Turkish letter isn't traded for a "similar" word: çay stays çay.
  assert.equal(fix([{ ç: 0.95, g: 0.05 }, { a: 1 }, { y: 1 }]), "çay");
  // Words that aren't close to a listed word stay as read.
  assert.equal(fix([{ x: 1 }, { q: 1 }, { z: 1 }, { a: 1 }]), "xqza");
  // Language: Turkish notes vs English notes; a Turkish UI tips unclear text.
  assert.equal(L.looksTurkish(["Rusya ve italya arasinda yapildi", "Bu konuyu ayrica konusmaliyim"]), true);
  assert.equal(L.looksTurkish(["It is raining now, so take an umbrella", "I always drink coffee in the morning"], "tr"), false);
  assert.equal(L.looksTurkish(["Mehmet Hamdi"], "tr"), true);
  assert.equal(L.looksTurkish(["Mehmet Hamdi"]), false);
}

// ── Columns: side-by-side lists are read column by column ──────────────────
{
  const item = (text, x0, x1, y) => ({ text, confidence: 0.9, box: { cx: (x0 + x1) / 2, cy: y, w: x1 - x0, h: 40, ux: 1, uy: 0, score: 1 } });
  const items = [
    item("I am doing", 100, 400, 100), item("I do", 700, 900, 100),
    item("It isn't raining now.", 100, 520, 160), item("Water boils at 100 degrees", 700, 1150, 160),
    item("I'm getting hungry.", 100, 480, 220), item("I always get hungry", 700, 1100, 220),
  ];
  assert.equal(
    P.assembleText(P.groupLines(items), "lines"),
    "I am doing\nIt isn't raining now.\nI'm getting hungry.\n\nI do\nWater boils at 100 degrees\nI always get hungry",
  );
  // An ordinary line with a wide gap once is not a column.
  const one = [item("Name:", 100, 250, 100), item("Ahmet", 700, 850, 100), item("A normal sentence that runs across", 100, 1100, 160)];
  assert.equal(P.assembleText(P.groupLines(one), "lines"), "Name: Ahmet\nA normal sentence that runs across");
}

console.log("handwriting: all checks passed");
