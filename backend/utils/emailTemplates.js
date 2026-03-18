// Email Template Engine
// Provides pre-formatted HTML email templates for various platform events

const emailTemplates = {
  // Order confirmation email
  orderConfirmation: ({ customerName, orderNumber, orderItems, total, trackingNumber }) => ({
    subject: `Order Confirmation - #${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .order-item { border-bottom: 1px solid #ddd; padding: 10px 0; }
    .total { font-size: 1.2em; font-weight: bold; margin-top: 15px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Thank you for your order! We've received your order and it's being processed.</p>
      
      <h3>Order Details</h3>
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
      
      <h3>Items Ordered</h3>
      ${orderItems.map(item => `
        <div class="order-item">
          <strong>${item.name}</strong> x ${item.quantity} - KES ${item.total}
        </div>
      `).join('')}
      
      <div class="total">
        Total: KES ${total}
      </div>
    </div>
    <div class="footer">
      <p>Thank you for shopping with Comrades360+</p>
      <p>For any inquiries, contact us at support@comrades360.com</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${customerName},\n\nYour order #${orderNumber} has been confirmed!\n\nTracking: ${trackingNumber}\nTotal: KES ${total}\n\nThank you for shopping with us!`
  }),

  // Payment confirmation
  paymentConfirmation: ({ customerName, orderNumber, amount, paymentMethod, receiptNumber }) => ({
    subject: `Payment Received - Order #${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .amount { font-size: 1.5em; color: #2196F3; font-weight: bold; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Confirmed</h1>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>We've successfully received your payment!</p>
      
      <div class="amount">KES ${amount}</div>
      
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Payment Method:</strong> ${paymentMethod}</p>
      <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
      
      <p>Your order is now being prepared for delivery.</p>
    </div>
    <div class="footer">
      <p>Comrades360+ - Your trusted marketplace</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Payment confirmed for order #${orderNumber}. Amount: KES ${amount}. Receipt: ${receiptNumber}`
  }),

  // Order shipped notification
  orderShipped: ({ customerName, orderNumber, trackingNumber, estimatedDelivery }) => ({
    subject: `Your Order is on the Way - #${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .tracking { background: #fff; padding: 15px; border-left: 4px solid #FF9800; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Shipped!</h1>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Great news! Your order #${orderNumber} is on its way!</p>
      
      <div class="tracking">
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>
      </div>
      
      <p>You can track your order status in your account dashboard.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Your order #${orderNumber} has shipped! Tracking: ${trackingNumber}. Estimated delivery: ${estimatedDelivery}`
  }),

  // Order delivered
  orderDelivered: ({ customerName, orderNumber, deliveryDate }) => ({
    subject: `Order Delivered - #${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Delivered!</h1>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Your order #${orderNumber} has been delivered on ${deliveryDate}.</p>
      <p>We hope you enjoy your purchase! If you have any issues, please contact our support team.</p>
      <p>We'd love to hear your feedback about this order!</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Your order #${orderNumber} was delivered on ${deliveryDate}. Thank you!`
  }),

  // Low stock alert (for sellers)
  lowStockAlert: ({ sellerName, productName, currentStock, threshold }) => ({
    subject: `Low Stock Alert - ${productName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F44336; color: white; padding: 20px; text-align: center; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠ Low Stock Alert</h1>
    </div>
    <div class="content">
      <p>Hi ${sellerName},</p>
      
      <div class="alert">
        <p><strong>${productName}</strong> is running low on stock!</p>
        <p>Current Stock: ${currentStock} | Threshold: ${threshold}</p>
      </div>
      
      <p>Please restock this item to avoid losing sales.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Low stock alert: ${productName} has ${currentStock} units remaining.`
  }),

  // Refund processed
  refundProcessed: ({ customerName, orderNumber, refundAmount, refundMethod }) => ({
    subject: `Refund Processed - Order #${orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #9C27B0; color: white; padding: 20px; text-align: center; }
    .amount { font-size: 1.3em; color: #9C27B0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Refund Processed</h1>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Your refund has been processed successfully.</p>
      
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Refund Amount:</strong> <span class="amount">KES ${refundAmount}</span></p>
      <p><strong>Refund Method:</strong> ${refundMethod}</p>
      
      <p>The refund should reflect in your account within 3-5 business days.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Refund processed for order #${orderNumber}. Amount: KES ${refundAmount} via ${refundMethod}.`
  }),

  // Welcome email
  welcome: ({ name, email }) => ({
    subject: 'Welcome to Comrades360+',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Comrades360+!</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>Thank you for joining Comrades360+, your trusted marketplace!</p>
      <p>You can now:</p>
      <ul>
        <li>Browse thousands of products</li>
        <li>Enjoy fast delivery</li>
        <li>Track your orders in real-time</li>
        <li>Earn rewards through our referral program</li>
      </ul>
      <p>Your account email: ${email}</p>
      <p>Start shopping today!</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Welcome to Comrades360+, ${name}! Your account (${email}) is now active.`
  }),

  // Password reset
  passwordReset: ({ name, resetLink }) => ({
    subject: 'Password Reset Request',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #607D8B; color: white; padding: 20px; text-align: center; }
    .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>You requested a password reset for your Comrades360+ account.</p>
      <p>Click the button below to reset your password:</p>
      <p><a href="${resetLink}" class="button">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Password reset link: ${resetLink}. Link expires in 1 hour.`
  })
};

module.exports = emailTemplates;
