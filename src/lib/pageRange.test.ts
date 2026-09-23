import { describe, it, expect } from 'vitest';
import { parsePageRange } from './pageRange';

describe('pageRange parser', () => {
  it('parses "all" and empty ranges to full count', () => {
    const res1 = parsePageRange('all', 5);
    expect(res1.valid).toBe(true);
    expect(res1.pageCount).toBe(5);
    expect(res1.pages).toEqual([1, 2, 3, 4, 5]);

    const res2 = parsePageRange('', 3);
    expect(res2.valid).toBe(true);
    expect(res2.pageCount).toBe(3);
  });

  it('parses discrete comma-separated pages', () => {
    const res = parsePageRange('2, 4, 7', 10);
    expect(res.valid).toBe(true);
    expect(res.pages).toEqual([2, 4, 7]);
    expect(res.pageCount).toBe(3);
  });

  it('parses ranges like 1-5', () => {
    const res = parsePageRange('1-5', 10);
    expect(res.valid).toBe(true);
    expect(res.pages).toEqual([1, 2, 3, 4, 5]);
    expect(res.pageCount).toBe(5);
  });

  it('parses mixed ranges and discrete pages like 1-3,8,10-12', () => {
    const res = parsePageRange('1-3, 8, 10-12', 15);
    expect(res.valid).toBe(true);
    expect(res.pages).toEqual([1, 2, 3, 8, 10, 11, 12]);
    expect(res.pageCount).toBe(7);
  });

  it('rejects invalid syntax, negatives, and zeros', () => {
    expect(parsePageRange('0', 5).valid).toBe(false);
    expect(parsePageRange('-2', 5).valid).toBe(false);
    expect(parsePageRange('5-2', 10).valid).toBe(false);
    expect(parsePageRange('abc', 10).valid).toBe(false);
  });

  it('rejects pages exceeding total document pages', () => {
    const res = parsePageRange('1-12', 10);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds total document pages');
  });
});
