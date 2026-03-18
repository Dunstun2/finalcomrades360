const { Op } = require('sequelize');
const { SocialMediaAccount, User, ReferralTracking, sequelize } = require('../models');
const { auth } = require('../middleware/auth');

// Platform-specific validation rules
const PLATFORM_VALIDATION = {
  'Facebook': {
    regex: /^[a-zA-Z0-9.]{2,}$/,
    minLength: 2,
    maxLength: 50,
    message: 'Facebook usernames must be 2-50 characters (letters, numbers, dots only)'
  },
  'Instagram': {
    regex: /^[a-zA-Z0-9._]{1,30}$/,
    minLength: 1,
    maxLength: 30,
    message: 'Instagram usernames must be 1-30 characters (letters, numbers, dots, underscores only)'
  },
  'Twitter': {
    regex: /^[a-zA-Z0-9_]{1,15}$/,
    minLength: 1,
    maxLength: 15,
    message: 'Twitter handles must be 1-15 characters (letters, numbers, underscores only)'
  },
  'LinkedIn': {
    regex: /^[a-zA-Z0-9.-]{2,}$/,
    minLength: 2,
    maxLength: 100,
    message: 'LinkedIn usernames must be 2-100 characters (letters, numbers, dots, hyphens only)'
  },
  'TikTok': {
    regex: /^[a-zA-Z0-9._]{2,24}$/,
    minLength: 2,
    maxLength: 24,
    message: 'TikTok usernames must be 2-24 characters (letters, numbers, dots, underscores only), cannot start/end with dots'
  },
  'YouTube': {
    regex: /^[a-zA-Z0-9._-]{3,30}$/,
    minLength: 3,
    maxLength: 30,
    message: 'YouTube usernames must be 3-30 characters (letters, numbers, dots, underscores, hyphens only)'
  },
  'WhatsApp': {
    regex: /^[a-zA-Z0-9._-]{5,}$/,
    minLength: 5,
    maxLength: 100,
    message: 'WhatsApp usernames must be at least 5 characters (letters, numbers, dots, underscores, hyphens only)'
  },
  'Telegram': {
    regex: /^[a-zA-Z0-9_]{5,32}$/,
    minLength: 5,
    maxLength: 32,
    message: 'Telegram usernames must be 5-32 characters (letters, numbers, underscores only)'
  },
  'Snapchat': {
    regex: /^[a-zA-Z0-9._-]{3,15}$/,
    minLength: 3,
    maxLength: 15,
    message: 'Snapchat usernames must be 3-15 characters (letters, numbers, dots, underscores, hyphens only)'
  },
  'Pinterest': {
    regex: /^[a-zA-Z0-9._-]{3,30}$/,
    minLength: 3,
    maxLength: 30,
    message: 'Pinterest usernames must be 3-30 characters (letters, numbers, dots, underscores, hyphens only)'
  }
};

// Validate social media account based on platform
const validateSocialMediaAccount = (platform, handle) => {
  const validation = PLATFORM_VALIDATION[platform];
  if (!validation) {
    return { valid: false, message: `Unsupported platform: ${platform}` };
  }

  // Clean the handle
  const cleanHandle = handle.replace('@', '').trim();
  
  // Check length
  if (cleanHandle.length < validation.minLength) {
    return { valid: false, message: `${platform} usernames must be at least ${validation.minLength} characters` };
  }
  
  if (cleanHandle.length > validation.maxLength) {
    return { valid: false, message: `${platform} usernames must be no more than ${validation.maxLength} characters` };
  }
  
  // Check character validation
  if (!validation.regex.test(cleanHandle)) {
    return { valid: false, message: validation.message };
  }
  
  // Special validations for specific platforms
  if (platform === 'TikTok') {
    if (cleanHandle.startsWith('.') || cleanHandle.endsWith('.') || cleanHandle.includes('..')) {
      return { valid: false, message: 'TikTok usernames cannot start/end with dots, and cannot contain consecutive dots' };
    }
  }
  
  if (platform === 'WhatsApp') {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (phoneRegex.test(cleanHandle)) {
      return { valid: false, message: 'For WhatsApp, please use your username/handle instead of a phone number' };
    }
  }
  
  return { valid: true, cleanHandle };
};

// Generate profile URL based on platform and handle
const generateProfileUrl = (platform, handle) => {
  const cleanHandle = handle.replace('@', '').trim();
  const urls = {
    'Facebook': `https://facebook.com/${cleanHandle}`,
    'Instagram': `https://instagram.com/${cleanHandle}`,
    'Twitter': `https://twitter.com/${cleanHandle}`,
    'LinkedIn': `https://linkedin.com/in/${cleanHandle}`,
    'TikTok': `https://tiktok.com/@${cleanHandle}`,
    'YouTube': `https://youtube.com/@${cleanHandle}`,
    'Telegram': `https://t.me/${cleanHandle}`,
    'Snapchat': `https://snapchat.com/add/${cleanHandle}`,
    'Pinterest': `https://pinterest.com/${cleanHandle}`
  };
  return urls[platform] || null;
};

// GET /api/social-media-accounts - Get all social media accounts for the current user
const getSocialMediaAccounts = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user has a referral code
    if (!user || !user.referralCode) {
      return res.status(400).json({
        success: false,
        message: 'User referral code is missing. Please ensure your account has a valid referral code.'
      });
    }
    
    const accounts = await SocialMediaAccount.findAll({
      where: { userReferralCode: user.referralCode },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media accounts',
      error: error.message
    });
  }
};

