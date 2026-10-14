export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking right after click() cancels the download in Safari, Firefox and
  // sometimes Chrome: the browser reads the blob URL asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}
