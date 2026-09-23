/**
 * Robust Page Range Parser & Validator
 * Supports: 'all', '1-5', '2,4,7', '1-3,8,10-12'
 */

export interface PageRangeResult {
  valid: boolean;
  pages: number[];
  pageCount: number;
  error?: string;
}

export function parsePageRange(rangeStr: string, totalPages?: number): PageRangeResult {
  const trimmed = (rangeStr || '').trim().toLowerCase();

  // If empty or 'all', default to all known pages (or at least 1)
  if (!trimmed || trimmed === 'all') {
    const count = totalPages && totalPages > 0 ? totalPages : 1;
    const pages = Array.from({ length: count }, (_, i) => i + 1);
    return {
      valid: true,
      pages,
      pageCount: count,
    };
  }

  // Tokenize by comma
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { valid: false, pages: [], pageCount: 0, error: 'Please enter a valid page number or range.' };
  }

  const selectedPages = new Set<number>();

  for (const part of parts) {
    // Range format: X-Y
    if (part.includes('-')) {
      const sides = part.split('-');
      if (sides.length !== 2) {
        return { valid: false, pages: [], pageCount: 0, error: `Invalid range syntax: "${part}"` };
      }

      const start = Number(sides[0].trim());
      const end = Number(sides[1].trim());

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { valid: false, pages: [], pageCount: 0, error: `Range values must be whole numbers: "${part}"` };
      }

      if (start <= 0 || end <= 0) {
        return { valid: false, pages: [], pageCount: 0, error: 'Page numbers must be 1 or greater.' };
      }

      if (start > end) {
        return { valid: false, pages: [], pageCount: 0, error: `Invalid range: ${start} is greater than ${end}` };
      }

      if (totalPages && totalPages > 0 && end > totalPages) {
        return {
          valid: false,
          pages: [],
          pageCount: 0,
          error: `Page ${end} exceeds total document pages (${totalPages}).`,
        };
      }

      for (let p = start; p <= end; p++) {
        selectedPages.add(p);
      }
    } else {
      // Single page format: X
      const page = Number(part);
      if (!Number.isInteger(page)) {
        return { valid: false, pages: [], pageCount: 0, error: `Invalid page number: "${part}"` };
      }

      if (page <= 0) {
        return { valid: false, pages: [], pageCount: 0, error: 'Page numbers must be 1 or greater.' };
      }

      if (totalPages && totalPages > 0 && page > totalPages) {
        return {
          valid: false,
          pages: [],
          pageCount: 0,
          error: `Page ${page} exceeds total document pages (${totalPages}).`,
        };
      }

      selectedPages.add(page);
    }
  }

  const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
  return {
    valid: true,
    pages: sortedPages,
    pageCount: sortedPages.length,
  };
}
