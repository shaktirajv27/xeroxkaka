import { PaperSize, PrintColor, PrintSide, PricingRule, ShopService, OrderItem } from '../types/database';
import { parsePageRange } from './pageRange';

export const DEFAULT_PRICING_RULES: Omit<PricingRule, 'id' | 'shop_id' | 'created_at' | 'updated_at'>[] = [
  // A4
  { paper_size: 'A4', print_color: 'bw', print_side: 'single', price_per_page: 2.0 },
  { paper_size: 'A4', print_color: 'bw', print_side: 'double', price_per_page: 1.5 }, // 2 sides = ₹3
  { paper_size: 'A4', print_color: 'color', print_side: 'single', price_per_page: 10.0 },
  { paper_size: 'A4', print_color: 'color', print_side: 'double', price_per_page: 7.5 }, // 2 sides = ₹15

  // A3
  { paper_size: 'A3', print_color: 'bw', print_side: 'single', price_per_page: 5.0 },
  { paper_size: 'A3', print_color: 'bw', print_side: 'double', price_per_page: 4.0 },
  { paper_size: 'A3', print_color: 'color', print_side: 'single', price_per_page: 20.0 },
  { paper_size: 'A3', print_color: 'color', print_side: 'double', price_per_page: 15.0 },

  // A5
  { paper_size: 'A5', print_color: 'bw', print_side: 'single', price_per_page: 2.0 },
  { paper_size: 'A5', print_color: 'bw', print_side: 'double', price_per_page: 1.5 },
  { paper_size: 'A5', print_color: 'color', print_side: 'single', price_per_page: 8.0 },
  { paper_size: 'A5', print_color: 'color', print_side: 'double', price_per_page: 6.0 },

  // Legal
  { paper_size: 'Legal', print_color: 'bw', print_side: 'single', price_per_page: 3.0 },
  { paper_size: 'Legal', print_color: 'bw', print_side: 'double', price_per_page: 2.25 },
  { paper_size: 'Legal', print_color: 'color', print_side: 'single', price_per_page: 12.0 },
  { paper_size: 'Legal', print_color: 'color', print_side: 'double', price_per_page: 9.0 },

  // Letter
  { paper_size: 'Letter', print_color: 'bw', print_side: 'single', price_per_page: 2.0 },
  { paper_size: 'Letter', print_color: 'bw', print_side: 'double', price_per_page: 1.5 },
  { paper_size: 'Letter', print_color: 'color', print_side: 'single', price_per_page: 10.0 },
  { paper_size: 'Letter', print_color: 'color', print_side: 'double', price_per_page: 7.5 },
];

export const DEFAULT_SERVICES: Omit<ShopService, 'id' | 'shop_id' | 'created_at' | 'updated_at'>[] = [
  { service_name: 'Lamination (A4)', price: 20.0, is_active: true },
  { service_name: 'Spiral Binding (up to 100 pages)', price: 35.0, is_active: true },
  { service_name: 'Soft Binding / Thermal', price: 50.0, is_active: true },
  { service_name: 'Document Scanning (per page)', price: 5.0, is_active: true },
  { service_name: 'Photo Glossy Print (4x6)', price: 15.0, is_active: true },
];

export interface ItemCalculationInput {
  paper_size: PaperSize;
  print_color: PrintColor;
  print_side: PrintSide;
  copies: number;
  page_range: string;
  total_document_pages?: number;
  binding_type?: string;
  lamination_type?: string;
}

export interface ItemCalculationResult {
  calculated_pages: number;
  price_per_page: number;
  print_subtotal: number;
  binding_price: number;
  lamination_price: number;
  item_total: number;
}

/**
 * Find matching rate rule from shop's rules or fallback to defaults
 */
export function getRatePerPage(
  rules: PricingRule[] | undefined,
  paper_size: PaperSize,
  print_color: PrintColor,
  print_side: PrintSide
): number {
  if (rules && rules.length > 0) {
    const match = rules.find(
      (r) =>
        r.paper_size === paper_size &&
        r.print_color === print_color &&
        r.print_side === print_side
    );
    if (match) return Number(match.price_per_page);
  }

  // Fallback to default starter rule
  const fallback = DEFAULT_PRICING_RULES.find(
    (r) =>
      r.paper_size === paper_size &&
      r.print_color === print_color &&
      r.print_side === print_side
  );

  return fallback ? fallback.price_per_page : 2.0;
}

/**
 * Calculate cost for a single item
 */
export function calculateItemPrice(
  input: ItemCalculationInput,
  pricingRules?: PricingRule[],
  services?: ShopService[]
): ItemCalculationResult {
  const rangeParsed = parsePageRange(input.page_range, input.total_document_pages);
  const calculated_pages = rangeParsed.valid ? rangeParsed.pageCount : (input.total_document_pages || 1);
  const copies = Math.max(1, input.copies || 1);

  const price_per_page = getRatePerPage(
    pricingRules,
    input.paper_size,
    input.print_color,
    input.print_side
  );

  const print_subtotal = calculated_pages * price_per_page * copies;

  // Lamination
  let lamination_price = 0;
  if (input.lamination_type && input.lamination_type !== 'none') {
    const service = services?.find((s) => s.service_name.toLowerCase().includes('lamination') && s.is_active);
    lamination_price = service ? Number(service.price) : 20.0;
  }

  // Binding
  let binding_price = 0;
  if (input.binding_type && input.binding_type !== 'none') {
    const service = services?.find((s) =>
      s.service_name.toLowerCase().includes(input.binding_type!.toLowerCase()) && s.is_active
    );
    binding_price = service ? Number(service.price) : 35.0;
  }

  const services_subtotal = (lamination_price + binding_price) * copies;
  const item_total = Math.round((print_subtotal + services_subtotal) * 100) / 100;

  return {
    calculated_pages,
    price_per_page,
    print_subtotal: Math.round(print_subtotal * 100) / 100,
    binding_price,
    lamination_price,
    item_total,
  };
}

/**
 * Calculate total order summary
 */
export interface OrderCalculationSummary {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  total_pages: number;
  total_copies: number;
  item_results: ItemCalculationResult[];
}

export function calculateOrderSummary(
  items: ItemCalculationInput[],
  pricingRules?: PricingRule[],
  services?: ShopService[],
  discount = 0,
  taxRate = 0
): OrderCalculationSummary {
  const item_results = items.map((item) => calculateItemPrice(item, pricingRules, services));

  let subtotal = 0;
  let total_pages = 0;
  let total_copies = 0;

  for (let i = 0; i < items.length; i++) {
    subtotal += item_results[i].item_total;
    total_pages += item_results[i].calculated_pages * items[i].copies;
    total_copies += items[i].copies;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const tax = Math.round((subtotal - discount) * taxRate * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discount + tax) * 100) / 100);

  return {
    subtotal,
    discount,
    tax,
    total,
    total_pages,
    total_copies,
    item_results,
  };
}
