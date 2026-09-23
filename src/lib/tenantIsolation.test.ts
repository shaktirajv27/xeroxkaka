import { describe, it, expect } from 'vitest';
import { db } from './db';

describe('Multi-Tenant Isolation & Security', () => {
  it('Shop A should only see Shop A orders', async () => {
    const shopA = await db.getShopBySlug('abc-xerox');
    const shopB = await db.getShopBySlug('quickprint');
    expect(shopA).not.toBeNull();
    expect(shopB).not.toBeNull();

    const ordersA = await db.getOrdersByShop(shopA!.id);
    expect(ordersA.length).toBeGreaterThan(0);
    // Ensure every single order belongs strictly to Shop A
    for (const order of ordersA) {
      expect(order.shop_id).toBe(shopA!.id);
      expect(order.shop_id).not.toBe(shopB!.id);
    }
  });

  it('Shop B should only see Shop B orders', async () => {
    const shopA = await db.getShopBySlug('abc-xerox');
    const shopB = await db.getShopBySlug('quickprint');

    const ordersB = await db.getOrdersByShop(shopB!.id);
    expect(ordersB.length).toBeGreaterThan(0);
    for (const order of ordersB) {
      expect(order.shop_id).toBe(shopB!.id);
      expect(order.shop_id).not.toBe(shopA!.id);
    }
  });

  it('Attempting to access Shop B order with Shop A credentials returns null or throws error', async () => {
    const shopA = await db.getShopBySlug('abc-xerox');
    const shopB = await db.getShopBySlug('quickprint');
    const ordersB = await db.getOrdersByShop(shopB!.id);
    expect(ordersB.length).toBeGreaterThan(0);
    const shopBOrder = ordersB[0];

    // getOrderById with shopId isolation check
    const unauthorizedAccess = await db.getOrderById(shopBOrder.id, shopA!.id);
    expect(unauthorizedAccess).toBeNull();
  });

  it('Attempting to update Shop B order with Shop A credentials throws access denied', async () => {
    const shopA = await db.getShopBySlug('abc-xerox');
    const shopB = await db.getShopBySlug('quickprint');
    const ordersB = await db.getOrdersByShop(shopB!.id);
    expect(ordersB.length).toBeGreaterThan(0);
    const shopBOrder = ordersB[0];

    await expect(
      db.updateOrderStatus(shopBOrder.id, 'completed', 'Hacker', 'Illegal status change', shopA!.id)
    ).rejects.toThrow('Access denied');
  });

  it('Secure customer tracking requires matching mobile phone', async () => {
    const shopA = await db.getShopBySlug('abc-xerox');
    const ordersA = await db.getOrdersByShop(shopA!.id);
    expect(ordersA.length).toBeGreaterThan(0);
    const targetOrder = ordersA[0];

    const validTrack = await db.trackCustomerOrder(targetOrder.order_number, targetOrder.customer!.phone);
    expect(validTrack).not.toBeNull();
    expect(validTrack?.order_number).toBe(targetOrder.order_number);

    // Wrong phone number must be REJECTED
    const hackerTrack = await db.trackCustomerOrder(targetOrder.order_number, '9111111111');
    expect(hackerTrack).toBeNull();
  });
});
