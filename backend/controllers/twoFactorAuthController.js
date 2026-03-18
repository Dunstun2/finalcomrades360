const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models');

// Generate a new 2FA secret and QR code
const generate2FASecret = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Comrades360:${user.email}`,
      issuer: 'Comrades360',
      length: 20
    });

    // Generate QR code URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save the secret to the user (temporarily, until verified)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      secret: secret.base32,
      qrCodeUrl,
      otpauthUrl: secret.otpauth_url
    });
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    res.status(500).json({ message: 'Failed to generate 2FA setup', error: error.message });
  }
};

// Verify 2FA setup
const verify2FASetup = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA setup not started' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (verified) {
      // Generate recovery codes
      const recoveryCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Update user with 2FA enabled
      user.twoFactorEnabled = true;
      user.twoFactorRecoveryCodes = recoveryCodes;
      await user.save();

      return res.json({ 
        success: true, 
        recoveryCodes, // Show these to the user once
        message: '2FA has been enabled successfully' 
      });
    }

    res.status(400).json({ success: false, message: 'Invalid verification code' });
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({ message: 'Failed to verify 2FA setup', error: error.message });
  }
};

// Disable 2FA
const disable2FA = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorRecoveryCodes = [];
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({ success: true, message: '2FA has been disabled' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ message: 'Failed to disable 2FA', error: error.message });
  }
};

// Verify 2FA token
const verify2FAToken = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (verified) {
      return res.json({ success: true });
    }

    // Check recovery codes if token verification fails
    if (user.twoFactorRecoveryCodes.includes(token)) {
      // Remove used recovery code
      user.twoFactorRecoveryCodes = user.twoFactorRecoveryCodes.filter(code => code !== token);
      await user.save();
      return res.json({ 
        success: true, 
        usedRecoveryCode: true,
        remainingRecoveryCodes: user.twoFactorRecoveryCodes.length
      });
    }

    res.status(400).json({ success: false, message: 'Invalid verification code' });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    res.status(500).json({ message: 'Failed to verify 2FA token', error: error.message });
  }
};

// Generate new recovery codes
const generateNewRecoveryCodes = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    const recoveryCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    user.twoFactorRecoveryCodes = recoveryCodes;
    await user.save();

    res.json({ 
      success: true, 
      recoveryCodes, // Show these to the user once
      message: 'New recovery codes generated' 
    });
  } catch (error) {
    console.error('Error generating recovery codes:', error);
    res.status(500).json({ message: 'Failed to generate recovery codes', error: error.message });
  }
};

module.exports = {
  generate2FASecret,
  verify2FASetup,
  disable2FA,
  verify2FAToken,
  generateNewRecoveryCodes
};
