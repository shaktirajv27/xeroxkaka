/**
 * Client-side PDF page counter and metadata helper.
 * Parses PDF ArrayBuffer to extract `/Count N` or `/Type /Page` occurrences.
 */
export async function extractPdfPageCount(file: File): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('latin1').decode(bytes);

    // Look for `/Type /Pages /Count N`
    const countMatch = text.match(/\/Count\s+(\d+)/g);
    if (countMatch && countMatch.length > 0) {
      let maxCount = 1;
      for (const m of countMatch) {
        const val = parseInt(m.replace(/\/Count\s+/, ''), 10);
        if (!isNaN(val) && val > maxCount) {
          maxCount = val;
        }
      }
      return maxCount;
    }

    // Fallback: count individual `/Type /Page` objects (excluding `/Type /Pages`)
    const pageMatches = text.match(/\/Type\s*\/Page(?!\w)/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }

    return 1;
  } catch (err) {
    console.warn('Could not extract PDF page count, defaulting to 1', err);
    return 1;
  }
}
