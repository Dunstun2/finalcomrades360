const crypto = require('crypto');

// Rate limiting for payment requests
const paymentRateLimit = new Map();

const PAYMENT_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 payment attempts per window
};

// Clean up old entries periodically
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of paymentRateLimit.entries()) {
      if (now - data.resetTime > PAYMENT_RATE_LIMIT.windowMs) {
        paymentRateLimit.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Clean every 5 minutes
}

// Validate payment amount
const validatePaymentAmount = (amount) => {
  if (!amount || typeof amount !== 'number') {
    return { valid: false, error: 'Invalid amount' };
  }

  if (amount < 1) {
    return { valid: false, error: 'Amount must be at least KES 1' };
  }

  if (amount > 1000000) { // 1M KES limit
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }

  // Check for suspicious amounts (too many decimal places, etc.)
  if (amount !== Math.round(amount * 100) / 100) {
    return { valid: false, error: 'Invalid amount format' };
  }

  return { valid: true };
};

// Validate phone number format
const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Check if it's a valid Kenyan number
  const kenyaRegex = /^254[0-9]{9}$|^0[0-9]{9}$|^(\+254)[0-9]{9}$/;

  if (!kenyaRegex.test(phoneNumber)) {
    return { valid: false, error: 'Invalid Kenyan phone number format' };
  }

  return { valid: true };
};

// Check rate limiting for payments
const checkPaymentRateLimit = (userId, orderId) => {
  const key = `${userId}:${orderId}`;
  const now = Date.now();

  if (!paymentRateLimit.has(key)) {
    paymentRateLimit.set(key, {
      count: 1,
      resetTime: now + PAYMENT_RATE_LIMIT.windowMs
    });
    return { allowed: true };
  }

  const userLimit = paymentRateLimit.get(key);

  if (now > userLimit.resetTime) {
    // Reset the limit
    userLimit.count = 1;
    userLimit.resetTime = now + PAYMENT_RATE_LIMIT.windowMs;
    return { allowed: true };
  }

  if (userLimit.count >= PAYMENT_RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      error: `Too many payment attempts. Try again after ${Math.ceil((userLimit.resetTime - now) / 60000)} minutes.`
    };
  }

  userLimit.count++;
  return { allowed: true };
};

// Generate secure transaction ID
const generateTransactionId = () => {
  return 'TXN-' + crypto.randomBytes(16).toString('hex').toUpperCase();
};

// Validate transaction ID format
const validateTransactionId = (transactionId) => {
  if (!transactionId || typeof transactionId !== 'string') {
    return false;
  }

  // Should start with TXN- and be followed by 32 hex characters
  const txnRegex = /^TXN-[0-9A-F]{32}$/;
  return txnRegex.test(transactionId);
};

// Sanitize payment data (remove sensitive info from logs)
const sanitizePaymentData = (paymentData) => {
  if (!paymentData) return paymentData;

  const sanitized = { ...paymentData };

  // Remove or mask sensitive fields
  if (sanitized.mpesaPhoneNumber) {
    sanitized.mpesaPhoneNumber = sanitized.mpesaPhoneNumber.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2');
  }

  if (sanitized.accountNumber) {
    sanitized.accountNumber = '****' + sanitized.accountNumber.slice(-4);
  }

  return sanitized;
};

// Validate M-Pesa callback signature (when implemented)
const validateMpesaCallback = (callbackData, signature) => {
  // In production, you would validate the callback signature
  // For now, we'll just check if required fields are present
  return callbackData &&
         callbackData.Body &&
         callbackData.Body.stkCallback;
};

// Fraud detection - basic checks
const detectPaymentFraud = (paymentData, userHistory = []) => {
  const risks = [];

  // Check for rapid successive payments
  const recentPayments = userHistory.filter(p =>
    p.createdAt > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
  );

  if (recentPayments.length > 10) {
    risks.push('High payment frequency detected');
  }

  // Check for large amounts
  if (paymentData.amount > 50000) { // Over 50k KES
    risks.push('Large payment amount');
  }

  // Check for suspicious patterns (same amount multiple times)
  const sameAmountPayments = recentPayments.filter(p => p.amount === paymentData.amount);
  if (sameAmountPayments.length > 3) {
    risks.push('Repeated same amount payments');
  }

  return {
    isRisky: risks.length > 0,
    risks,
    riskLevel: risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low'
  };
};

// Middleware to validate payment requests
const validatePaymentRequest = (req, res, next) => {
  try {
    const { orderId, paymentMethod, amount, phoneNumber } = req.body;
    const userId = req.user?.id;

    // Check rate limiting
    const rateLimitCheck = checkPaymentRateLimit(userId, orderId);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.error
      });
    }

    // Validate amount
    const amountValidation = validatePaymentAmount(amount);
    if (!amountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: amountValidation.error
      });
    }

    // Validate phone number for M-Pesa
    if (paymentMethod === 'mpesa' && phoneNumber) {
      const phoneValidation = validatePhoneNumber(phoneNumber);
      if (!phoneValidation.valid) {
        return res.status(400).json({
          success: false,
          message: phoneValidation.error
        });
      }
    }

    // Fraud detection
    const fraudCheck = detectPaymentFraud(req.body);
    if (fraudCheck.isRisky) {
      console.warn('Payment fraud risk detected:', {
        userId,
        orderId,
        risks: fraudCheck.risks,
        riskLevel: fraudCheck.riskLevel
      });

      // For high risk, you might want to block or flag for manual review
      if (fraudCheck.riskLevel === 'high') {
        return res.status(400).json({
          success: false,
          message: 'Payment request flagged for security review. Please contact support.'
        });
      }
    }

    // Add security metadata
    req.paymentSecurity = {
      transactionId: generateTransactionId(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskAssessment: fraudCheck,
      validatedAt: new Date()
    };

    next();
  } catch (error) {
    console.error('Payment validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment validation failed'
    });
  }
};

// Middleware to log payment activities securely
const logPaymentActivity = (action, paymentData, userId, orderId) => {
  const sanitizedData = sanitizePaymentData(paymentData);
  const logEntry = {
    timestamp: new Date(),
    action,
    userId,
    orderId,
    data: sanitizedData
  };

  console.log('Payment Activity:', JSON.stringify(logEntry, null, 2));

  // In production, you would store this in a secure audit log
};

module.exports = {
  validatePaymentRequest,
  validatePaymentAmount,
  validatePhoneNumber,
  checkPaymentRateLimit,
  generateTransactionId,
  validateTransactionId,
  sanitizePaymentData,
  validateMpesaCallback,
  detectPaymentFraud,
  logPaymentActivity
};