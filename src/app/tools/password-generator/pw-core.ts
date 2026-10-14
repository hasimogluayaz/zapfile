/**
 * Password, passphrase and PIN generation with the Web Crypto RNG.
 * Indices use rejection sampling, so every character/word is equally likely
 * (a plain `random % n` would favour the first characters of the set).
 */

export const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?/~",
} as const;
export type SetKey = keyof typeof SETS;

const SIMILAR = /[0O1lI|]/g;
const AMBIGUOUS = /[{}[\]()/\\'"`~,;:.<>]/g;

/** Uniform integer in [0, n). */
export function randomInt(n: number): number {
  if (n <= 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % n;
  }
}

export interface PasswordOptions {
  length: number;
  sets: Record<SetKey, boolean>;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
}

export function poolsFor(o: PasswordOptions): string[] {
  return (Object.keys(SETS) as SetKey[])
    .filter((k) => o.sets[k])
    .map((k) => {
      let s: string = SETS[k];
      if (o.excludeSimilar) s = s.replace(SIMILAR, "");
      if (o.excludeAmbiguous) s = s.replace(AMBIGUOUS, "");
      return s;
    })
    .filter((s) => s.length > 0);
}

/** Every chosen character type appears at least once (sites often require it). */
export function generatePassword(o: PasswordOptions): string {
  const pools = poolsFor(o);
  if (!pools.length) return "";
  const all = pools.join("");
  const chars: string[] = pools.slice(0, o.length).map((p) => p[randomInt(p.length)]!);
  while (chars.length < o.length) chars.push(all[randomInt(all.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

export function passwordEntropy(o: PasswordOptions): number {
  const size = poolsFor(o).join("").length;
  return size > 1 ? o.length * Math.log2(size) : 0;
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  addNumber: boolean;
}

export function generatePassphrase(list: string[], o: PassphraseOptions): string {
  const words = Array.from({ length: o.words }, () => {
    const w = list[randomInt(list.length)]!;
    return o.capitalize ? w[0]!.toUpperCase() + w.slice(1) : w;
  });
  if (o.addNumber) {
    const i = randomInt(words.length);
    words[i] = words[i]! + String(randomInt(10));
  }
  return words.join(o.separator);
}

export function passphraseEntropy(listSize: number, o: PassphraseOptions): number {
  return o.words * Math.log2(listSize) + (o.addNumber ? Math.log2(10 * o.words) : 0);
}

export function generatePin(length: number): string {
  return Array.from({ length }, () => String(randomInt(10))).join("");
}

/** Average time to guess at 100 billion guesses per second (offline attack on a fast hash). */
export function crackSeconds(bits: number): number {
  return bits <= 0 ? 0 : Math.pow(2, bits - 1) / 1e11;
}
