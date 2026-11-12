import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

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

// API endpoint to send order placement email with custom HTML
app.post('/api/send-order-email', async (req, res) => {
  try {
    const { to, customerName, orderId, cakeItem, cakeDetails, amount, placedTime, html } = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Valid recipient email required' });
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
    console.log('Gmail sent successfully:', info.messageId);

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Failed to send email via Gmail SMTP:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

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
