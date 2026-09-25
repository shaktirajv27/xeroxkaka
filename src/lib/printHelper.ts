import { UploadedFile, Order } from '../types/database';
import { getAuthorizedFileUrl } from './storage';

/**
 * Resolves the best available accessible URL for an uploaded file
 */
export function resolveFileUrl(file?: UploadedFile): string {
  if (!file) return '';

  // 1. Data URL (Base64) - instantly available, zero network latency
  if (file.data_url && file.data_url.startsWith('data:')) {
    return file.data_url;
  }

  // 2. Remote HTTP/HTTPS preview URL
  if (file.preview_url && file.preview_url.startsWith('http')) {
    return file.preview_url;
  }

  // 3. Supabase public storage path
  if (file.storage_path && !file.storage_path.startsWith('blob:')) {
    const pubUrl = getAuthorizedFileUrl(file.storage_path);
    if (pubUrl) return pubUrl;
  }

  // 4. Local blob URL (valid in same session)
  if (file.preview_url && file.preview_url.startsWith('blob:')) {
    return file.preview_url;
  }

  return '';
}

/**
 * Creates a formatted HTML printable job ticket
 */
export function createPrintJobTicketUrl(order: Order, file?: UploadedFile): string {
  const printJobHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Print Order #${order.order_number} - ${file?.original_filename || 'Print Job'}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 760px; margin: auto; background: #fff; }
        .header { border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
        .order-title { font-size: 26px; font-weight: 900; color: #1e1b4b; }
        .badge { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .spec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 14px; }
        .spec-item { padding: 12px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; }
        .spec-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .spec-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; }
        .action-bar { text-align: center; margin-top: 24px; }
        .btn-print { background: #4f46e5; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 15px; box-shadow: 0 4px 12px rgba(79,70,229,0.3); }
        .btn-print:hover { background: #4338ca; }
        @media print { .no-print { display: none !important; } body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="order-title">Print Job #${order.order_number}</div>
          <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Created: ${new Date(order.created_at).toLocaleString()}</div>
        </div>
        <span class="badge">${order.priority === 'urgent' ? 'Urgent Order' : 'Standard Queue'}</span>
      </div>
      <div class="card">
        <h2 style="font-size: 17px; margin: 0 0 12px 0;">Document: ${file?.original_filename || 'Customer Document'}</h2>
        <div class="spec-grid">
          <div class="spec-item"><div class="spec-label">Customer</div><div class="spec-val">${order.customer?.name || 'Customer'} (${order.customer?.phone || ''})</div></div>
          <div class="spec-item"><div class="spec-label">Paper & Color</div><div class="spec-val">${order.items?.[0]?.paper_size || 'A4'} • ${order.items?.[0]?.print_color === 'bw' ? 'B&W' : 'Full Color'}</div></div>
          <div class="spec-item"><div class="spec-label">Sides & Copies</div><div class="spec-val">${order.items?.[0]?.print_side === 'single' ? 'Single Sided' : 'Double Sided'} • ${order.items?.[0]?.copies || 1} Copies</div></div>
          <div class="spec-item"><div class="spec-label">Total Amount</div><div class="spec-val">₹${order.total}</div></div>
        </div>
        ${order.customer_note ? `<div style="margin-top: 14px; padding: 12px; background: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e;"><strong>Customer Note:</strong> ${order.customer_note}</div>` : ''}
      </div>
      <div class="no-print action-bar">
        <button class="btn-print" onclick="window.print()">🖨️ Print This Job Ticket</button>
      </div>
      <script>setTimeout(() => window.print(), 500);</script>
    </body>
    </html>
  `;
  const blob = new Blob([printJobHtml], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

/**
 * Dedicated image printable wrapper that fits the paper and triggers browser print
 */
function createImagePrintHtml(imageUrl: string, filename: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Print - ${filename}</title>
      <style>
        @page { size: auto; margin: 8mm; }
        body { margin: 0; padding: 0; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
        .print-nav { position: fixed; top: 16px; right: 16px; z-index: 999; display: flex; gap: 8px; }
        .print-btn { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .print-btn:hover { background: #4338ca; }
        .img-wrap { max-width: 100%; display: flex; justify-content: center; align-items: center; padding: 16px; box-sizing: border-box; }
        img { max-width: 100%; max-height: 95vh; object-fit: contain; box-shadow: 0 4px 20px rgba(0,0,0,0.08); background: white; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .img-wrap { padding: 0; }
          img { max-width: 100%; max-height: 100%; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print print-nav">
        <button class="print-btn" onclick="window.print()">🖨️ Print Image Now</button>
      </div>
      <div class="img-wrap">
        <img src="${imageUrl}" onload="setTimeout(() => window.print(), 400)" onerror="document.getElementById('err').style.display='block'; this.style.display='none';" />
      </div>
      <div id="err" style="display:none; text-align:center; padding: 40px; color: #dc2626;">
        <h3>Could not render image preview directly</h3>
        <p>Please check the original file link or network connection.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Universal print handler that works smoothly across images, PDFs, and job tickets
 */
export async function printCustomerFile(file: UploadedFile | undefined, order: Order): Promise<void> {
  const fileUrl = resolveFileUrl(file);

  // If no file URL exists, open formatted job ticket
  if (!fileUrl) {
    const ticketUrl = createPrintJobTicketUrl(order, file);
    window.open(ticketUrl, '_blank');
    return;
  }

  const isImage =
    file?.file_type === 'image' ||
    file?.mime_type?.startsWith('image/') ||
    fileUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file?.original_filename || '');

  if (isImage) {
    // Open dedicated printable image window
    const printHtml = createImagePrintHtml(fileUrl, file?.original_filename || 'Photo');
    const blob = new Blob([printHtml], { type: 'text/html' });
    const printUrl = URL.createObjectURL(blob);
    window.open(printUrl, '_blank');
    return;
  }

  // For PDF:
  // First attempt hidden iframe print for seamless single-click printing if blob/dataUrl
  if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:application/pdf')) {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = fileUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            window.open(fileUrl, '_blank');
          }
        }, 600);
      };
      return;
    } catch (e) {
      console.warn('Iframe print fallback to window.open', e);
    }
  }

  // Open PDF viewer tab (with built-in native print Ctrl+P button)
  window.open(fileUrl, '_blank');
}

/**
 * Universal document view handler
 */
export function viewCustomerFile(file: UploadedFile | undefined, order: Order): void {
  const fileUrl = resolveFileUrl(file);
  if (fileUrl) {
    window.open(fileUrl, '_blank');
  } else {
    const ticketUrl = createPrintJobTicketUrl(order, file);
    window.open(ticketUrl, '_blank');
  }
}
