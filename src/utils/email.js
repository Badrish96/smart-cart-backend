const nodemailer = require('nodemailer');

console.log('[Email] Transporter config:', {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  from: process.env.EMAIL_FROM,
  passLength: process.env.EMAIL_PASS?.length,
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"Smart Cart" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetURL}" style="display:inline-block;padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a>
      <p>This link expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
};

const sendOrderConfirmationEmail = async (email, name, order) => {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.effectivePrice.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${(item.effectivePrice * item.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const addr = order.shippingAddress;

  await transporter.sendMail({
    from: `"Smart Cart" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
        <div style="background:#4CAF50;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0">Smart Cart</h1>
        </div>
        <div style="padding:24px">
          <h2>Hi ${name}, your order is confirmed! 🎉</h2>
          <p>Thank you for shopping with Smart Cart. Your order has been placed and will be delivered soon.</p>

          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left">Item</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Unit Price</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
            ${itemsHtml}
          </table>

          <table style="width:100%;margin-top:8px">
            <tr>
              <td>Subtotal</td>
              <td style="text-align:right">₹${order.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Shipping</td>
              <td style="text-align:right">${order.shippingCharge === 0 ? 'FREE' : `₹${order.shippingCharge.toFixed(2)}`}</td>
            </tr>
            <tr style="font-weight:bold;font-size:16px">
              <td>Total</td>
              <td style="text-align:right">₹${order.totalAmount.toFixed(2)}</td>
            </tr>
          </table>

          <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>

          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Payment Method:</strong> Cash on Delivery</p>

          <h3>Shipping Address</h3>
          <p>
            ${addr.fullName}<br/>
            ${addr.street}, ${addr.city}<br/>
            ${addr.state} — ${addr.zipCode}<br/>
            ${addr.country}<br/>
            📞 ${addr.phone}
          </p>
        </div>
        <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
          &copy; ${new Date().getFullYear()} Smart Cart. All rights reserved.
        </div>
      </div>
    `,
  });
};

const sendOrderStatusEmail = async (email, name, order) => {
  const statusMessages = {
    confirmed: 'Your order has been confirmed and is being prepared.',
    shipped: 'Great news! Your order is on its way.',
    delivered: 'Your order has been delivered. Enjoy your purchase!',
    cancelled: `Your order has been cancelled. ${order.cancellationReason ? `Reason: ${order.cancellationReason}` : ''}`,
  };

  const message = statusMessages[order.orderStatus] || `Your order status is now: ${order.orderStatus}`;

  await transporter.sendMail({
    from: `"Smart Cart" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Order ${order.orderNumber} — Status Update`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
        <div style="background:#4CAF50;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0">Smart Cart</h1>
        </div>
        <div style="padding:24px">
          <h2>Hi ${name},</h2>
          <p>${message}</p>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Status:</strong> ${order.orderStatus.toUpperCase()}</p>
          ${order.orderStatus === 'delivered' ? '<p>Payment has been marked as received. Thank you!</p>' : ''}
        </div>
        <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
          &copy; ${new Date().getFullYear()} Smart Cart. All rights reserved.
        </div>
      </div>
    `,
  });
};

const sendOrderCancellationEmail = async (email, name, order) => {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${(item.effectivePrice * item.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  await transporter.sendMail({
    from: `"Smart Cart" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Order Cancelled — ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
        <div style="background:#e53935;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0">Smart Cart</h1>
        </div>
        <div style="padding:24px">
          <h2>Hi ${name}, your order has been cancelled.</h2>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          ${order.cancellationReason ? `<p><strong>Reason:</strong> ${order.cancellationReason}</p>` : ''}
          <p>The following items have been removed from your order:</p>

          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left">Item</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Amount</th>
            </tr>
            ${itemsHtml}
          </table>

          <p style="font-size:16px"><strong>Order Total: ₹${order.totalAmount.toFixed(2)}</strong></p>
          <p>Since the payment method was <strong>Cash on Delivery</strong>, no amount was charged to you.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
        </div>
        <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
          &copy; ${new Date().getFullYear()} Smart Cart. All rights reserved.
        </div>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetEmail, sendOrderConfirmationEmail, sendOrderStatusEmail, sendOrderCancellationEmail };
