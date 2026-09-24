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

const sb = createClient(parsed.VITE_SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: users } = await sb.auth.admin.listUsers();
  console.log('=== AUTH USERS ===');
  console.log(users?.users?.map(u => ({ id: u.id, email: u.email, meta: u.user_metadata })));
  
  const { data: shops } = await sb.from('shops').select('*');
  console.log('=== SHOPS (' + (shops?.length || 0) + ') ===');
  console.log(shops);

  const { data: profiles } = await sb.from('profiles').select('*');
  console.log('=== PROFILES (' + (profiles?.length || 0) + ') ===');
  console.log(profiles);

  const { data: orders } = await sb.from('orders').select('id, shop_id, customer_name, customer_phone, total_amount, status');
  console.log('=== ORDERS (' + (orders?.length || 0) + ') ===');
  console.log(orders);
}
main();
