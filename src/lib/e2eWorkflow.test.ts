import { describe, it, expect } from 'vitest';
import { db } from './db';
import { calculateOrderSummary } from './priceEngine';
import { generateQRCodeDataUrl } from './qrHelper';

describe('Complete 20-Step End-to-End Workflow Verification', () => {
  it('STEP 1 & 2: Load Shop A and configure pricing rules', async () => {
    const shop = await db.getShopBySlug('printsetu');
    expect(shop).not.toBeNull();
    expect(shop?.shop_name).toBe('PrintSetu Digital Xerox');

    const rules = await db.getPricingRules(shop!.id);
    expect(rules.length).toBeGreaterThan(0);

    const a4Bw = rules.find((r) => r.paper_size === 'A4' && r.print_color === 'bw' && r.print_side === 'single');
    expect(a4Bw?.price_per_page).toBe(2.0);
  });

  it('STEP 3: Generate counter QR URL and printable data URL', async () => {
    const shop = await db.getShopBySlug('printsetu');
    const qrUrl = `https://print.xeroxflow.in/s/${shop!.slug}`;
    const dataUrl = await generateQRCodeDataUrl(qrUrl, 256);
    expect(dataUrl).toContain('data:image/png;base64');
  });

  it('STEP 4, 5, 6, 7 & 8: Customer configures PDF (A4 B&W Single 2 copies) and JPG (A4 Color 1 copy) and verifies price', async () => {
    const shop = await db.getShopBySlug('printsetu');
    const rules = await db.getPricingRules(shop!.id);
    const services = await db.getShopServices(shop!.id);

    const items = [
      {
        paper_size: 'A4' as const,
        print_color: 'bw' as const,
        print_side: 'single' as const,
        copies: 2,
        page_range: '1-3', // 3 pages * 2 copies * ₹2 = ₹12
        total_document_pages: 3,
        binding_type: 'none',
        lamination_type: 'none',
      },
      {
        paper_size: 'A4' as const,
        print_color: 'color' as const,
        print_side: 'single' as const,
        copies: 1,
        page_range: '1', // 1 page * 1 copy * ₹10 = ₹10
        total_document_pages: 1,
        binding_type: 'none',
        lamination_type: 'none',
      },
    ];

    const summary = calculateOrderSummary(items, rules, services);
    expect(summary.total_pages).toBe(7); // 3*2 + 1*1
    expect(summary.subtotal).toBe(22.0); // 12 + 10 = 22
    expect(summary.total).toBe(22.0);
  });

  it('STEP 9, 10 & 11: Submit order, verify human order number (e.g. P1002), and record snapshot', async () => {
    const shop = await db.getShopBySlug('printsetu');
    const createdOrder = await db.createOrder({
      shop_id: shop!.id,
      customer_name: 'Amit Shah',
      customer_phone: '9876543210',
      customer_note: 'Please staple front page',
      items: [
        {
          paper_size: 'A4',
          print_color: 'bw',
          print_side: 'single',
          copies: 2,
          page_range: '1-3',
          calculated_pages: 3,
          orientation: 'auto',
          scaling: 'fit',
          pages_per_sheet: 1,
          file_name: 'Project_Report.pdf',
          file_size: 1500000,
          binding_type: 'none',
          binding_price: 0,
          lamination_type: 'none',
          lamination_price: 0,
          price_per_page: 2.0,
          item_total: 12.0,
        },
        {
          paper_size: 'A4',
          print_color: 'color',
          print_side: 'single',
          copies: 1,
          page_range: '1',
          calculated_pages: 1,
          orientation: 'auto',
          scaling: 'fit',
          pages_per_sheet: 1,
          file_name: 'ID_Card.jpg',
          file_size: 650000,
          binding_type: 'none',
          binding_price: 0,
          lamination_type: 'none',
          lamination_price: 0,
          price_per_page: 10.0,
          item_total: 10.0,
        },
      ],
      files: [
        {
          shop_id: shop!.id,
          original_filename: 'Project_Report.pdf',
          storage_path: `${shop!.slug}/test-report.pdf`,
          file_type: 'pdf',
          mime_type: 'application/pdf',
          file_size: 1500000,
          page_count: 3,
          status: 'active',
        },
        {
          shop_id: shop!.id,
          original_filename: 'ID_Card.jpg',
          storage_path: `${shop!.slug}/test-id.jpg`,
          file_type: 'image',
          mime_type: 'image/jpeg',
          file_size: 650000,
          page_count: 1,
          status: 'active',
        },
      ],
      subtotal: 22.0,
      total: 22.0,
    });

    expect(createdOrder).not.toBeNull();
    expect(createdOrder.order_number).toMatch(/^P\d{4,}$/);
    expect(createdOrder.status).toBe('pending');
    expect(createdOrder.customer?.name).toBe('Amit Shah');
    expect(createdOrder.customer?.phone).toBe('9876543210');
  });

  it('STEP 12, 13, 14, 15 & 16: Open shop dashboard, verify order appears, and progress status through all stages', async () => {
    const shop = await db.getShopBySlug('printsetu');
    const shopOrders = await db.getOrdersByShop(shop!.id);

    const latest = shopOrders.find((o) => o.customer?.name === 'Amit Shah' && o.status === 'pending') || shopOrders[0];
    expect(latest).toBeDefined();

    // Progression 1: Pending -> Confirmed
    const confirmed = await db.updateOrderStatus(latest!.id, 'confirmed', 'Shop Staff', 'Files verified', shop!.id);
    expect(confirmed?.status).toBe('confirmed');

    // Progression 2: Confirmed -> Printing
    const printing = await db.updateOrderStatus(latest!.id, 'printing', 'Shop Staff', 'Printing started on Laser B&W', shop!.id);
    expect(printing?.status).toBe('printing');

    // Progression 3: Printing -> Ready
    const ready = await db.updateOrderStatus(latest!.id, 'ready', 'Shop Staff', 'Prints waiting at counter', shop!.id);
    expect(ready?.status).toBe('ready');

    // Progression 4: Ready -> Completed
    const completed = await db.updateOrderStatus(latest!.id, 'completed', 'Shop Staff', 'Customer paid cash and collected', shop!.id);
    expect(completed?.status).toBe('completed');
    expect(completed?.payment_status).toBe('paid');
  });

  it('STEP 17 & 18: Customer tracking verification and security check', async () => {
    const shop = await db.getShopBySlug('printsetu');
    const shopOrders = await db.getOrdersByShop(shop!.id);
    const amitOrder = shopOrders.find((o) => o.customer?.name === 'Amit Shah')!;

    // Valid tracking attempt with correct phone
    const trackResult = await db.trackCustomerOrder(amitOrder.order_number, '9876543210');
    expect(trackResult).not.toBeNull();
    expect(trackResult?.status).toBe('completed');
    expect(trackResult?.history?.length).toBeGreaterThanOrEqual(5);

    // Illegal tracking attempt with wrong phone
    const hackerResult = await db.trackCustomerOrder(amitOrder.order_number, '9999999999');
    expect(hackerResult).toBeNull();
  });

  it('STEP 19 & 20: Order history search, customer directory, and analytics updates', async () => {
    const shop = await db.getShopBySlug('printsetu');

    // Search
    const searchResults = await db.getOrdersByShop(shop!.id, { search: 'Amit' });
    expect(searchResults.length).toBeGreaterThanOrEqual(1);

    // Customer directory
    const customers = await db.getShopCustomers(shop!.id);
    const amitInDirectory = customers.find((c) => c.customer.name === 'Amit Shah');
    expect(amitInDirectory).toBeDefined();
    expect(amitInDirectory?.totalSpent).toBeGreaterThanOrEqual(22.0);

    // Analytics
    const analytics = await db.getShopAnalytics(shop!.id);
    expect(analytics.ordersToday).toBeGreaterThanOrEqual(1);
    expect(analytics.revenueToday).toBeGreaterThanOrEqual(22.0);
    expect(analytics.bwPages).toBeGreaterThan(0);
    expect(analytics.colorPages).toBeGreaterThan(0);
  });
});