// POST /api/social-media-accounts - Add a new social media account
const addSocialMediaAccount = async (req, res) => {
  try {
    const { platform, handle } = req.body;
    const user = req.user;
    
    // Validate input
    if (!platform || !handle) {
      return res.status(400).json({
        success: false,
        message: 'Platform and handle are required'
      });
    }
    
    // Check if user has a referral code
    if (!user.referralCode) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a referral code. Please contact support to set up your account properly.'
      });
    }
    
    // Validate platform
    if (!PLATFORM_VALIDATION[platform]) {
      return res.status(400).json({
        success: false,
        message: `Unsupported platform: ${platform}`
      });
    }
    
    // Validate the handle
    const validation = validateSocialMediaAccount(platform, handle);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }
    
    const cleanHandle = validation.cleanHandle;
    
    // Check for duplicate
    const existingAccount = await SocialMediaAccount.findOne({
      where: {
        userReferralCode: user.referralCode,
        platform,
        handle: cleanHandle
      }
    });
    
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${platform} account with handle ${cleanHandle}`
      });
    }
    
    // Check if user already has an account on this platform
    const platformAccount = await SocialMediaAccount.findOne({
      where: {
        userReferralCode: user.referralCode,
        platform,
        isActive: true
      }
    });
    
    if (platformAccount) {
      return res.status(400).json({
        success: false,
        message: `You already have an active ${platform} account. Please remove the existing one first.`
      });
    }
    
    // Generate profile URL
    const profileUrl = generateProfileUrl(platform, cleanHandle);
    
    // Create the account
    const newAccount = await SocialMediaAccount.create({
      userReferralCode: user.referralCode,
      platform,
      handle: cleanHandle,
      profileUrl,
      verificationStatus: 'verified', // For demo purposes, auto-verify
      isVerified: true,
      verifiedAt: new Date(),
      verificationMessage: 'Account verified successfully',
      metadata: {
        verifiedBy: 'system',
        verificationMethod: 'format_validation'
      }
    });
    
    res.status(201).json({
      success: true,
      message: `${platform} account added successfully`,
      data: newAccount
    });
    
  } catch (error) {
    console.error('Error adding social media account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add social media account',
      error: error.message
    });
  }
};

// PUT /api/social-media-accounts/:id - Update a social media account
const updateSocialMediaAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { handle } = req.body;
    const user = req.user;
    
    // Find the account
    const account = await SocialMediaAccount.findOne({
      where: {
        id,
        userReferralCode: user.referralCode
      }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Social media account not found'
      });
    }
    
    // Validate the new handle
    if (handle) {
      const validation = validateSocialMediaAccount(account.platform, handle);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }
      
      const cleanHandle = validation.cleanHandle;
      
      // Check for duplicate with new handle
      const existingAccount = await SocialMediaAccount.findOne({
        where: {
          userReferralCode: user.referralCode,
          platform: account.platform,
          handle: cleanHandle,
          id: { [Op.ne]: id } // Exclude current account
        }
      });
      
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: `You already have a ${account.platform} account with handle ${cleanHandle}`
        });
      }
      
      // Update handle and profile URL
      account.handle = cleanHandle;
      account.profileUrl = generateProfileUrl(account.platform, cleanHandle);
    }
    
    await account.save();
    
    res.json({
      success: true,
      message: 'Social media account updated successfully',
      data: account
    });
    
  } catch (error) {
    console.error('Error updating social media account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update social media account',
      error: error.message
    });
  }
};

// DELETE /api/social-media-accounts/:id - Remove a social media account
const deleteSocialMediaAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const account = await SocialMediaAccount.findOne({
      where: {
        id,
        userReferralCode: user.referralCode
      }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Social media account not found'
      });
    }
    
    await account.destroy();
    
    res.json({
      success: true,
      message: 'Social media account removed successfully'
    });
    
  } catch (error) {
    console.error('Error deleting social media account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete social media account',
      error: error.message
    });
  }
};

// GET /api/social-media-accounts/stats/:id - Get analytics for a social media account
const getSocialMediaAccountStats = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const account = await SocialMediaAccount.findOne({
      where: {
        id,
        userReferralCode: user.referralCode
      }
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Social media account not found'
      });
    }
    
    // Get referral tracking data for this account
    const referralStats = await ReferralTracking.findAll({
      where: {
        referrerId: user.id
      },
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'clicks'],
        [sequelize.fn('SUM', sequelize.col('converted')), 'conversions'],
        [sequelize.fn('SUM', sequelize.col('commission')), 'totalCommission']
      ],
      group: ['source'],
      raw: true
    });
    
    // Find stats for this specific social media account
    const accountStats = referralStats.find(stat => stat.source === `${account.platform}:${account.handle}`);
    
    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          platform: account.platform,
          handle: account.handle,
          profileUrl: account.profileUrl,
          totalClicks: account.totalClicks,
          totalConversions: account.totalConversions,
          totalEarnings: account.totalEarnings
        },
        referralStats: accountStats || {
          clicks: 0,
          conversions: 0,
          totalCommission: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching social media account stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account statistics',
      error: error.message
    });
  }
};

module.exports = {
  getSocialMediaAccounts,
  addSocialMediaAccount,
  updateSocialMediaAccount,
  deleteSocialMediaAccount,
  getSocialMediaAccountStats,
  validateSocialMediaAccount,
  generateProfileUrl,
  PLATFORM_VALIDATION
};