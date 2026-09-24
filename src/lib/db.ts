import {
  Shop,
  Customer,
  Order,
  OrderItem,
  UploadedFile,
  PricingRule,
  ShopService,
  OrderStatus,
  OrderStatusHistory,
  ShopSettings,
} from '../types/database';
import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_PRICING_RULES, DEFAULT_SERVICES } from './priceEngine';
import { generateNextOrderNumber } from './orderNumber';

// In-Memory & LocalStorage persistent state for fallback
const STORAGE_KEY = 'xeroxflow_platform_state_v1';

export const REAL_PRINTSETU_SHOP: Shop = {
  id: 'c1000000-0000-0000-0000-000000000001',
  owner_id: 'bbc1a326-5137-466a-8228-86a3c532c0df',
  shop_name: 'PrintSetu Digital Xerox',
  slug: 'printsetu',
  phone: '9978770883',
  whatsapp_number: '9978770883',
  email: 'pratavala4@gmail.com',
  address: 'PrintSetu Hub, Main Road',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '380001',
  logo_url: '/logo.png',
  is_active: true,
  created_at: '2026-09-24T11:27:45.189889+00:00',
  updated_at: '2026-09-24T11:27:45.189889+00:00',
};

function isDummyShop(s: any): boolean {
  if (!s) return false;
  return (
    s.id === 'a0000000-0000-0000-0000-000000000001' ||
    s.id === 'b0000000-0000-0000-0000-000000000002' ||
    s.slug === 'abc-xerox' ||
    s.slug === 'quickprint' ||
    (typeof s.shop_name === 'string' && (s.shop_name.includes('ABC Xerox') || s.shop_name.includes('QuickPrint')))
  );
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface PlatformState {
  shops: Shop[];
  customers: Customer[];
  orders: Order[];
  order_items: OrderItem[];
  files: UploadedFile[];
  pricing_rules: PricingRule[];
  shop_services: ShopService[];
  status_history: OrderStatusHistory[];
  settings: ShopSettings[];
}

function loadLocalState(): PlatformState {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        let modified = false;
        // Purge any legacy dummy placeholder shops from previous dev sessions
        if (parsed.shops && parsed.shops.some(isDummyShop)) {
          parsed.shops = (parsed.shops || []).filter((s: any) => !isDummyShop(s));
          modified = true;
        }
        if (parsed.customers && parsed.customers.some((c: any) => c.id === 'c0000000-0000-0000-0000-000000000001')) {
          parsed.customers = (parsed.customers || []).filter(
            (c: any) => c.id !== 'c0000000-0000-0000-0000-000000000001'
          );
          modified = true;
        }
        if (!parsed.shops || parsed.shops.length === 0) {
          parsed.shops = [REAL_PRINTSETU_SHOP];
          modified = true;
        }
        if (modified) {
          saveLocalState(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read from localStorage', e);
  }

  const initial: PlatformState = {
    shops: [REAL_PRINTSETU_SHOP],
    customers: [],
    orders: [],
    order_items: [],
    files: [],
    pricing_rules: DEFAULT_PRICING_RULES.map((r, i) => ({
      ...r,
      id: `rule-init-${i}`,
      shop_id: REAL_PRINTSETU_SHOP.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    shop_services: DEFAULT_SERVICES.map((s, i) => ({
      ...s,
      id: `svc-init-${i}`,
      shop_id: REAL_PRINTSETU_SHOP.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    status_history: [],
    settings: [{
      id: 'settings-init',
      shop_id: REAL_PRINTSETU_SHOP.id,
      auto_confirm: false,
      sound_enabled: true,
      retention_hours: 48,
      opening_time: '09:00',
      closing_time: '21:00',
      currency_symbol: '₹',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
  };
  saveLocalState(initial);
  return initial;
}

function saveLocalState(state: PlatformState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.warn('Could not persist to localStorage', e);
  }
}

// Event system for local realtime subscriptions
type OrderEventCallback = (order: Order) => void;
const listeners = new Set<OrderEventCallback>();

export function subscribeToOrders(callback: OrderEventCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyOrderUpdate(order: Order): void {
  listeners.forEach((cb) => cb(order));
}

// Real Supabase Realtime channel setup (only in browser)
if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
  try {
    // Remove existing channel if present to avoid HMR re-subscription collisions
    const channelId = 'xeroxflow-orders-feed';
    supabase.removeChannel(supabase.channel(channelId));

    supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          const ord = payload.new as any;
          if (ord?.id) {
            const full = await db.getOrderById(ord.id);
            if (full) {
              notifyOrderUpdate(full);
            }
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Supabase realtime init notice', err);
  }
}

export const db = {
  // SHOPS
  async getShopBySlug(slug: string): Promise<Shop | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('slug', slug.toLowerCase())
          .eq('is_active', true)
          .single();
        if (!error && data) return data as Shop;
      } catch (err) {
        console.warn('Supabase getShopBySlug fallback', err);
      }
    }

    const state = loadLocalState();
    return state.shops.find((s) => s.slug.toLowerCase() === slug.toLowerCase() && s.is_active) || null;
  },

  async getShopById(id: string): Promise<Shop | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('shops').select('*').eq('id', id).single();
        if (!error && data) return data as Shop;
      } catch (err) {
        console.warn('Supabase getShopById fallback', err);
      }
    }

    const state = loadLocalState();
    return state.shops.find((s) => s.id === id) || null;
  },

  async getAllShops(): Promise<Shop[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (!error && data) {
          const state = loadLocalState();
          state.shops = data as Shop[];
          saveLocalState(state);
          return data as Shop[];
        }
      } catch (err) {
        console.warn('Supabase getAllShops fallback', err);
      }
    }
    const state = loadLocalState();
    return state.shops.filter((s) => s.is_active);
  },

  getCachedShops(): Shop[] {
    const state = loadLocalState();
    return state.shops.filter((s) => s.is_active);
  },

  async updateShop(id: string, updates: Partial<Shop>): Promise<Shop | null> {
    // 1. Immediate synchronous local cache update (< 1ms)
    const state = loadLocalState();
    const idx = state.shops.findIndex((s) => s.id === id);
    let updatedShop: Shop | null = null;
    if (idx !== -1) {
      state.shops[idx] = { ...state.shops[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalState(state);
      updatedShop = state.shops[idx];
    }

    // 2. Direct Supabase update
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('shops')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const syncState = loadLocalState();
          const syncIdx = syncState.shops.findIndex((s) => s.id === id);
          if (syncIdx !== -1) {
            syncState.shops[syncIdx] = data as Shop;
            saveLocalState(syncState);
          }
          return data as Shop;
        }
      } catch (err) {
        console.warn('Supabase updateShop fallback', err);
      }
    }

    return updatedShop;
  },

  // PRICING RULES
  async getPricingRules(shopId: string): Promise<PricingRule[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('shop_id', shopId);
        if (!error && data && data.length > 0) {
          const state = loadLocalState();
          state.pricing_rules = state.pricing_rules.filter((r) => r.shop_id !== shopId).concat(data as PricingRule[]);
          saveLocalState(state);
          return data as PricingRule[];
        }
      } catch (err) {
        console.warn('Supabase getPricingRules fallback', err);
      }
    }

    const state = loadLocalState();
    const rules = state.pricing_rules.filter((r) => r.shop_id === shopId);
    if (rules.length === 0) {
      return DEFAULT_PRICING_RULES.map((r, i) => ({
        ...r,
        id: `rule-${shopId}-${i}`,
        shop_id: shopId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }
    return rules;
  },

  async updatePricingRule(rule: Partial<PricingRule> & { shop_id: string; paper_size: string; print_color: string; print_side: string; price_per_page: number }): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('pricing_rules')
          .upsert(rule, { onConflict: 'shop_id,paper_size,print_color,print_side' });
      } catch (err) {
        console.warn('Supabase updatePricingRule fallback', err);
      }
    }

    const state = loadLocalState();
    const idx = state.pricing_rules.findIndex(
      (r) =>
        r.shop_id === rule.shop_id &&
        r.paper_size === rule.paper_size &&
        r.print_color === rule.print_color &&
        r.print_side === rule.print_side
    );

    if (idx >= 0) {
      state.pricing_rules[idx].price_per_page = Number(rule.price_per_page);
      state.pricing_rules[idx].updated_at = new Date().toISOString();
    } else {
      state.pricing_rules.push({
        id: generateUUID(),
        shop_id: rule.shop_id,
        paper_size: rule.paper_size as any,
        print_color: rule.print_color as any,
        print_side: rule.print_side as any,
        price_per_page: Number(rule.price_per_page),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    saveLocalState(state);
  },

  async updatePricingRulesBatch(shopId: string, rules: PricingRule[]): Promise<void> {
    // 1. Instant synchronous local cache update (< 1ms)
    const state = loadLocalState();
    const otherRules = state.pricing_rules.filter((r) => r.shop_id !== shopId);
    const updatedRules = rules.map((r) => ({
      ...r,
      shop_id: shopId,
      price_per_page: Number(r.price_per_page),
      updated_at: new Date().toISOString(),
    }));
    state.pricing_rules = [...otherRules, ...updatedRules];
    saveLocalState(state);

    // 2. Single batch upsert in Supabase (1 roundtrip instead of 20)
    if (isSupabaseConfigured && supabase) {
      try {
        const payload = updatedRules.map((r) => ({
          shop_id: r.shop_id,
          paper_size: r.paper_size,
          print_color: r.print_color,
          print_side: r.print_side,
          price_per_page: r.price_per_page,
          updated_at: r.updated_at,
        }));
        await supabase
          .from('pricing_rules')
          .upsert(payload, { onConflict: 'shop_id,paper_size,print_color,print_side' });
      } catch (err) {
        console.warn('Supabase updatePricingRulesBatch fallback', err);
      }
    }
  },

  // SERVICES
  async getShopServices(shopId: string): Promise<ShopService[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('shop_services')
          .select('*')
          .eq('shop_id', shopId);
        if (!error && data && data.length > 0) {
          const state = loadLocalState();
          state.shop_services = state.shop_services.filter((s) => s.shop_id !== shopId).concat(data as ShopService[]);
          saveLocalState(state);
          return data as ShopService[];
        }
      } catch (err) {
        console.warn('Supabase getShopServices fallback', err);
      }
    }

    const state = loadLocalState();
    const services = state.shop_services.filter((s) => s.shop_id === shopId);
    if (services.length === 0) {
      return DEFAULT_SERVICES.map((s, i) => ({
        ...s,
        id: `svc-${shopId}-${i}`,
        shop_id: shopId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }
    return services;
  },

  async updateShopService(service: ShopService): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('shop_services').upsert(service);
      } catch (err) {
        console.warn('Supabase updateShopService fallback', err);
      }
    }

    const state = loadLocalState();
    const idx = state.shop_services.findIndex((s) => s.id === service.id);
    if (idx >= 0) {
      state.shop_services[idx] = { ...service, updated_at: new Date().toISOString() };
    } else {
      state.shop_services.push({ ...service, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    saveLocalState(state);
  },

  async updateShopServicesBatch(shopId: string, services: ShopService[]): Promise<void> {
    // 1. Instant synchronous local cache update (< 1ms)
    const state = loadLocalState();
    const otherServices = state.shop_services.filter((s) => s.shop_id !== shopId);
    const updatedServices = services.map((s) => ({
      ...s,
      shop_id: shopId,
      updated_at: new Date().toISOString(),
    }));
    state.shop_services = [...otherServices, ...updatedServices];
    saveLocalState(state);

    // 2. Single batch upsert in Supabase (1 roundtrip)
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('shop_services').upsert(updatedServices);
      } catch (err) {
        console.warn('Supabase updateShopServicesBatch fallback', err);
      }
    }
  },

  // SHOP SETTINGS
  async getShopSettings(shopId: string): Promise<ShopSettings> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('shop_settings').select('*').eq('shop_id', shopId).single();
        if (!error && data) {
          const state = loadLocalState();
          const idx = state.settings.findIndex((s) => s.shop_id === shopId);
          if (idx >= 0) state.settings[idx] = data as ShopSettings;
          else state.settings.push(data as ShopSettings);
          saveLocalState(state);
          return data as ShopSettings;
        }
      } catch (err) {
        console.warn('Supabase getShopSettings fallback', err);
      }
    }

    const state = loadLocalState();
    const setting = state.settings.find((s) => s.shop_id === shopId);
    if (setting) return setting;

    const fallback: ShopSettings = {
      id: generateUUID(),
      shop_id: shopId,
      auto_confirm: false,
      sound_enabled: true,
      retention_hours: 48,
      opening_time: '09:00',
      closing_time: '21:00',
      currency_symbol: '₹',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.settings.push(fallback);
    saveLocalState(state);
    return fallback;
  },

  // ORDERS
  async createOrder(params: {
    shop_id: string;
    customer_name: string;
    customer_phone: string;
    customer_note?: string;
    items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[];
    files: Omit<UploadedFile, 'id' | 'order_id' | 'created_at'>[];
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
  }): Promise<Order> {
    const cleanPhone = params.customer_phone.replace(/\D/g, '').slice(-10);

    const state = loadLocalState();
    let shopOrders = state.orders.filter((o) => o.shop_id === params.shop_id);

    // If Supabase is connected, query latest order to generate collision-safe sequential number
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('orders')
          .select('order_number')
          .eq('shop_id', params.shop_id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (data && data.length > 0) {
          shopOrders = data as any[];
        }
      } catch (err) {
        console.warn('Could not fetch existing orders for numbering', err);
      }
    }

    const orderNumber = generateNextOrderNumber(shopOrders.map((o) => o.order_number));
    const orderId = generateUUID();
    const customerId = generateUUID();

    const newCustomer: Customer = {
      id: customerId,
      shop_id: params.shop_id,
      name: params.customer_name.trim(),
      phone: cleanPhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newOrder: Order = {
      id: orderId,
      shop_id: params.shop_id,
      customer_id: customerId,
      order_number: orderNumber,
      status: 'pending',
      priority: 'normal',
      subtotal: params.subtotal,
      discount: params.discount || 0,
      tax: params.tax || 0,
      total: params.total,
      payment_status: 'pending',
      payment_method: 'cash',
      customer_note: params.customer_note || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer: newCustomer,
    };

    const newItems: OrderItem[] = params.items.map((item, idx) => ({
      ...item,
      id: generateUUID(),
      order_id: orderId,
      created_at: new Date().toISOString(),
    }));

    const newFiles: UploadedFile[] = params.files.map((file) => ({
      ...file,
      id: generateUUID(),
      order_id: orderId,
      created_at: new Date().toISOString(),
    }));

    const newHistory: OrderStatusHistory = {
      id: generateUUID(),
      order_id: orderId,
      old_status: undefined,
      new_status: 'pending',
      changed_by: 'Customer (Online QR)',
      note: 'Order submitted via QR web app',
      timestamp: new Date().toISOString(),
    };

    // Save locally
    state.customers.push(newCustomer);
    state.orders.unshift(newOrder);
    state.order_items.push(...newItems);
    state.files.push(...newFiles);
    state.status_history.push(newHistory);
    saveLocalState(state);

    const fullOrder: Order = {
      ...newOrder,
      items: newItems,
      files: newFiles,
      history: [newHistory],
    };

    notifyOrderUpdate(fullOrder);

    // Persist directly to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('customers').insert({
          id: customerId,
          shop_id: params.shop_id,
          name: newCustomer.name,
          phone: newCustomer.phone,
        });

        await supabase.from('orders').insert({
          id: orderId,
          shop_id: params.shop_id,
          customer_id: customerId,
          order_number: orderNumber,
          status: 'pending',
          priority: 'normal',
          subtotal: params.subtotal,
          total: params.total,
          customer_note: params.customer_note,
        });

        const orderItemsData = newItems.map((itm) => ({
          id: itm.id,
          order_id: orderId,
          paper_size: itm.paper_size,
          print_color: itm.print_color,
          print_side: itm.print_side,
          copies: itm.copies,
          page_range: itm.page_range,
          calculated_pages: itm.calculated_pages,
          price_per_page: itm.price_per_page,
          item_total: itm.item_total,
          binding_type: itm.binding_type,
          binding_price: itm.binding_price,
          lamination_type: itm.lamination_type,
          lamination_price: itm.lamination_price,
        }));

        const filesData = newFiles.map((file) => ({
          id: file.id,
          order_id: orderId,
          shop_id: params.shop_id,
          original_filename: file.original_filename,
          storage_path: file.storage_path,
          file_type: file.file_type,
          mime_type: file.mime_type,
          file_size: file.file_size,
          page_count: file.page_count,
          status: 'active',
        }));

        await Promise.all([
          orderItemsData.length > 0
            ? supabase.from('order_items').insert(orderItemsData)
            : Promise.resolve(),
          filesData.length > 0
            ? supabase.from('files').insert(filesData)
            : Promise.resolve(),
          supabase.from('order_status_history').insert({
            id: newHistory.id,
            order_id: orderId,
            new_status: 'pending',
            changed_by: newHistory.changed_by,
            note: newHistory.note,
          }),
        ]);
      } catch (err) {
        console.warn('Supabase remote order persist error', err);
      }
    }

    return fullOrder;
  },

  async getOrdersByShop(shopId: string, options?: { status?: OrderStatus; search?: string }): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('orders')
          .select(`
            *,
            customer:customers(*),
            items:order_items(*),
            files(*),
            history:order_status_history(*)
          `)
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false });

        if (options?.status) {
          query = query.eq('status', options.status);
        }

        const { data, error } = await query;
        if (!error && data) {
          const supabaseUrl =
            (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
            'https://rjlfuefvovyqflctqvis.supabase.co';

          let results = (data as any[]).map((ord) => {
            const mappedFiles = (ord.files || []).map((f: any) => {
              let pUrl = f.preview_url;
              if (!pUrl || pUrl.startsWith('blob:')) {
                if (f.storage_path) {
                  pUrl = f.storage_path.startsWith('http')
                    ? f.storage_path
                    : `${supabaseUrl}/storage/v1/object/public/order-documents/${f.storage_path}`;
                }
              }
              return { ...f, preview_url: pUrl };
            });
            return { ...ord, files: mappedFiles } as Order;
          });

          // Sync real fetched orders into local storage cache for instant sub-20ms rendering
          if (!options?.status && !options?.search) {
            const state = loadLocalState();
            state.orders = state.orders.filter((o) => o.shop_id !== shopId).concat(results);
            saveLocalState(state);
          }

          if (options?.search) {
            const q = options.search.toLowerCase();
            results = results.filter((o) => {
              return (
                o.order_number.toLowerCase().includes(q) ||
                o.customer?.name.toLowerCase().includes(q) ||
                o.customer?.phone.includes(q)
              );
            });
          }
          return results;
        }
      } catch (err) {
        console.warn('Supabase getOrdersByShop query notice', err);
      }
    }

    const state = loadLocalState();
    let shopOrders = state.orders.filter((o) => o.shop_id === shopId);

    if (options?.status) {
      shopOrders = shopOrders.filter((o) => o.status === options.status);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      shopOrders = shopOrders.filter((o) => {
        const cust = state.customers.find((c) => c.id === o.customer_id);
        return (
          o.order_number.toLowerCase().includes(q) ||
          cust?.name.toLowerCase().includes(q) ||
          cust?.phone.includes(q)
        );
      });
    }

    return shopOrders
      .map((order) => {
        const customer = state.customers.find((c) => c.id === order.customer_id);
        const items = state.order_items.filter((i) => i.order_id === order.id);
        const files = state.files.filter((f) => f.order_id === order.id);
        const history = state.status_history.filter((h) => h.order_id === order.id);
        return {
          ...order,
          customer,
          items,
          files,
          history,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getCachedOrdersByShop(shopId: string): Order[] {
    const state = loadLocalState();
    const shopOrders = state.orders.filter((o) => o.shop_id === shopId);
    return shopOrders
      .map((order) => {
        const customer = state.customers.find((c) => c.id === order.customer_id);
        const items = state.order_items.filter((i) => i.order_id === order.id);
        const files = state.files.filter((f) => f.order_id === order.id);
        const history = state.status_history.filter((h) => h.order_id === order.id);
        return {
          ...order,
          customer,
          items,
          files,
          history,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getCachedPricingRules(shopId: string): PricingRule[] {
    const state = loadLocalState();
    const rules = state.pricing_rules.filter((r) => r.shop_id === shopId);
    if (rules.length === 0) {
      return DEFAULT_PRICING_RULES.map((r, i) => ({
        ...r,
        id: `rule-${shopId}-${i}`,
        shop_id: shopId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }
    return rules;
  },

  getCachedShopServices(shopId: string): ShopService[] {
    const state = loadLocalState();
    const services = state.shop_services.filter((s) => s.shop_id === shopId);
    if (services.length === 0) {
      return DEFAULT_SERVICES.map((s, i) => ({
        ...s,
        id: `svc-${shopId}-${i}`,
        shop_id: shopId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }
    return services;
  },

  getCachedShopSettings(shopId: string): ShopSettings {
    const state = loadLocalState();
    const setting = state.settings.find((s) => s.shop_id === shopId);
    if (setting) return setting;
    return {
      id: generateUUID(),
      shop_id: shopId,
      auto_confirm: false,
      sound_enabled: true,
      retention_hours: 48,
      opening_time: '09:00',
      closing_time: '21:00',
      currency_symbol: '₹',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async getOrderById(orderId: string, shopId?: string): Promise<Order | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('orders')
          .select(`
            *,
            customer:customers(*),
            items:order_items(*),
            files(*),
            history:order_status_history(*)
          `)
          .eq('id', orderId);

        if (shopId) {
          query = query.eq('shop_id', shopId);
        }

        const { data, error } = await query.single();
        if (!error && data) {
          const supabaseUrl =
            (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
            'https://rjlfuefvovyqflctqvis.supabase.co';

          const mappedFiles = ((data as any).files || []).map((f: any) => {
            let pUrl = f.preview_url;
            if (!pUrl || pUrl.startsWith('blob:')) {
              if (f.storage_path) {
                pUrl = f.storage_path.startsWith('http')
                  ? f.storage_path
                  : `${supabaseUrl}/storage/v1/object/public/order-documents/${f.storage_path}`;
              }
            }
            return { ...f, preview_url: pUrl };
          });

          return { ...(data as any), files: mappedFiles } as Order;
        }
      } catch (err) {
        console.warn('Supabase getOrderById notice', err);
      }
    }

    const state = loadLocalState();
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return null;

    if (shopId && order.shop_id !== shopId) {
      return null;
    }

    const customer = state.customers.find((c) => c.id === order.customer_id);
    const items = state.order_items.filter((i) => i.order_id === order.id);
    const files = state.files.filter((f) => f.order_id === order.id);
    const history = state.status_history
      .filter((h) => h.order_id === order.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      ...order,
      customer,
      items,
      files,
      history,
    };
  },

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    note?: string,
    shopId?: string
  ): Promise<Order | null> {
    if (shopId) {
      const existing = await this.getOrderById(orderId);
      if (existing && existing.shop_id !== shopId) {
        throw new Error('Access denied: You do not own this order.');
      }
    }

    const state = loadLocalState();
    const idx = state.orders.findIndex((o) => o.id === orderId);

    const oldStatus = idx >= 0 ? state.orders[idx].status : undefined;
    if (idx >= 0) {
      state.orders[idx].status = newStatus;
      state.orders[idx].updated_at = new Date().toISOString();
      if (newStatus === 'completed') {
        state.orders[idx].completed_at = new Date().toISOString();
        state.orders[idx].payment_status = 'paid';
      }
    }

    const historyRecord: OrderStatusHistory = {
      id: generateUUID(),
      order_id: orderId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      note: note || `Status changed from ${oldStatus} to ${newStatus}`,
      timestamp: new Date().toISOString(),
    };

    state.status_history.push(historyRecord);
    saveLocalState(state);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
            ...(newStatus === 'completed'
              ? { completed_at: new Date().toISOString(), payment_status: 'paid' }
              : {}),
          })
          .eq('id', orderId);

        await supabase.from('order_status_history').insert({
          id: historyRecord.id,
          order_id: orderId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: changedBy,
          note: historyRecord.note,
        });
      } catch (err) {
        console.warn('Supabase remote status update notice', err);
      }
    }

    const fullOrder = await this.getOrderById(orderId, shopId);
    if (fullOrder) {
      notifyOrderUpdate(fullOrder);
    }
    return fullOrder;
  },

  // SECURE CUSTOMER TRACKING VERIFICATION
  async trackCustomerOrder(orderNumber: string, phone: string): Promise<Order | null> {
    const cleanNumber = orderNumber.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('track_customer_order', {
          p_order_number: cleanNumber,
          p_phone: cleanPhone,
        });

        if (!error && data && (data as any).order) {
          const res = data as any;
          return {
            ...res.order,
            customer: res.customer,
            shop: res.shop,
            items: res.items || [],
            files: res.files || [],
            history: res.history || [],
          } as Order;
        }
      } catch (err) {
        console.warn('Supabase trackCustomerOrder notice', err);
      }
    }

    const state = loadLocalState();
    const order = state.orders.find((o) => o.order_number.toUpperCase() === cleanNumber);
    if (!order) return null;

    const customer = state.customers.find((c) => c.id === order.customer_id);
    if (!customer) return null;

    const custCleanPhone = customer.phone.replace(/\D/g, '').slice(-10);
    if (custCleanPhone !== cleanPhone) {
      return null;
    }

    const shop = state.shops.find((s) => s.id === order.shop_id);
    const items = state.order_items.filter((i) => i.order_id === order.id);
    const files = state.files.filter((f) => f.order_id === order.id);
    const history = state.status_history
      .filter((h) => h.order_id === order.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      ...order,
      customer,
      shop,
      items,
      files,
      history,
    };
  },

  // CUSTOMER DIRECTORY
  async getShopCustomers(shopId: string): Promise<{ customer: Customer; orderCount: number; totalSpent: number; lastOrderDate: string }[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('shop_id', shopId);

        const orders = await this.getOrdersByShop(shopId);

        if (custData) {
          return custData.map((cust) => {
            const custOrders = orders.filter((o) => o.customer_id === cust.id);
            const totalSpent = custOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const lastOrderDate = custOrders.length > 0 ? custOrders[0].created_at : cust.created_at;

            return {
              customer: cust as Customer,
              orderCount: custOrders.length,
              totalSpent: Math.round(totalSpent * 100) / 100,
              lastOrderDate,
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getShopCustomers notice', err);
      }
    }

    const state = loadLocalState();
    const shopCustomers = state.customers.filter((c) => c.shop_id === shopId);
    const shopOrders = state.orders.filter((o) => o.shop_id === shopId);

    return shopCustomers.map((cust) => {
      const custOrders = shopOrders.filter((o) => o.customer_id === cust.id);
      const totalSpent = custOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const lastOrderDate = custOrders.length > 0 ? custOrders[0].created_at : cust.created_at;

      return {
        customer: cust,
        orderCount: custOrders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        lastOrderDate,
      };
    });
  },

  getCachedShopCustomers(shopId: string): { customer: Customer; orderCount: number; totalSpent: number; lastOrderDate: string }[] {
    const state = loadLocalState();
    const shopCustomers = state.customers.filter((c) => c.shop_id === shopId);
    const shopOrders = state.orders.filter((o) => o.shop_id === shopId);

    return shopCustomers.map((cust) => {
      const custOrders = shopOrders.filter((o) => o.customer_id === cust.id);
      const totalSpent = custOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const lastOrderDate = custOrders.length > 0 ? custOrders[0].created_at : cust.created_at;

      return {
        customer: cust,
        orderCount: custOrders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        lastOrderDate,
      };
    });
  },

  // ANALYTICS
  getCachedShopAnalytics(shopId: string) {
    const orders = this.getCachedOrdersByShop(shopId);
    const items = orders.flatMap((o) => o.items || []);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = todayStart - 30 * 86400000;

    const ordersToday = orders.filter((o) => new Date(o.created_at).getTime() >= todayStart);
    const ordersWeek = orders.filter((o) => new Date(o.created_at).getTime() >= weekStart);
    const ordersMonth = orders.filter((o) => new Date(o.created_at).getTime() >= monthStart);

    const revenueToday = ordersToday.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const revenueWeek = ordersWeek.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const revenueMonth = ordersMonth.reduce((sum, o) => sum + Number(o.total || 0), 0);

    let bwPages = 0;
    let colorPages = 0;
    const paperSizeCounts: Record<string, number> = {};

    for (const it of items) {
      const totalP = (it.calculated_pages || 1) * (it.copies || 1);
      if (it.print_color === 'bw') bwPages += totalP;
      else colorPages += totalP;

      paperSizeCounts[it.paper_size] = (paperSizeCounts[it.paper_size] || 0) + totalP;
    }

    return {
      ordersToday: ordersToday.length,
      ordersWeek: ordersWeek.length,
      ordersMonth: ordersMonth.length,
      revenueToday: Math.round(revenueToday * 100) / 100,
      revenueWeek: Math.round(revenueWeek * 100) / 100,
      revenueMonth: Math.round(revenueMonth * 100) / 100,
      bwPages,
      colorPages,
      paperSizeCounts,
      totalOrders: orders.length,
    };
  },

  async getShopAnalytics(shopId: string) {
    const orders = await this.getOrdersByShop(shopId);
    const items = orders.flatMap((o) => o.items || []);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = todayStart - 30 * 86400000;

    const ordersToday = orders.filter((o) => new Date(o.created_at).getTime() >= todayStart);
    const ordersWeek = orders.filter((o) => new Date(o.created_at).getTime() >= weekStart);
    const ordersMonth = orders.filter((o) => new Date(o.created_at).getTime() >= monthStart);

    const revenueToday = ordersToday.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const revenueWeek = ordersWeek.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const revenueMonth = ordersMonth.reduce((sum, o) => sum + Number(o.total || 0), 0);

    let bwPages = 0;
    let colorPages = 0;
    const paperSizeCounts: Record<string, number> = {};

    for (const it of items) {
      const totalP = (it.calculated_pages || 1) * (it.copies || 1);
      if (it.print_color === 'bw') bwPages += totalP;
      else colorPages += totalP;

      paperSizeCounts[it.paper_size] = (paperSizeCounts[it.paper_size] || 0) + totalP;
    }

    return {
      ordersToday: ordersToday.length,
      ordersWeek: ordersWeek.length,
      ordersMonth: ordersMonth.length,
      revenueToday: Math.round(revenueToday * 100) / 100,
      revenueWeek: Math.round(revenueWeek * 100) / 100,
      revenueMonth: Math.round(revenueMonth * 100) / 100,
      bwPages,
      colorPages,
      paperSizeCounts,
      totalOrders: orders.length,
    };
  },
};
