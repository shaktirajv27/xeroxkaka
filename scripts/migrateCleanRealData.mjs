import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const parsed = {};
for (const line of env.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    parsed[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

const adminSb = createClient(parsed.VITE_SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY);

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

async function run() {
  console.log('Cleaning dummy shops & dummy users from Supabase...');
  const dummyShopIds = [
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002'
  ];

  for (const shopId of dummyShopIds) {
    await adminSb.from('order_status_history').delete().eq('order_id', shopId);
    await adminSb.from('order_items').delete().filter('order_id', 'in', `(select id from orders where shop_id = '${shopId}')`);
    await adminSb.from('files').delete().eq('shop_id', shopId);
    await adminSb.from('orders').delete().eq('shop_id', shopId);
    await adminSb.from('pricing_rules').delete().eq('shop_id', shopId);
    await adminSb.from('shop_services').delete().eq('shop_id', shopId);
    await adminSb.from('shop_settings').delete().eq('shop_id', shopId);
    await adminSb.from('shop_members').delete().eq('shop_id', shopId);
    await adminSb.from('customers').delete().eq('shop_id', shopId);
    const { error: dErr } = await adminSb.from('shops').delete().eq('id', shopId);
    console.log(`Deleted dummy shop ${shopId}:`, dErr || 'OK');
  }

  // Delete dummy profiles
  await adminSb.from('profiles').delete().in('user_id', [
    '50bd6938-4fe1-4dc9-91c2-acf4c02ee391',
    '0215a3f5-dff3-4b69-933e-9a746b1552aa'
  ]);
  console.log('Deleted dummy profiles');

  // Delete dummy auth users
  try {
    await adminSb.auth.admin.deleteUser('50bd6938-4fe1-4dc9-91c2-acf4c02ee391');
    await adminSb.auth.admin.deleteUser('0215a3f5-dff3-4b69-933e-9a746b1552aa');
    console.log('Deleted dummy auth users');
  } catch (e) {
    console.log('Note on dummy auth users:', e.message);
  }

  // Now create Pratapbhai Vala's real profile and real shop
  const pratapUserId = 'bbc1a326-5137-466a-8228-86a3c532c0df';
  const pratapShopId = 'c1000000-0000-0000-0000-000000000001';

  console.log('Upserting Pratapbhai Vala profile...');
  const { error: pErr } = await adminSb.from('profiles').upsert({
    id: pratapUserId,
    user_id: pratapUserId,
    full_name: 'Pratapbhai Vala',
    email: 'pratavala4@gmail.com',
    phone: '9978770883',
    role: 'shop_owner'
  });
  console.log('Profile result:', pErr || 'OK');

  console.log('Upserting Pratapbhai Vala real shop...');
  const { error: sErr } = await adminSb.from('shops').upsert({
    id: pratapShopId,
    owner_id: pratapUserId,
    shop_name: 'PrintSetu Digital Xerox',
    slug: 'printsetu',
    phone: '9978770883',
    whatsapp_number: '9978770883',
    email: 'pratavala4@gmail.com',
    address: 'PrintSetu Hub, Main Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    is_active: true
  });
  console.log('Shop result:', sErr || 'OK');

  // Shop settings
  console.log('Upserting shop settings...');
  const { error: setErr } = await adminSb.from('shop_settings').upsert({
    shop_id: pratapShopId,
    auto_confirm: false,
    sound_enabled: true,
    retention_hours: 48,
    opening_time: '09:00',
    closing_time: '21:00',
    currency_symbol: '₹'
  }, { onConflict: 'shop_id' });
  console.log('Settings result:', setErr || 'OK');

  // Pricing rules
  console.log('Upserting pricing rules...');
  for (const rule of DEFAULT_PRICING_RULES) {
    await adminSb.from('pricing_rules').upsert({
      shop_id: pratapShopId,
      paper_size: rule.paper_size,
      print_color: rule.print_color,
      print_side: rule.print_side,
      price_per_page: rule.price_per_page
    }, { onConflict: 'shop_id,paper_size,print_color,print_side' });
  }

  // Shop services
  console.log('Upserting shop services...');
  for (const svc of DEFAULT_SERVICES) {
    await adminSb.from('shop_services').upsert({
      shop_id: pratapShopId,
      service_name: svc.service_name,
      price: svc.price,
      is_active: svc.is_active
    }, { onConflict: 'shop_id,service_name' });
  }

  // Shop members
  console.log('Upserting shop member...');
  await adminSb.from('shop_members').upsert({
    shop_id: pratapShopId,
    user_id: pratapUserId,
    role: 'owner'
  }, { onConflict: 'shop_id,user_id' });

  console.log('Migration finished successfully!');
}

run();
