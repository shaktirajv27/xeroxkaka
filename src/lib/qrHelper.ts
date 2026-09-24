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

export interface StandeeShopInfo {
  shop_name: string;
  address?: string;
  city?: string;
  phone?: string;
  slug: string;
}

/**
 * Generates a full high-resolution printable counter standee poster (A4 proportion, 1240x1754)
 */
export async function generateStandeePosterDataUrl(
  shop: StandeeShopInfo,
  qrDataUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const width = 1240;
      const height = 1754;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      // Outer Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Helper for rounded rectangles
      const drawRoundRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        radius: number,
        fillStyle?: string,
        strokeStyle?: string,
        lineWidth?: number
      ) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fillStyle) {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
        if (strokeStyle && lineWidth) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // Main Standee Card
      drawRoundRect(40, 40, width - 80, height - 80, 36, '#ffffff', '#0f172a', 6);

      // Header Banner (dark gradient)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(40 + 36, 40);
      ctx.lineTo(width - 40 - 36, 40);
      ctx.quadraticCurveTo(width - 40, 40, width - 40, 40 + 36);
      ctx.lineTo(width - 40, 270);
      ctx.lineTo(40, 270);
      ctx.lineTo(40, 40 + 36);
      ctx.quadraticCurveTo(40, 40, 40 + 36, 40);
      ctx.closePath();
      ctx.clip();

      const grad = ctx.createLinearGradient(40, 40, width - 40, 270);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(40, 40, width - 80, 230);
      ctx.restore();

      // Header Brand Pill
      drawRoundRect(width / 2 - 175, 75, 350, 44, 22, 'rgba(56, 189, 248, 0.15)', '#38bdf8', 2);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ PRINTSETU DIGITAL COUNTER', width / 2, 103);

      // Shop Name
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const shopName = shop.shop_name || 'Print Shop';
      ctx.fillText(shopName.length > 32 ? shopName.slice(0, 30) + '...' : shopName, width / 2, 175);

      // Shop Address
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 22px system-ui, -apple-system, sans-serif';
      const locationText = [shop.address, shop.city].filter(Boolean).join(', ') || 'Direct Print Counter';
      ctx.fillText(locationText.length > 55 ? locationText.slice(0, 52) + '...' : locationText, width / 2, 220);

      // Sub-header Callout Banner
      drawRoundRect(width / 2 - 200, 310, 400, 46, 23, '#e0f2fe');
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ FAST ONLINE PRINT QUEUE', width / 2, 340);

      // Action Headline
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 42px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to Send Files for Printing', width / 2, 410);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('Upload PDF, Word or Photos • Choose B&W / Color • Instant Counter Pickup', width / 2, 450);

      // QR Code container Box
      const qrBoxSize = 640;
      const qrBoxX = (width - qrBoxSize) / 2;
      const qrBoxY = 485;
      drawRoundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28, '#ffffff', '#0f172a', 6);

      // Load QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        // Draw QR code inside container
        const qrPadding = 30;
        ctx.drawImage(
          qrImg,
          qrBoxX + qrPadding,
          qrBoxY + qrPadding,
          qrBoxSize - qrPadding * 2,
          qrBoxSize - qrPadding * 2
        );

        // Under-QR scanner callout
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No App Required! Use Any Camera or Scanner', width / 2, 1175);

        ctx.fillStyle = '#64748b';
        ctx.font = '500 20px system-ui, -apple-system, sans-serif';
        ctx.fillText('Google Pay • PhonePe • Paytm • WhatsApp • Camera App', width / 2, 1210);

        // 3-Step Guide Container
        const stepsBoxY = 1250;
        const stepsBoxH = 200;
        drawRoundRect(80, stepsBoxY, width - 160, stepsBoxH, 20, '#f8fafc', '#e2e8f0', 2);

        // Draw 3 Steps
        const colWidth = (width - 160) / 3;

        // Step 1
        const s1X = 80 + colWidth * 0.5;
        ctx.beginPath();
        ctx.arc(s1X, stepsBoxY + 55, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#4f46e5';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1', s1X, stepsBoxY + 63);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText('Scan QR Code', s1X, stepsBoxY + 115);
        ctx.fillStyle = '#64748b';
        ctx.font = '500 18px system-ui, -apple-system, sans-serif';
        ctx.fillText('Point phone camera', s1X, stepsBoxY + 145);

        // Step 2
        const s2X = 80 + colWidth * 1.5;
        ctx.beginPath();
        ctx.arc(s2X, stepsBoxY + 55, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#4f46e5';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('2', s2X, stepsBoxY + 63);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText('Upload Documents', s2X, stepsBoxY + 115);
        ctx.fillStyle = '#64748b';
        ctx.font = '500 18px system-ui, sans-serif';
        ctx.fillText('Select color & copies', s2X, stepsBoxY + 145);

        // Step 3
        const s3X = 80 + colWidth * 2.5;
        ctx.beginPath();
        ctx.arc(s3X, stepsBoxY + 55, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#059669';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('3', s3X, stepsBoxY + 63);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText('Collect Prints', s3X, stepsBoxY + 115);
        ctx.fillStyle = '#64748b';
        ctx.font = '500 18px system-ui, sans-serif';
        ctx.fillText('Instant counter pickup', s3X, stepsBoxY + 145);

        // Footer Divider
        ctx.beginPath();
        ctx.moveTo(80, 1485);
        ctx.lineTo(width - 80, 1485);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Footer Content
        ctx.fillStyle = '#334155';
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`📞 Counter: +91 ${shop.phone || '9876543210'}`, 90, 1540);

        ctx.fillStyle = '#4f46e5';
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Powered by PrintSetu', width - 90, 1540);

        // Web Link at bottom
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 20px monospace';
        ctx.textAlign = 'center';
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://printsetu.com';
        ctx.fillText(`${origin}/s/${shop.slug}`, width / 2, 1600);

        resolve(canvas.toDataURL('image/png'));
      };

      qrImg.onerror = (err) => {
        reject(new Error('Failed to load QR image for standee canvas'));
      };

      qrImg.src = qrDataUrl;
    } catch (err) {
      reject(err);
    }
  });
}
