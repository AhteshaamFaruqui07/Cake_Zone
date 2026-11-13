import nodemailer from 'nodemailer';

interface VercelRequest {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const originHeader = req.headers?.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader || '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      to,
      customerName,
      orderId,
      cakeItem,
      cakeDetails,
      amount,
      placedTime,
      html,
    } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      res.status(400).json({ error: 'Valid recipient email required' });
      return;
    }

    const user = process.env.GMAIL_USER || 'ateeqfaruqui@gmail.com';
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (!pass) {
      res.status(200).json({
        success: false,
        simulated: true,
        error: 'GMAIL_APP_PASSWORD is not configured in Vercel environment variables.',
      });
      return;
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

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to send email' });
  }
}
