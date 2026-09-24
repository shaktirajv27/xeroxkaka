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

async function checkRest() {
  const res = await fetch(parsed.VITE_SUPABASE_URL + '/rest/v1/', {
    headers: {
      apikey: parsed.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + parsed.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  const data = await res.json();
  console.log('Tables/RPCs:', Object.keys(data.paths || {}));
}

checkRest();
