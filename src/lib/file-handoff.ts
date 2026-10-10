import { tools, type Tool } from "./tools";

/**
 * Files dropped on the home page are held in memory (never uploaded) and
 * picked up by the next tool page's FileDropzone after client navigation.
 */
let pending: { files: File[]; at: number } | null = null;

const MAX_AGE_MS = 5 * 60 * 1000;

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export function setPendingFiles(files: File[]): void {
  pending = files.length ? { files, at: Date.now() } : null;
}

export function clearPendingFiles(): void {
  pending = null;
}

/** Take (and clear) pending files that match the accepted extensions. */
export function takePendingFiles(acceptedExtensions: string[]): File[] {
  if (!pending || Date.now() - pending.at > MAX_AGE_MS) {
    pending = null;
    return [];
  }
  const files =
    acceptedExtensions.length === 0
      ? pending.files
      : pending.files.filter((f) =>
          acceptedExtensions.includes(extensionOf(f.name)),
        );
  pending = null;
  return files;
}

/** Tools whose catalog formats accept every given file. */
export function toolsForFiles(files: File[]): Tool[] {
  if (files.length === 0) return [];
  const exts = files.map((f) => extensionOf(f.name));
  return tools.filter(
    (tool) =>
      tool.acceptedFormats.length > 0 &&
      exts.every((ext) => tool.acceptedFormats.includes(ext)),
  );
}
