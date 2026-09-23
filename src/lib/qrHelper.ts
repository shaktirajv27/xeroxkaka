import QRCode from 'qrcode';

/**
 * Generates a high resolution data URL for QR Code
 */
export async function generateQRCodeDataUrl(text: string, width = 512): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL', err);
    throw err;
  }
}

/**
 * Downloads a data URL as an image file
 */
export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
