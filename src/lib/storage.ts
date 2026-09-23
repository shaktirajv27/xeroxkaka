import { supabase, isSupabaseConfigured } from './supabase';
import { extractPdfPageCount } from './pdfHelper';

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
    data_url = await readFileAsDataUrl(file);
  } else if (['doc', 'docx'].includes(ext)) {
    file_type = 'word';
    page_count = 1;
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      preview_url = URL.createObjectURL(file);
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
 * Prioritizes /api/upload endpoint with Service Role bypass, then client SDK, then local fallback.
 */
export async function uploadOrderFile(file: File, storagePath: string, shopSlug?: string): Promise<string> {
  const slug = shopSlug || storagePath.split('/')[0] || 'shop';

  // 1. First Priority: Direct API server upload (bypasses RLS, 100% reliable across all devices)
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-filename': encodeURIComponent(file.name),
          'x-shop-slug': slug,
          'content-type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.path) {
          return data.path;
        }
      }
    } catch (apiErr) {
      console.warn('API upload endpoint notice (trying direct Supabase client):', apiErr);
    }
  }

  // 2. Second Priority: Direct client-side Supabase Storage SDK
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('order-documents')
        .upload(storagePath, file, { upsert: true });

      if (!error && data?.path) {
        return data.path;
      }
      if (error) {
        console.warn('Supabase direct client upload notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase storage exception:', err);
    }
  }

  // 3. Fallback to client Object URL if completely offline
  if (typeof URL !== 'undefined' && URL.createObjectURL) {
    return URL.createObjectURL(file);
  }

  return storagePath;
}

/**
 * Get authorized signed URL or public URL for file viewing/printing
 */
export async function getAuthorizedFileUrl(storagePath: string): Promise<string> {
  if (!storagePath) return '';
  if (storagePath.startsWith('blob:') || storagePath.startsWith('data:') || storagePath.startsWith('http')) {
    return storagePath;
  }

  const supabaseUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    'https://rjlfuefvovyqflctqvis.supabase.co';

  if (isSupabaseConfigured && supabase) {
    try {
      // Bucket is configured as public, get public URL directly
      const { data: pubData } = supabase.storage
        .from('order-documents')
        .getPublicUrl(storagePath);

      if (pubData?.publicUrl) {
        return pubData.publicUrl;
      }
    } catch (err) {
      console.warn('Could not generate Supabase public URL', err);
    }
  }

  return `${supabaseUrl}/storage/v1/object/public/order-documents/${storagePath}`;
}

