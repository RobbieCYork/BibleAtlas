/* Handing a finished file to the person. On a phone (including the home-screen web app, where a
 * download link opens a preview with no way to keep the file) that is the share sheet, which has
 * Save to Files, AirDrop and Print. Elsewhere it is an ordinary download. Both are called straight
 * from a tap, after the file exists, so the browser still counts it as the person's own action. */

export function canShareFiles(files: File[]): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

/** False when the person closed the share sheet without choosing anything. */
export async function shareFiles(files: File[]): Promise<boolean> {
  try {
    await navigator.share({ files });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return false;
    throw new Error("The share sheet didn't open. Try again, or use Download.");
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
