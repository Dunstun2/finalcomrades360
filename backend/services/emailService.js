const { sendEmail } = require('./mailer');
const emailTemplates = require('./emailTemplates');
const { Notification } = require('../models');

// Enhanced Email Service with template support and fallback
class EmailService {
  constructor() {
    this.enabled = this.checkEmailConfig();
  }

  checkEmailConfig() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env || {};
    return !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
  }

  async send(to, templateName, data, options = {}) {
    try {
      const template = emailTemplates[templateName];
      if (!template) {
        console.error(`Email template "${templateName}" not found`);
        return { success: false, error: 'Template not found' };
      }

      const { subject, html, text } = template(data);

      // Send email (SMTP or simulation)
      const result = await sendEmail(to, subject, html || text);

      // Fallback to database notification if email disabled or enabled fallback
      if (options.createNotification || !this.enabled) {
        await this.createNotificationFallback(data.userId || options.userId, {
          type: templateName,
          title: subject,
          message: text.substring(0, 500), // Truncate for notification display
          data: JSON.stringify(data)
        });
      }

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Always create notification as fallback on error
      if (data.userId || options.userId) {
        await this.createNotificationFallback(data.userId || options.userId, {
          type: 'email_fallback',
          title: 'Notification',
          message: `You have a new update. Check your account for details.`,
          data: JSON.stringify({ templateName, ...data })
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  async createNotificationFallback(userId, notificationData) {
    try {
      if (!userId) return;

      await Notification.create({
        userId,
        ...notificationData,
        read: false
      });

      // Emit Socket.IO event if available
      try {
        const { getIO } = require('../realtime/socket');
        const io = getIO();
        if (io) {
          io.to(`user:${userId}`).emit('notification', notificationData);
        }
      } catch (socketError) {
        console.warn('Socket.IO notification failed:', socketError.message);
      }
    } catch (error) {
      console.error('Error creating notification fallback:', error);
    }
  }

  // Batch email sending with rate limiting
  async sendBatch(emails, delayMs = 100) {
    const results = [];
    
    for (const emailConfig of emails) {
      const { to, templateName, data, options } = emailConfig;
      const result = await this.send(to, templateName, data, options);
      results.push({ to, success: result.success, ...result });
      
      // Delay between emails to avoid rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return {
      total: emails.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // Convenience methods for common email types
  async sendOrderConfirmation(order, customer) {
    return this.send(customer.email, 'orderConfirmation', {
      userId: customer.id,
      customerName: customer.name,
      orderNumber: order.orderNumber,
      orderItems: order.items || [],
      total: order.total,
      trackingNumber: order.trackingNumber
    }, { createNotification: true });
  }

  async sendPaymentConfirmation(payment, order, customer) {
    return this.send(customer.email, 'paymentConfirmation', {
      userId: customer.id,
      customerName: customer.name,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      receiptNumber: payment.mpesaReceiptNumber || payment.externalTransactionId
    }, { createNotification: true });
  }

  async sendOrderShipped(order, customer) {
    return this.send(customer.email, 'orderShipped', {
      userId: customer.id,
      customerName: customer.name,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery
    }, { createNotification: true });
  }

  async sendOrderDelivered(order, customer) {
    return this.send(customer.email, 'orderDelivered', {
      userId: customer.id,
      customerName: customer.name,
      orderNumber: order.orderNumber,
      deliveryDate: order.actualDelivery || new Date()
    }, { createNotification: true });
  }

  async sendLowStockAlert(product, seller) {
    return this.send(seller.email, 'lowStockAlert', {
      userId: seller.id,
      sellerName: seller.name,
      productName: product.name,
      currentStock: product.stock,
      threshold: product.lowStockThreshold || 5
    }, { createNotification: true });
  }

  async sendRefundProcessed(refund, order, customer) {
    return this.send(customer.email, 'refundProcessed', {
      userId: customer.id,
      customerName: customer.name,
      orderNumber: order.orderNumber,
      refundAmount: refund.amount,
      refundMethod: refund.method
    }, { createNotification: true });
  }

  async sendWelcomeEmail(user) {
    return this.send(user.email, 'welcome', {
      userId: user.id,
      name: user.name,
      email: user.email
    });
  }

  async sendPasswordReset(user, resetLink) {
    return this.send(user.email, 'passwordReset', {
      userId: user.id,
      name: user.name,
      resetLink
    });
  }
}

// Export singleton instance
module.exports = new EmailService();
