/**
 * Checks for the pure Handwriting to Text code (src/lib/handwriting/pipeline.ts):
 * note clean-up rules (including cases that must stay untouched), CTC decoding
 * and column reading. Run: npm run test:handwriting
 */
import assert from "node:assert/strict";

const P = await import("../src/lib/handwriting/pipeline.ts");

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
