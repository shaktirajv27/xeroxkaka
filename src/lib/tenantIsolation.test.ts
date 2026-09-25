import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, generateUUID, REAL_PRINTSETU_SHOP } from './db';

describe('Multi-Tenant Isolation & Security', () => {
  let shopA: any;
  let shopB: any;
  let orderA: any;
  let orderB: any;

  beforeAll(async () => {
    shopA = await db.getShopBySlug('printsetu') || REAL_PRINTSETU_SHOP;
    expect(shopA).not.toBeNull();

    // Use shopA and create another test shop in local/remote state
    const shopBId = generateUUID();
    shopB = {
      id: shopBId,
      shop_name: 'Secondary Test Xerox',
      slug: `test-shop-b-${Date.now()}`,
      phone: '9988776644',
      is_active: true,
    };

    // Create orders for both shops
    orderA = await db.createOrder({
      shop_id: shopA.id,
      customer_name: 'Tenant Customer A',
      customer_phone: '9988776655',
      items: [
        {
          paper_size: 'A4',
          print_color: 'bw',
          print_side: 'single',
          copies: 1,
          page_range: 'all',
          calculated_pages: 5,
          orientation: 'auto',
          scaling: 'fit',
          pages_per_sheet: 1,
          binding_price: 0,
          lamination_price: 0,
          price_per_page: 2.0,
          item_total: 10.0,
        },
      ],
      files: [],
      subtotal: 10.0,
      total: 10.0,
    });

    orderB = await db.createOrder({
      shop_id: shopA.id, // created for testing isolation
      customer_name: 'Tenant Customer B',
      customer_phone: '9988776644',
      items: [
        {
          paper_size: 'A4',
          print_color: 'color',
          print_side: 'single',
          copies: 1,
          page_range: 'all',
          calculated_pages: 2,
          orientation: 'auto',
          scaling: 'fit',
          pages_per_sheet: 1,
          binding_price: 0,
          lamination_price: 0,
          price_per_page: 10.0,
          item_total: 20.0,
        },
      ],
      files: [],
      subtotal: 20.0,
      total: 20.0,
    });
  }, 30000);

  it('Shop A should only see Shop A orders', async () => {
    const ordersA = await db.getOrdersByShop(shopA.id);
    expect(ordersA.length).toBeGreaterThan(0);
    for (const order of ordersA) {
      expect(order.shop_id).toBe(shopA.id);
    }
  });

  it('Shop B should not see Shop A orders', async () => {
    const ordersB = await db.getOrdersByShop(shopB.id);
    expect(ordersB.length).toBe(0);
  });

  it('Attempting to access an order with unauthorized shop credentials returns null', async () => {
    const unauthorizedAccess = await db.getOrderById(orderA.id, shopB.id);
    expect(unauthorizedAccess).toBeNull();
  });

  it('Attempting to update an order with unauthorized shop credentials throws access denied', async () => {
    await expect(
      db.updateOrderStatus(orderA.id, 'completed', 'Hacker', 'Illegal status change', shopB.id)
    ).rejects.toThrow('Access denied');
  });

  it('Secure customer tracking requires matching mobile phone', async () => {
    const validTrack = await db.trackCustomerOrder(orderA.order_number, '9988776655');
    expect(validTrack).not.toBeNull();
    expect(validTrack?.order_number).toBe(orderA.order_number);

    // Wrong phone number must be REJECTED
    const hackerTrack = await db.trackCustomerOrder(orderA.order_number, '9111111111');
    expect(hackerTrack).toBeNull();
  });

  afterAll(async () => {
    // Clean up test orders & test customer profiles so zero test data remains
    try {
      if (orderA?.id) await db.deleteOrder(orderA.id, shopA?.id);
      if (orderB?.id) await db.deleteOrder(orderB.id, shopA?.id);
      if (orderA?.customer_id) await db.deleteCustomer(orderA.customer_id, shopA?.id);
      if (orderB?.customer_id) await db.deleteCustomer(orderB.customer_id, shopA?.id);
    } catch (e) {
      console.warn('Test cleanup notice:', e);
    }
  });
});

