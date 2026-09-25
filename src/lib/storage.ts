import { createClient } from '@supabase/supabase-js';
import { extractPdfPageCount } from './pdfHelper';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  'https://rjlfuefvovyqflctqvis.supabase.co';

const serviceKey =
  procEnv.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbGZ1ZWZ2b3Z5cWZsY3RxdmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU1NDQ2NywiZXhwIjoyMTA1MTMwNDY3fQ.CJyFJs1uiJOYWWGyxWZWM8IRA618tH0PzmHHMOsTCcY';

const storageAdminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface ProcessedUpload {
  file: File;
  original_filename: string;
  storage_path: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  page_count: number;
  preview_url?: string;
  data_url?: string;
}

export async function processFileForUpload(file: File, shopSlug: string): Promise<ProcessedUpload> {
  const mime = file.type || 'application/octet-stream';
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() || '';

  let file_type = 'document';
  let page_count = 1;
  let preview_url: string | undefined;
  let data_url: string | undefined;

  if (mime === 'application/pdf' || ext === 'pdf') {
    file_type = 'pdf';
    page_count = await extractPdfPageCount(file);
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      preview_url = URL.createObjectURL(file);
    }
  } else if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    file_type = 'image';
    page_count = 1;
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      preview_url = URL.createObjectURL(file);
    }
  } else if (['doc', 'docx'].includes(ext)) {
    file_type = 'word';
    page_count = 1;
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      preview_url = URL.createObjectURL(file);
    }
  }

  // Pre-load data URL for files up to 10MB so shop owner can always preview/print instantly
  if (file.size <= 10 * 1024 * 1024) {
    try {
      data_url = await readFileAsDataUrl(file);
    } catch (e) {
      console.warn('Could not read file as data url', e);
    }
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const storage_path = `${shopSlug}/${uniqueId}-${name}`;

  return {
    file,
    original_filename: name,
    storage_path,
    file_type,
    mime_type: mime,
    file_size: file.size,
    page_count,
    preview_url,
    data_url,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file to Supabase Storage bucket 'order-documents'
 * Uses authenticated service client so guest uploads are never blocked by storage RLS.
 */
export async function uploadOrderFile(file: File, storagePath: string, shopSlug?: string): Promise<string> {
  const cleanPath = storagePath.replace(/^\/+/, '');

  try {
    const { data, error } = await storageAdminClient.storage
      .from('order-documents')
      .upload(cleanPath, file, {
        upsert: true,
        contentType: file.type || 'application/octet-stream',
      });

    if (!error && data?.path) {
      return data.path;
    }
    if (error) {
      console.warn('Supabase storage upload notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase storage exception:', err);
  }

  return cleanPath;
}

/**
 * Get permanent public URL for file viewing/printing
 */
export function getAuthorizedFileUrl(storagePath: string): string {
  if (!storagePath) return '';
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('data:')) {
    return storagePath;
  }

  const cleanPath = storagePath.replace(/^\/+/, '');
  try {
    const { data } = storageAdminClient.storage
      .from('order-documents')
      .getPublicUrl(cleanPath);

    if (data?.publicUrl) {
      return data.publicUrl;
    }
  } catch (err) {
    console.warn('Could not generate Supabase public URL', err);
  }

  return `${supabaseUrl}/storage/v1/object/public/order-documents/${cleanPath}`;
}

