import { CartItem } from '../types';
import { supabase } from '../supabaseClient';

/**
 * Returns the exact responsive HTML template for the order confirmation email.
 */
export const buildOrderConfirmationHtml = (params: {
  customerName: string;
  orderId: string;
  placedTime: string;
  cakeItem: string;
  cakeDetails: string;
  orderAmount: string;
  trackOrderUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed ${params.orderId} - CakeZone</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fdf6ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2b211e;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fdf6ee; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #f0e2d5; box-shadow: 0 8px 24px rgba(93, 52, 175, 0.08);">
          
          <!-- Solid Purple Brand Header -->
          <tr>
            <td align="center" style="background-color: #5d34af; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">CakeZone</h1>
              <p style="margin: 8px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; color: #ece4ff; font-weight: 500;">MADE WITH LOVE, BAKED WITH PASSION</p>
            </td>
          </tr>

          <!-- Greeting & Confirmation Message -->
          <tr>
            <td style="padding: 30px 30px 10px 30px; text-align: left;">
              <h2 style="margin: 0 0 14px 0; font-size: 20px; font-weight: 700; color: #5d34af;">
                Hello ${params.customerName}! &#127874;
              </h2>
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #2b211e;">
                Your Order Has Been Placed Successfully!
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #665c58;">
                Thank you for choosing CakeZone! We’ve received your order and our pastry chefs have queued it for preparation. Your order details are provided below:
              </p>
            </td>
          </tr>

          <!-- ORDER SUMMARY Box -->
          <tr>
            <td style="padding: 18px 30px 22px 30px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fffaf5; border: 1px solid #eedfd2; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #5d34af;">
                      ORDER SUMMARY
                    </p>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 1.6;">
                      <tr>
                        <td style="padding: 5px 0; color: #665c58; width: 130px; vertical-align: top;"><strong>Order Code:</strong></td>
                        <td style="padding: 5px 0; color: #1e1b26; font-weight: 700;">${params.orderId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #665c58; width: 130px; vertical-align: top;"><strong>Date:</strong></td>
                        <td style="padding: 5px 0; color: #1e1b26;">${params.placedTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #665c58; width: 130px; vertical-align: top;"><strong>Ordered Items:</strong></td>
                        <td style="padding: 5px 0; color: #1e1b26; font-weight: 600;">
                          ${params.cakeItem}
                          <div style="margin-top: 4px; font-size: 12px; font-weight: 400; color: #726882;">${params.cakeDetails}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0 2px 0; border-top: 1px solid #eedfd2; color: #5d34af; font-weight: 700;">Total Amount:</td>
                        <td style="padding: 10px 0 2px 0; border-top: 1px solid #eedfd2; color: #5d34af; font-size: 16px; font-weight: 800;">${params.orderAmount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Track Order Button -->
          <tr>
            <td align="center" style="padding: 0 30px 28px 30px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color: #5d34af; border-radius: 10px;">
                    <a href="${params.trackOrderUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      Track Your Live Order Status &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #faf4ed; border-top: 1px solid #efe3d7; padding: 18px 30px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #665c58; line-height: 1.6;">
                <strong>CakeZone Patisserie</strong> &bull; 2488 Behind Dr Taqi Raza, Ghantaghar, Jabalpur<br />
                WhatsApp Concierge: +91 93997 36018
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Dispatches the order placement HTML email via the backend Gmail SMTP route
 * (or fallback via EmailJS if server SMTP is pending credentials).
 */
export const sendOrderPlacedHtmlEmail = async (order: {
  id: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  cakeItem: string;
  cakeTypeDetail?: string;
  items?: CartItem[];
  amount: number;
  date?: string;
  specialInstructions?: string;
}): Promise<{ sent: boolean; provider: string; recipient?: string; error?: string }> => {
  let recipient = (order.customerEmail || '').trim();
  if (!recipient || !recipient.includes('@') || recipient === '—') {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionEmail = (
        session?.user?.email ||
        session?.user?.user_metadata?.email ||
        session?.user?.user_metadata?.profile_email ||
        ''
      ).trim();
      if (sessionEmail && sessionEmail.includes('@')) {
        recipient = sessionEmail;
      }
    } catch {
      // Ignore session lookup fallback error
    }
  }
  if (!recipient || !recipient.includes('@') || recipient === '—') {
    return {
      sent: false,
      provider: 'EmailJS (Order Confirmation)',
      error: 'No valid customer email found for this order',
    };
  }

  const placedTimeFormatted = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const formattedAmount =
    order.amount > 0
      ? `₹${Number(order.amount).toLocaleString('en-IN')}`
      : 'Bespoke Quote';

  const itemsDetailText =
    order.items && order.items.length > 0
      ? order.items
          .map(
            (i) =>
              `${i.quantity}x ${i.name}${i.details ? ` (${i.details})` : ''} - ₹${(
                i.price * i.quantity
              ).toLocaleString('en-IN')}`
          )
          .join('<br />')
      : order.cakeItem;

  const hostedFallbackOrigin =
    'https://ais-pre-ymv5xcuikan4y3q6b2kfuu-748025275727.asia-northeast1.run.app';
  const devFallbackOrigin =
    'https://ais-dev-ymv5xcuikan4y3q6b2kfuu-748025275727.asia-northeast1.run.app';

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const isHostedHttpOrigin =
    currentOrigin.startsWith('http://') || currentOrigin.startsWith('https://');
  const isLocalMobileAppShell =
    !isHostedHttpOrigin ||
    currentOrigin.includes('localhost') ||
    currentOrigin.includes('127.0.0.1');

  const trackBaseOrigin = isLocalMobileAppShell
    ? hostedFallbackOrigin
    : currentOrigin;

  const trackOrderUrl = `${trackBaseOrigin}/profile?tab=orders&order=${encodeURIComponent(order.id)}`;

  const htmlContent = buildOrderConfirmationHtml({
    customerName: order.customer || 'Valued Customer',
    orderId: order.id,
    placedTime: placedTimeFormatted,
    cakeItem: order.cakeItem,
    cakeDetails: order.cakeTypeDetail || itemsDetailText,
    orderAmount: formattedAmount,
    trackOrderUrl,
  });

  let lastEmailError = '';

  const payload = {
    to: recipient,
    customerName: order.customer || 'Customer',
    orderId: order.id,
    cakeItem: order.cakeItem,
    cakeDetails: order.cakeTypeDetail || itemsDetailText,
    amount: formattedAmount,
    placedTime: placedTimeFormatted,
    html: htmlContent,
  };

  // 1. Primary on full-stack host: same-origin /api/send-order-email (Gmail SMTP)
  // Zero CORS preflight & keepalive ensures instant reliable delivery to ANY customer email (e.g. xyz@gmail.com) on mobile & desktop.
  if (isHostedHttpOrigin) {
    try {
      const res = await fetch('/api/send-order-email', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.success === true && !data?.simulated && !data?.error) {
          return {
            sent: true,
            provider: 'Google Gmail (SMTP App Password)',
            recipient,
          };
        }
        if (data?.error) {
          lastEmailError = data.error;
        }
      }
    } catch (err: any) {
      lastEmailError = err?.message || 'Same-origin SMTP endpoint unavailable';
      console.warn('Same-origin /api/send-order-email error, falling back:', err);
    }
  }

  // 2. Fallback: Dedicated Order Confirmation EmailJS service (completely isolated from Order Ready EmailJS)
  const orderConfirmServiceId = (
    import.meta.env.VITE_ORDER_CONFIRM_EMAILJS_SERVICE_ID || 'service_ql0btdp'
  ).trim();
  const orderConfirmTemplateId = (
    import.meta.env.VITE_ORDER_CONFIRM_EMAILJS_TEMPLATE_ID || 'template_c9jof38'
  ).trim();
  const orderConfirmPublicKey = (
    import.meta.env.VITE_ORDER_CONFIRM_EMAILJS_PUBLIC_KEY || 'YIjZW3Rd49xZIzWtq'
  ).trim();

  if (orderConfirmServiceId && orderConfirmTemplateId && orderConfirmPublicKey) {
    const emailJsSubject = `Order Confirmed ${order.id} - CakeZone`;
    const emailJsMessage = `Order Code: ${order.id}\nDate: ${placedTimeFormatted}\nOrdered Items: ${order.cakeItem}\nTotal: ${formattedAmount}\nTrack Order: ${trackOrderUrl}`;
    const candidateTemplateIds = Array.from(
      new Set(
        orderConfirmTemplateId.startsWith('template_')
          ? [orderConfirmTemplateId, orderConfirmTemplateId.replace(/^template_/, '')]
          : [orderConfirmTemplateId, `template_${orderConfirmTemplateId}`]
      )
    );

    const templateParams = {
      to_email: recipient,
      email: recipient,
      user_email: recipient,
      customer_email: recipient,
      recipient_email: recipient,
      recipient: recipient,
      to: recipient,
      toEmail: recipient,
      recipientEmail: recipient,
      customerEmail: recipient,
      reply_to: recipient,
      to_name: order.customer || 'Customer',
      name: order.customer || 'Customer',
      user_name: order.customer || 'Customer',
      customer_name: order.customer || 'Customer',
      from_name: 'CakeZone',
      order_id: order.id,
      date: placedTimeFormatted,
      placed_time: placedTimeFormatted,
      cake_item: order.cakeItem,
      cake_details: (order.cakeTypeDetail || itemsDetailText).slice(0, 1200),
      ordered_items: itemsDetailText.replace(/<br\s*\/?>/gi, ', ').slice(0, 1200),
      order_amount: formattedAmount,
      track_order_url: trackOrderUrl,
      cost: {
        shipping: '₹0',
        tax: 'Included',
        total: formattedAmount,
      },
      orders:
        order.items && order.items.length > 0
          ? order.items.map((i) => ({
              name: i.name,
              units: i.quantity,
              price: `₹${(i.price * i.quantity).toLocaleString('en-IN')}`,
            }))
          : [
              {
                name: order.cakeItem,
                units: 1,
                price: formattedAmount,
              },
            ],
      order_status: 'Confirmed',
      subject: emailJsSubject,
      message: emailJsMessage,
      html_message: htmlContent,
    };

    for (const templateId of candidateTemplateIds) {
      try {
        const emailJsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: orderConfirmServiceId,
            template_id: templateId,
            user_id: orderConfirmPublicKey,
            template_params: templateParams,
          }),
        });

        if (emailJsRes.ok) {
          return { sent: true, provider: 'EmailJS (Order Confirmation)', recipient };
        }
        const errText = await emailJsRes.text().catch(() => `HTTP ${emailJsRes.status}`);
        lastEmailError = errText || `EmailJS HTTP ${emailJsRes.status}`;
        console.warn(`EmailJS (${orderConfirmServiceId}/${templateId}) error:`, lastEmailError);
      } catch (err: any) {
        lastEmailError = err?.message || 'Network error calling EmailJS';
        console.warn(`EmailJS (${orderConfirmServiceId}/${templateId}) network error:`, err);
      }
    }
  }

  // 3. Fallback for mobile app shells: dispatch to hosted backend origins
  const fallbackEndpoints = Array.from(
    new Set(
      [
        `${devFallbackOrigin}/api/send-order-email`,
        `${hostedFallbackOrigin}/api/send-order-email`,
      ].filter(Boolean)
    )
  );

  for (const endpoint of fallbackEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.success === true && !data?.simulated && !data?.error) {
          return {
            sent: true,
            provider: 'Google Gmail (SMTP App Password)',
            recipient,
          };
        }
        if (data?.error) {
          lastEmailError = data.error;
        }
      }
    } catch (err) {
      console.warn(`Email endpoint ${endpoint} call error:`, err);
    }
  }

  return {
    sent: false,
    provider: 'Google Gmail (SMTP App Password)',
    recipient,
    error: lastEmailError || 'Failed to send confirmation email',
  };
};
