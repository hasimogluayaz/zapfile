/** Streaming hashes with hash-wasm (WebAssembly): any file size, constant memory. */
import {
  createBLAKE3,
  createCRC32,
  createHMAC,
  createMD5,
  createSHA1,
  createSHA256,
  createSHA3,
  createSHA384,
  createSHA512,
  type IHasher,
} from "hash-wasm";

export const ALGOS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512", "SHA3-256", "BLAKE3", "CRC32"] as const;
export type Algo = (typeof ALGOS)[number];
/** Algorithms HMAC is defined for here (CRC32 is a checksum, BLAKE3 has its own keyed mode). */
export const HMAC_ALGOS: Algo[] = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512", "SHA3-256"];

function base(a: Algo): Promise<IHasher> {
  switch (a) {
    case "MD5":
      return createMD5();
    case "SHA-1":
      return createSHA1();
    case "SHA-256":
      return createSHA256();
    case "SHA-384":
      return createSHA384();
    case "SHA-512":
      return createSHA512();
    case "SHA3-256":
      return createSHA3(256);
    case "BLAKE3":
      return createBLAKE3();
    case "CRC32":
      return createCRC32();
  }
}

export async function makeHashers(algos: Algo[], hmacKey: string | null): Promise<{ algo: Algo; h: IHasher }[]> {
  const out: { algo: Algo; h: IHasher }[] = [];
  for (const algo of algos) {
    if (hmacKey !== null && !HMAC_ALGOS.includes(algo)) continue;
    const h = hmacKey !== null ? await createHMAC(base(algo), hmacKey) : await base(algo);
    h.init();
    out.push({ algo, h });
  }
  return out;
}

export interface HashJob {
  id: number;
  algos: Algo[];
  hmacKey: string | null;
  text?: string;
  file?: File;
}

export type HashMsg =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "done"; results: { algo: Algo; hex: string }[]; ms: number }
  | { id: number; type: "error"; message: string };

const CHUNK = 4 * 1024 * 1024;

export async function runHash(job: HashJob, progress: (done: number, total: number) => void): Promise<{ algo: Algo; hex: string }[]> {
  const hashers = await makeHashers(job.algos, job.hmacKey);
  if (job.file) {
    const total = job.file.size;
    let done = 0;
    for (let off = 0; off < total || (total === 0 && off === 0); off += CHUNK) {
      const buf = new Uint8Array(await job.file.slice(off, off + CHUNK).arrayBuffer());
      for (const { h } of hashers) h.update(buf);
      done = Math.min(total, off + CHUNK);
      progress(done, total);
      if (total === 0) break;
    }
  } else {
    const data = new TextEncoder().encode(job.text ?? "");
    for (const { h } of hashers) h.update(data);
  }
  return hashers.map(({ algo, h }) => ({ algo, hex: h.digest("hex") }));
}
