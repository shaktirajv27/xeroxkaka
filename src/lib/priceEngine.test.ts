import { describe, it, expect } from 'vitest';
import { calculateItemPrice, calculateOrderSummary } from './priceEngine';

describe('Price Calculation Engine', () => {
  it('calculates single-side A4 B&W correctly (3 pages, 2 copies, ₹2/page = ₹12)', () => {
    const res = calculateItemPrice({
      paper_size: 'A4',
      print_color: 'bw',
      print_side: 'single',
      copies: 2,
      page_range: '1-3',
      total_document_pages: 5,
    });

    expect(res.calculated_pages).toBe(3);
    expect(res.price_per_page).toBe(2.0);
    expect(res.print_subtotal).toBe(12.0); // 3 pages * 2 copies * ₹2 = 12
    expect(res.item_total).toBe(12.0);
  });

  it('calculates double-side A4 B&W correctly (4 pages, 1 copy, ₹1.5/page = ₹6)', () => {
    const res = calculateItemPrice({
      paper_size: 'A4',
      print_color: 'bw',
      print_side: 'double',
      copies: 1,
      page_range: 'all',
      total_document_pages: 4,
    });

    expect(res.calculated_pages).toBe(4);
    expect(res.price_per_page).toBe(1.5);
    expect(res.item_total).toBe(6.0); // 4 * 1.5 = 6
  });

  it('calculates color printing with lamination add-on', () => {
    const res = calculateItemPrice({
      paper_size: 'A4',
      print_color: 'color',
      print_side: 'single',
      copies: 1,
      page_range: '1',
      total_document_pages: 1,
      lamination_type: 'lamination', // +₹20
    });

    expect(res.print_subtotal).toBe(10.0); // 1 page * 1 copy * ₹10
    expect(res.lamination_price).toBe(20.0);
    expect(res.item_total).toBe(30.0); // 10 + 20
  });

  it('calculates order summary with multiple files', () => {
    const summary = calculateOrderSummary([
      {
        paper_size: 'A4',
        print_color: 'bw',
        print_side: 'single',
        copies: 2,
        page_range: '1-3',
        total_document_pages: 5,
      }, // 12
      {
        paper_size: 'A4',
        print_color: 'color',
        print_side: 'single',
        copies: 1,
        page_range: '1',
        total_document_pages: 1,
      }, // 10
    ]);

    expect(summary.total_pages).toBe(7); // 3*2 + 1*1 = 7
    expect(summary.total_copies).toBe(3); // 2 + 1 = 3
    expect(summary.subtotal).toBe(22.0); // 12 + 10 = 22
    expect(summary.total).toBe(22.0);
  });
});
