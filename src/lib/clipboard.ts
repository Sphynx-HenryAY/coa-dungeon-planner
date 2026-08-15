/** Copy a grid that pastes into cells in Google Sheets and Excel. */
export async function copySpreadsheet(
  tsv: string,
  html: string,
): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        "text/plain": Promise.resolve(new Blob([tsv], { type: "text/plain" })),
        "text/html": Promise.resolve(new Blob([html], { type: "text/html" })),
      });
      await navigator.clipboard.write([item]);
      return;
    } catch {
      // Some browsers reject HTML clipboard writes; TSV still pastes as a grid.
    }
  }
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available");
  }
  await navigator.clipboard.writeText(tsv);
}
