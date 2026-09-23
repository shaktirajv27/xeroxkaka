import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createClient } from '@supabase/supabase-js';

// Custom Vite plugin to handle file uploads via Supabase Service Role Key
function supabaseUploadPlugin() {
  return {
    name: 'supabase-upload-endpoint',
    configureServer(server: any) {
      server.middlewares.use(handleUploadRequest);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(handleUploadRequest);
    },
  };
}

async function handleUploadRequest(req: any, res: any, next: any) {
  if (req.url?.startsWith('/api/upload') && req.method === 'POST') {
    try {
      const env = loadEnv('production', process.cwd(), '');
      const supabaseUrl = env.VITE_SUPABASE_URL || 'https://rjlfuefvovyqflctqvis.supabase.co';
      const serviceKey =
        env.SUPABASE_SERVICE_ROLE_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbGZ1ZWZ2b3Z5cWZsY3RxdmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU1NDQ2NywiZXhwIjoyMTA1MTMwNDY3fQ.CJyFJs1uiJOYWWGyxWZWM8IRA618tH0PzmHHMOsTCcY';

      const supabaseAdmin = createClient(supabaseUrl, serviceKey);

      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const buffer = Buffer.concat(chunks);

      const rawFilename = (req.headers['x-filename'] as string) || 'document.pdf';
      const filename = decodeURIComponent(rawFilename);
      const shopSlug = (req.headers['x-shop-slug'] as string) || 'shop';
      const contentType = (req.headers['content-type'] as string) || 'application/octet-stream';

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${shopSlug}/${uniqueId}-${cleanName}`;

      const { error } = await supabaseAdmin.storage
        .from('order-documents')
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('API upload error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: error.message }));
        return;
      }

      const { data: pubData } = supabaseAdmin.storage
        .from('order-documents')
        .getPublicUrl(storagePath);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          path: storagePath,
          publicUrl: pubData.publicUrl,
        })
      );
      return;
    } catch (err: any) {
      console.error('API upload exception:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  if (req.url === '/api/health' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  next();
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    supabaseUploadPlugin(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  test: {
    testTimeout: 25000,
  },
});

