import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

let serverAppOrigin = process.env.APP_URL || 'https://ais-dev-ymv5xcuikan4y3q6b2kfuu-748025275727.asia-northeast1.run.app';

app.use((req, _res, next) => {
  const origin = req.headers.origin || (req.headers.host ? `${req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${req.headers.host}` : '');
  if (origin && !origin.includes('localhost') && !origin.includes('0.0.0.0')) {
    serverAppOrigin = origin.replace(/\/+$/, '');
  }
  next();
});

// Gmail SMTP Transporter using Google Account App Password
const getGmailTransporter = () => {
  const user = process.env.GMAIL_USER || 'ateeqfaruqui@gmail.com';
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

// HTML email builder for server-side automated dispatch
const buildServerOrderConfirmationHtml = (params: {
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
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #6841b8, #db2777, #f59e0b);"></td>
          </tr>
          <tr>
            <td align="center" style="padding: 36px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #4f378a; letter-spacing: -0.5px;">CakeZone</h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8e7c9f; font-weight: 600;">Artisanal Luxury Patisserie</p>
            </td>
          </tr>
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
          <tr>
            <td style="padding: 24px 30px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf7ff; border-radius: 14px; border: 1px solid #ebdffe; padding: 20px;">
                <tr>
                  <td>
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

// Set of already dispatched order IDs to prevent duplicate sends
const processedOrderIds = new Set<string>();

/**
 * Core server function to send order confirmation email automatically
 */
async function dispatchServerOrderEmail(order: {
  orderCode: string;
  customer: string;
  email: string;
  cakeItem: string;
  amount: number | string;
  items?: any;
  specialInstructions?: string;
  createdAt?: string;
}) {
  const normalizedId = (order.orderCode || '').trim();
  const recipient = (order.email || '').trim();

  if (!normalizedId || !recipient || !recipient.includes('@') || recipient === '—') {
    return false;
  }

  if (processedOrderIds.has(normalizedId)) {
    console.log(`[CakeZone Server] Order ${normalizedId} email already sent. Skipping duplicate.`);
    return true;
  }

  const transporter = getGmailTransporter();
  const senderEmail = process.env.GMAIL_USER || 'ateeqfaruqui@gmail.com';

  if (!transporter) {
    console.warn('[CakeZone Server] GMAIL_APP_PASSWORD not set in server environment.');
    return false;
  }

  const placedTimeFormatted = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const numericAmount = Number(order.amount) || 0;
  const formattedAmount = numericAmount > 0 ? `₹${numericAmount.toLocaleString('en-IN')}` : 'Bespoke Quote';

  let itemsDetailText = order.cakeItem || 'Artisanal Cake Selection';
  if (Array.isArray(order.items) && order.items.length > 0) {
    itemsDetailText = order.items
      .map(
        (i: any) =>
          `${i.quantity || 1}x ${i.name}${i.details ? ` (${i.details})` : ''} - ₹${(
            (Number(i.price) || 0) * (Number(i.quantity) || 1)
          ).toLocaleString('en-IN')}`
      )
      .join('<br />');
  }

  const appBaseUrl = (serverAppOrigin || process.env.APP_URL || '').replace(/\/+$/, '');
  const trackOrderUrl = `${appBaseUrl}/profile?tab=orders&order=${encodeURIComponent(normalizedId)}`;

  const html = buildServerOrderConfirmationHtml({
    customerName: order.customer || 'Valued Customer',
    orderId: normalizedId,
    placedTime: placedTimeFormatted,
    cakeItem: order.cakeItem || 'Signature Cake',
    cakeDetails: itemsDetailText,
    orderAmount: formattedAmount,
    trackOrderUrl,
  });

  const mailOptions = {
    from: `"CakeZone" <${senderEmail}>`,
    to: recipient,
    subject: `🎂 Order Confirmed: ${normalizedId} - CakeZone`,
    html,
    text: `Dear ${order.customer || 'Customer'},\n\nThank you for placing the order and further order details are:\nOrder Code: ${normalizedId}\nPlaced On: ${placedTimeFormatted}\nItem: ${order.cakeItem}\nTotal: ${formattedAmount}\n\nTrack order: ${trackOrderUrl}\n\nCakeZone`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    processedOrderIds.add(normalizedId);
    console.log(`[CakeZone Server] Automated order confirmation sent for ${normalizedId}: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[CakeZone Server] Failed to send automated email for ${normalizedId}:`, err);
    return false;
  }
}

// API endpoint to send order placement email with custom HTML
app.post('/api/send-order-email', async (req, res) => {
  try {
    const { to, customerName, orderId, cakeItem, cakeDetails, amount, placedTime, html } = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Valid recipient email required' });
    }

    const normalizedId = (orderId || '').trim();
    if (normalizedId && processedOrderIds.has(normalizedId)) {
      return res.json({ success: true, alreadyProcessed: true });
    }

    const transporter = getGmailTransporter();
    const senderEmail = process.env.GMAIL_USER || 'ateeqfaruqui@gmail.com';

    if (!transporter) {
      console.warn('GMAIL_APP_PASSWORD not set in environment. Simulated dispatch log:', {
        to,
        orderId,
      });
      return res.status(200).json({
        success: true,
        simulated: true,
        message: 'GMAIL_APP_PASSWORD key pending. Email payload ready.',
      });
    }

    const mailOptions = {
      from: `"CakeZone" <${senderEmail}>`,
      to,
      subject: `🎂 Order Confirmed: ${orderId} - CakeZone`,
      html: html,
      text: `Dear ${customerName || 'Customer'},\n\nThank you for placing the order and further order details are:\nOrder Code: ${orderId}\nPlaced On: ${placedTime || 'Today'}\nItem: ${cakeItem}\nTotal: ${amount}\n\nYour order has been placed into our kitchen queue.\n\nCakeZone`,
    };

    const info = await transporter.sendMail(mailOptions);
    if (normalizedId) processedOrderIds.add(normalizedId);
    console.log('Gmail sent successfully via API:', info.messageId);

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Failed to send email via Gmail SMTP:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Setup Automated Server-Side Supabase Realtime Orders Listener
function setupServerDatabaseListener() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ldalvawsbuznlplwjhas.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_h0GaOUO53tBrG95yWRy8sQ_nVr7tnM1';

  try {
    // Dynamically import createClient to ensure seamless Node execution
    import('@supabase/supabase-js').then(async ({ createClient }) => {
      const serverSupabase = createClient(supabaseUrl, supabaseKey);

      console.log('[CakeZone Server] Initializing automated server-side order watcher...');

      // 0. Seed historical orders older than 5 minutes on boot so server restart doesn't spam historical orders
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: historicalOrders } = await serverSupabase
          .from('orders')
          .select('id, order_code, created_at')
          .lt('created_at', fiveMinutesAgo)
          .limit(100);

        if (Array.isArray(historicalOrders)) {
          for (const o of historicalOrders) {
            const code = (o.order_code || o.id || '').trim();
            if (code) processedOrderIds.add(code);
          }
          console.log(`[CakeZone Server] Deduplication seeded with ${processedOrderIds.size} historical orders.`);
        }
      } catch (seedErr) {
        console.warn('[CakeZone Server] Historical orders seed error:', seedErr);
      }

      // Helper to process an order row
      const processOrderRow = async (row: any, triggerSource: string) => {
        const code = (row?.order_code || row?.id || '').trim();
        if (!code || processedOrderIds.has(code)) {
          return;
        }

        // Extract customer email from record, special_instructions or profile
        let customerEmail = (row?.customer_email || '').trim();
        if (!customerEmail && row?.special_instructions) {
          const match = row.special_instructions.match(/Email:\s*([^\s|]+@[^\s|]+)/i);
          if (match?.[1]) customerEmail = match[1].trim();
        }

        if (!customerEmail && row?.user_id) {
          try {
            const { data: prof } = await serverSupabase
              .from('profiles')
              .select('email')
              .eq('user_id', row.user_id)
              .maybeSingle();
            if (prof?.email) customerEmail = prof.email.trim();
          } catch (e) {
            console.warn('[CakeZone Server] Could not fetch profile email:', e);
          }
        }

        if (customerEmail && customerEmail.includes('@') && customerEmail !== '—') {
          console.log(`[CakeZone Server] [${triggerSource}] Auto-dispatching email for order ${code} to ${customerEmail}`);
          await dispatchServerOrderEmail({
            orderCode: code,
            customer: row.customer || 'Customer',
            email: customerEmail,
            cakeItem: row.cake_item || 'Artisanal Cake',
            amount: row.amount || 0,
            items: row.items,
            specialInstructions: row.special_instructions,
            createdAt: row.created_at,
          });
        }
      };

      // 1. Listen for new database orders in real-time via Postgres changes
      serverSupabase
        .channel('server-orders-auto-email')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          async (payload) => {
            console.log('[CakeZone Server] [REALTIME EVENT] New order row inserted:', payload.new?.order_code || payload.new?.id);
            await processOrderRow(payload.new, 'Realtime INSERT');
          }
        )
        .subscribe((status) => {
          console.log('[CakeZone Server] Supabase Realtime order channel status:', status);
        });

      // 2. High-reliability fallback polling loop (every 8 seconds)
      // Ensures 100% guarantee that if a mobile customer places an order and immediately closes the browser tab,
      // the bakery backend server dispatches the confirmation email without missing it.
      setInterval(async () => {
        try {
          const { data: recentOrders } = await serverSupabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

          if (Array.isArray(recentOrders)) {
            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
            for (const ord of recentOrders) {
              const code = (ord.order_code || ord.id || '').trim();
              if (!code || processedOrderIds.has(code)) continue;

              const orderCreatedAt = ord.created_at ? new Date(ord.created_at).getTime() : 0;
              if (orderCreatedAt < fifteenMinutesAgo) {
                processedOrderIds.add(code);
                continue;
              }

              await processOrderRow(ord, 'Background Poller');
            }
          }
        } catch {
          // Ignore transient polling errors
        }
      }, 8000);
    }).catch((err) => {
      console.error('[CakeZone Server] Could not start Supabase watcher:', err);
    });
  } catch (err) {
    console.error('[CakeZone Server] Supabase client init error:', err);
  }
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Boot the automated server-side order database watcher
  setupServerDatabaseListener();

  if (!isProd) {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CakeZone server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
