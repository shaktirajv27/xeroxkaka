import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rjlfuefvovyqflctqvis.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbGZ1ZWZ2b3Z5cWZsY3RxdmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU1NDQ2NywiZXhwIjoyMTA1MTMwNDY3fQ.CJyFJs1uiJOYWWGyxWZWM8IRA618tH0PzmHHMOsTCcY';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const SHOPS = [
  {
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
    is_active: true,
  },
];

const DEFAULT_PRICING_RULES = [
  { paper_size: 'A4', print_color: 'bw', print_side: 'single', price_per_page: 2.0 },
  { paper_size: 'A4', print_color: 'bw', print_side: 'double', price_per_page: 1.5 },
  { paper_size: 'A4', print_color: 'color', print_side: 'single', price_per_page: 10.0 },
  { paper_size: 'A4', print_color: 'color', print_side: 'double', price_per_page: 7.5 },
  { paper_size: 'A3', print_color: 'bw', print_side: 'single', price_per_page: 5.0 },
  { paper_size: 'A3', print_color: 'bw', print_side: 'double', price_per_page: 4.0 },
  { paper_size: 'A3', print_color: 'color', print_side: 'single', price_per_page: 20.0 },
  { paper_size: 'A3', print_color: 'color', print_side: 'double', price_per_page: 15.0 },
  { paper_size: 'A5', print_color: 'bw', print_side: 'single', price_per_page: 2.0 },
  { paper_size: 'A5', print_color: 'bw', print_side: 'double', price_per_page: 1.5 },
  { paper_size: 'A5', print_color: 'color', print_side: 'single', price_per_page: 8.0 },
  { paper_size: 'A5', print_color: 'color', print_side: 'double', price_per_page: 6.0 },
  { paper_size: 'Legal', print_color: 'bw', print_side: 'single', price_per_page: 3.0 },
  { paper_size: 'Legal', print_color: 'bw', print_side: 'double', price_per_page: 2.25 },
  { paper_size: 'Legal', print_color: 'color', print_side: 'single', price_per_page: 12.0 },
  { paper_size: 'Legal', print_color: 'color', print_side: 'double', price_per_page: 9.0 },
  { paper_size: 'Letter', print_color: 'bw', print_side: 'single', price_per_page: 2.0 },
  { paper_size: 'Letter', print_color: 'bw', print_side: 'double', price_per_page: 1.5 },
  { paper_size: 'Letter', print_color: 'color', print_side: 'single', price_per_page: 10.0 },
  { paper_size: 'Letter', print_color: 'color', print_side: 'double', price_per_page: 7.5 },
];

const DEFAULT_SERVICES = [
  { service_name: 'Lamination (A4)', price: 20.0, is_active: true },
  { service_name: 'Spiral Binding (up to 100 pages)', price: 35.0, is_active: true },
  { service_name: 'Soft Binding / Thermal', price: 50.0, is_active: true },
  { service_name: 'Document Scanning (per page)', price: 5.0, is_active: true },
  { service_name: 'Photo Glossy Print (4x6)', price: 15.0, is_active: true },
];

async function seed() {
  console.log('Seeding shops...');
  for (const shop of SHOPS) {
    const { error } = await sb.from('shops').upsert(shop, { onConflict: 'slug' });
    if (error) console.error('Shop error:', error);
    else console.log(`✓ Shop ${shop.shop_name} seeded`);

    // Settings
    await sb.from('shop_settings').upsert({
      shop_id: shop.id,
      auto_confirm: false,
      sound_enabled: true,
      retention_hours: 48,
      opening_time: '09:00',
      closing_time: '21:00',
      currency_symbol: '₹',
    }, { onConflict: 'shop_id' });

    // Rules
    for (const rule of DEFAULT_PRICING_RULES) {
      await sb.from('pricing_rules').upsert({
        shop_id: shop.id,
        paper_size: rule.paper_size,
        print_color: rule.print_color,
        print_side: rule.print_side,
        price_per_page: rule.price_per_page,
      }, { onConflict: 'shop_id,paper_size,print_color,print_side' });
    }

    // Services
    for (const svc of DEFAULT_SERVICES) {
      await sb.from('shop_services').upsert({
        shop_id: shop.id,
        service_name: svc.service_name,
        price: svc.price,
        is_active: svc.is_active,
      }, { onConflict: 'shop_id,service_name' });
    }
  }

  // Seed sample customer and order for Shop A
  await sb.from('customers').upsert({
    id: 'c0000000-0000-0000-0000-000000000001',
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Rahul Patel',
    phone: '9898989898',
  });

  await sb.from('orders').upsert({
    id: '00000000-0000-0000-0000-000000000001',
    shop_id: 'a0000000-0000-0000-0000-000000000001',
    customer_id: 'c0000000-0000-0000-0000-000000000001',
    order_number: 'P1001',
    status: 'printing',
    priority: 'urgent',
    subtotal: 142.0,
    total: 142.0,
    customer_note: 'Please do spiral binding tightly on report.',
  }, { onConflict: 'shop_id,order_number' });

  // Seed sample customer and order for Shop B
  await sb.from('customers').upsert({
    id: 'c0000000-0000-0000-0000-000000000002',
    shop_id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Sneha Desai',
    phone: '9988776655',
  });

  await sb.from('orders').upsert({
    id: '00000000-0000-0000-0000-000000000002',
    shop_id: 'b0000000-0000-0000-0000-000000000002',
    customer_id: 'c0000000-0000-0000-0000-000000000002',
    order_number: 'P1001',
    status: 'pending',
    priority: 'normal',
    subtotal: 20.0,
    total: 20.0,
    customer_note: 'Shop B test order',
  }, { onConflict: 'shop_id,order_number' });

  console.log('✓ Initial demo orders seeded in Supabase');
  console.log('🎉 Live Supabase seeding completed successfully!');
}

seed().catch(console.error);
