import nodemailer from 'nodemailer';

interface NetlifyEvent {
  httpMethod?: string;
  body?: string | null;
  headers?: Record<string, string | undefined>;
}

const buildCorsHeaders = (origin?: string) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
});

export const handler = async (event: NetlifyEvent) => {
  const origin = event.headers?.origin || event.headers?.Origin || '*';
  const headers = buildCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const {
      to,
      customerName,
      orderId,
      cakeItem,
      cakeDetails,
      amount,
      placedTime,
      html,
    } = payload;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid recipient email required' }),
      };
    }

    const user = process.env.GMAIL_USER || 'ateeqfaruqui@gmail.com';
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (!pass) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          simulated: true,
          error: 'GMAIL_APP_PASSWORD is not configured in Netlify environment variables.',
        }),
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const cleanDetails =
      typeof cakeDetails === 'string'
        ? cakeDetails.replace(/<br\s*\/?>/gi, ', ')
        : '';

    const info = await transporter.sendMail({
      from: `"CakeZone" <${user}>`,
      to,
      subject: `🎂 Order Confirmed: ${orderId} - CakeZone`,
      html,
      text: `Dear ${customerName || 'Customer'},\n\nThank you for placing the order and further order details are:\nOrder Code: ${orderId}\nDate: ${placedTime || 'Today'}\nOrdered Items: ${cakeItem}${cleanDetails ? `\nDetails: ${cleanDetails}` : ''}\nTotal: ${amount}\n\nYour order has been placed into our kitchen queue.\n\nCakeZone`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, messageId: info.messageId }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || 'Failed to send email' }),
    };
  }
};
