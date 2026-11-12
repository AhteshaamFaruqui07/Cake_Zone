import { CartItem } from '../types';

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
  <title>Your CakeZone Order is Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fbf6f1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e1b26;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fbf6f1; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #ebdcd0; box-shadow: 0 10px 25px rgba(85, 52, 153, 0.08);">
          
          <!-- Top Luxury Accent Stripe -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #6841b8, #db2777, #f59e0b);"></td>
          </tr>

          <!-- Header / Brand Logo & Title -->
          <tr>
            <td align="center" style="padding: 36px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #4f378a; letter-spacing: -0.5px;">CakeZone</h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8e7c9f; font-weight: 600;">Artisanal Luxury Patisserie</p>
            </td>
          </tr>

          <!-- Success Badge & Main Headline -->
          <tr>
            <td align="center" style="padding: 0 30px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50px; padding: 6px 16px;">
                    <span style="color: #047857; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">✓ Order Placed Successfully</span>
                  </td>
                </tr>
              </table>
              <h2 style="margin: 16px 0 8px 0; font-size: 22px; font-weight: 800; color: #1e1b26; letter-spacing: -0.3px;">Thank you for your order!</h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #5c5568;">
                Dear <strong>${params.customerName}</strong>, we’re thrilled to bake for you! Your order has been placed into our master chefs’ kitchen queue. Further details are provided below:
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 24px 30px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf7ff; border-radius: 14px; border: 1px solid #ebdffe; padding: 20px;">
                <tr>
                  <td>
                    <!-- Order ID & Date -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" style="font-size: 12px; font-weight: 700; color: #553499; text-transform: uppercase; letter-spacing: 0.5px;">
                          Order Code: <span style="font-size: 14px; font-weight: 800; color: #1e1b26;">${params.orderId}</span>
                        </td>
                        <td align="right" style="font-size: 12px; color: #7c7289; font-weight: 500;">
                          ${params.placedTime}
                        </td>
                      </tr>
                    </table>

                    <div style="height: 1px; background-color: #e8dbfc; margin: 14px 0;"></div>

                    <!-- Items Ordered -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #826e9c; padding-bottom: 8px;">
                          Ordered Items
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; line-height: 1.6; color: #1e1b26; font-weight: 600;">
                          ${params.cakeItem}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; line-height: 1.5; color: #726882; padding-top: 4px;">
                          ${params.cakeDetails}
                        </td>
                      </tr>
                    </table>

                    <div style="height: 1px; background-color: #e8dbfc; margin: 14px 0;"></div>

                    <!-- Total Amount -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" style="font-size: 13px; font-weight: 600; color: #5c5568;">
                          Total Order Amount
                        </td>
                        <td align="right" style="font-size: 18px; font-weight: 800; color: #4f378a;">
                          ${params.orderAmount}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery / Pick-Up Information -->
          <tr>
            <td style="padding: 0 30px 24px 30px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px dashed #d7cde5; border-radius: 12px; padding: 14px 18px;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.6; color: #5c5568;">
                    📍 <strong>Patisserie Location:</strong> 2488 Behind Dr Taqi Raza, Ghantaghar, Jabalpur<br />
                    ⏱️ <strong>Estimated Preparation:</strong> Scheduled for Tomorrow by 2:00 PM<br />
                    💬 <strong>WhatsApp Concierge:</strong> +91 93997 36018
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Track Order Button -->
          <tr>
            <td align="center" style="padding: 0 30px 32px 30px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color: #4f378a; border-radius: 12px;">
                    <a href="${params.trackOrderUrl}" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.2px;">
                      Track Your Live Order Status →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #060408; padding: 24px 30px; text-align: center;">
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #ffffff;">Sweet Moments, Always. ♡</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #9c92a8; line-height: 1.5;">
                CakeZone • Jabalpur, MP<br />
                Questions? Reply to this email or reach us on WhatsApp at +91 93997 36018
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
  const recipient = (order.customerEmail || '').trim();
  if (!recipient || !recipient.includes('@') || recipient === '—') {
    return {
      sent: false,
      provider: 'Gmail SMTP',
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

  const trackOrderUrl = `${window.location.origin}/profile?tab=orders&order=${encodeURIComponent(order.id)}`;

  const htmlContent = buildOrderConfirmationHtml({
    customerName: order.customer || 'Valued Customer',
    orderId: order.id,
    placedTime: placedTimeFormatted,
    cakeItem: order.cakeItem,
    cakeDetails: order.cakeTypeDetail || itemsDetailText,
    orderAmount: formattedAmount,
    trackOrderUrl,
  });

  // 1. Primary: Dispatch to backend /api/send-order-email (Nodemailer Gmail SMTP with App Password)
  try {
    const res = await fetch('/api/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true, // CRITICAL FOR MOBILE: ensures browser delivers request even if tab is backgrounded
      body: JSON.stringify({
        to: recipient,
        customerName: order.customer || 'Customer',
        orderId: order.id,
        cakeItem: order.cakeItem,
        cakeDetails: order.cakeTypeDetail || itemsDetailText,
        amount: formattedAmount,
        placedTime: placedTimeFormatted,
        html: htmlContent,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log('Gmail SMTP order confirmation email dispatched successfully:', data);
      return {
        sent: true,
        provider: 'Google Gmail (SMTP App Password)',
        recipient,
      };
    } else {
      console.warn('Backend /api/send-order-email returned non-ok status:', res.status);
    }
  } catch (err) {
    console.warn('Backend /api/send-order-email network call error:', err);
  }

  // 2. Secondary fallback via EmailJS if server route unavailable
  const rawServiceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_ui38l76').trim();
  const rawTemplateId = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '1h1c1bt').trim();
  const emailJsPublicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'BGQzEiGCJqRY1sYIS').trim();

  if (emailJsPublicKey) {
    try {
      const emailJsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: rawServiceId,
          template_id: rawTemplateId,
          user_id: emailJsPublicKey,
          template_params: {
            to_email: recipient,
            email: recipient,
            user_name: order.customer || 'Customer',
            order_id: order.id,
            cake_item: order.cakeItem,
            order_amount: formattedAmount,
            html_message: htmlContent,
          },
        }),
      });

      if (emailJsRes.ok) {
        return { sent: true, provider: 'EmailJS (Fallback)', recipient };
      }
    } catch {
      // Fallback failed
    }
  }

  return {
    sent: false,
    provider: 'Google Gmail SMTP',
    recipient,
    error: 'Failed to send confirmation email',
  };
};
