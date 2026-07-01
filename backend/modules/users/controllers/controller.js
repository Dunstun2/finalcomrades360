const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User, UserRole, Notification, Order, Otp } = require('../../../database/models.registry');
const { isValidEmail, normalizeKenyanPhone } = require('../../../middleware/validators');
const { sendEmail } = require('../../../utils/mailer');
const { sendMessage } = require('../../../utils/messageService');
const { sanitizeUserPayload, backendBaseFromReq } = require('../../../utils/userUtils');
const { getDynamicMessage } = require('../../../utils/templateUtils');
const { mirrorOtpToSocket } = require('../../../utils/otpUtils');

const { uploadProfileImages } = require('../../../config/multer');
const { geocodeAddress } = require('../../../utils/geocodingUtils');
const { deleteFiles } = require('../../../utils/fileCleanup');
const genPublic = async () => { const y = new Date().getFullYear(); const seq = `${Math.floor(Math.random() * 1e6)}`.padStart(6, "0"); return `C360-${y}-${seq}`; };



// Admin: directly set a user's role (e.g., to 'delivery_agent')
const adminSetUserRole = async (req, res, next) => {
  const { userId, role } = req.body || {};
  try {
    const allowed = ['customer', 'seller', 'marketer', 'delivery_agent', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role value.' });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.role = role;

    // Sync multi-role array
    let currentRoles = user.roles || ['customer'];
    if (!Array.isArray(currentRoles)) {
      currentRoles = [user.role || 'customer'];
    }

    // Ensure the new role is in the array
    if (!currentRoles.includes(role)) {
      currentRoles = [...currentRoles, role];
    }

    user.roles = currentRoles;
    await user.save();

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, roles: user.roles };
    return res.json({ message: 'User role updated.', user: payload });
  } catch (e) {
    next(e);
  }
};

// Request email change: generate token and set pendingEmail
const requestEmailChange = async (req, res, next) => {
  const userId = req.user.id;
  const { newEmail } = req.body || {};
  try {
    if (!isValidEmail(newEmail)) return res.status(400).json({ message: 'Invalid email.' });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.email === newEmail && user.emailVerified) return res.json({ message: 'This is already your current email.' });
    const existing = await User.findOne({ where: { email: newEmail, id: { [Op.ne]: userId } } });
    if (existing) return res.status(400).json({ message: 'Email already in use.' });
    // Generate 6-digit OTP
    const token = `${Math.floor(100000 + Math.random() * 900000)}`;
    user.pendingEmail = newEmail;
    user.emailChangeToken = token;
    user.emailChangeExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    
    const { socketId } = req.body || {};
    const message = `Your verification code is: ${token}\n\n@comrades360.shop #${token}`;
    
    // Send token to the NEW email address
    try { await sendEmail(newEmail, 'Confirm your new email', message); } catch { }
    
    if (socketId || newEmail) {
      const { mirrorOtp } = require('../../../utils/otpUtils');
      mirrorOtp(newEmail, token, 'emailChange', socketId);
    }
    try { await Notification.create({ userId, title: 'Confirm Email Change', message: 'A verification token was sent to your new email address.' }); } catch { }
    res.json({ message: 'Email change initiated. Check your new email for the verification token.' });
  } catch (e) {
    next(e);
  }
};

// Confirm email change using token
const confirmEmailChange = async (req, res, next) => {
    const { token } = req.body;
    try {
        const user = await User.findByPk(req.user.id);
        if (!user || !user.emailChangeToken || !user.pendingEmail) {
            return res.status(400).json({ message: 'No email change request found' });
        }

        if (user.emailChangeToken !== token) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        if (new Date(user.emailChangeExpiresAt) < new Date()) {
            return res.status(400).json({ message: 'Token expired' });
        }

        user.email = user.pendingEmail;
        user.emailVerified = true;
        user.pendingEmail = null;
        user.emailChangeToken = null;
        user.emailChangeExpiresAt = null;
        await user.save();

        res.json({ message: 'Email updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Request phone change: generate OTP, store pendingPhone
// Request phone change: generate OTP, store pendingPhone
const requestPhoneOtp = async (req, res, next) => {
  const userId = req.user.id;
  const { newPhone, method, socketId } = req.body || {};
  try {
    if (!newPhone) return res.status(400).json({ message: 'New phone number is required.' });

    const norm = normalizeKenyanPhone(newPhone);
    if (!norm) return res.status(400).json({ message: 'Invalid phone format. Please use +254xxxxxxxxx.' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.phone === norm && user.phoneVerified) return res.json({ message: 'This is already your current phone number.' });

    const exists = await User.findOne({ where: { phone: norm, id: { [Op.ne]: userId } } });
    if (exists) {
      const email = exists.email || '';
      const maskedEmail = email.includes('@') 
        ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
        : 'another account';
      return res.status(400).json({ 
        message: `This phone number is already registered to ${maskedEmail}. Please log in with that account instead.` 
      });
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to the shared Otp table
    await Otp.destroy({ where: { phone: norm } });
    await Otp.create({ phone: norm, otp, expiresAt });

    // Send OTP to the NEW phone number
    let sendError = null;
    try {
      const deliveryMethod = method === 'sms' ? 'sms' : 'whatsapp';
      const message = await getDynamicMessage('phoneVerification', 
        `Your Comrades360 verification OTP is {otp}. It expires in 10 minutes.\n\n@comrades360.shop #{otp}`,
        { name: user.name || user.username || 'User', otp }
      );
      console.log(`[OTP] Sending via ${deliveryMethod} to ${norm}...`);
      await sendMessage(norm, message, deliveryMethod);
      console.log(`[OTP] ✅ Successfully sent via ${deliveryMethod} to ${norm}`);

      if (socketId || user.phone) {
        const { mirrorOtp } = require('../../../utils/otpUtils');
        mirrorOtp(user.phone, otp, 'phoneVerification', socketId);
      }
    } catch (err) {
      sendError = err.message;
      console.error(`[OTP] ❌ Failed to send via ${method || 'WhatsApp'} to ${norm}:`, err.message);
    }

    try { await Notification.create({ userId, title: 'Phone OTP', message: `An OTP was sent to your new phone number via ${method === 'sms' ? 'SMS' : 'WhatsApp'}.` }); } catch (err) { }

    if (sendError) {
      return res.status(500).json({ 
        message: `OTP was generated but failed to send via ${method === 'sms' ? 'SMS' : 'WhatsApp'}. Reason: ${sendError}`,
        sendFailed: true
      });
    }

    res.json({ message: `OTP sent to your new phone via ${method === 'sms' ? 'SMS' : 'WhatsApp'}. Please confirm to update phone.` });
  } catch (e) {
    next(e);
  }
};

// Confirm phone change with OTP
const confirmPhoneOtp = async (req, res, next) => {
  const userId = req.user.id;
  const { otp, phone } = req.body || {};
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const targetPhone = phone || user.pendingPhone;
    if (!targetPhone) return res.status(400).json({ message: 'Phone number context missing.' });

    const norm = normalizeKenyanPhone(targetPhone);

    const otpRecord = await Otp.findOne({
      where: { phone: norm, otp }
    });

    if (!otpRecord) return res.status(400).json({ message: 'Invalid verification code.' });
    if (new Date() > otpRecord.expiresAt) {
      await otpRecord.destroy();
      return res.status(400).json({ message: 'Verification code has expired.' });
    }

    user.phone = norm;
    user.phoneVerified = true;
    user.pendingPhone = null;
    await user.save();

    if (typeof user.recalculateIsVerified === 'function') {
      await user.recalculateIsVerified();
    }

    await otpRecord.destroy();

    res.json({ message: 'Phone updated successfully.' });
  } catch (e) {
    next(e);
  }
};

/**
 * Admin: Create a new user account directly with a specific role
 * Sends login details via Email, WhatsApp, or SMS
 */
const adminCreateUser = async (req, res, next) => {
  const { email, phone, name, role, notificationChannels } = req.body;
  
  try {
    if (!email && !phone) {
      return res.status(400).json({ message: 'Provide either email or phone.' });
    }

    if (!role) {
      return res.status(400).json({ message: 'Role is required.' });
    }

    const normalizedPhone = phone ? normalizeKenyanPhone(phone) : null;
    if (phone && !normalizedPhone) {
      return res.status(400).json({ message: 'Invalid Kenyan phone number.' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    // Check if user already exists
    const existingCriteria = [];
    if (email) existingCriteria.push({ email });
    if (normalizedPhone) existingCriteria.push({ phone: normalizedPhone });
    
    const existingUser = await User.findOne({ where: { [Op.or]: existingCriteria } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    // Generate temporary password
    const crypto = require('crypto');
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Generate other required fields
    const { generateUniqueReferralCode } = require('../../../utils/referralUtils');
    const referralCode = await generateUniqueReferralCode();
    const publicId = await genPublic();
    
    // Auto-generate name if missing
    const finalName = name || (email ? email.split('@')[0] : (phone ? phone : 'New User'));

    // Create the user
    const newUser = await User.create({
      name: finalName,
      email: email || `${normalizedPhone.replace('+', '')}@comrades360.placeholder`,
      phone: normalizedPhone || `placeholder-${Date.now()}`,
      password: hashedPassword,
      role: role,
      roles: [role],
      publicId: publicId,
      referralCode: referralCode,
      mustChangePassword: true,
      emailVerified: !!email,
      phoneVerified: !!normalizedPhone
    });

    // Determine notification channels
    let channels = notificationChannels;
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      channels = [email ? 'email' : (normalizedPhone ? 'whatsapp' : 'email')];
    }

    // Construct the login link
    const frontendUrl = process.env.FRONTEND_URL || 'https://comrades360.shop';
    const loginLink = `${frontendUrl}/login`;

    // Construct message
    const messageBody = `Hello ${finalName}, an account has been created for you on Comrades360 with the role of ${role}.\n\nYour temporary login details are:\nEmail/Phone: ${email || normalizedPhone}\nPassword: ${tempPassword}\n\nPlease login at ${loginLink} and change your password immediately.`;

    // Send notifications to all selected channels
    for (const ch of channels) {
      try {
        if (ch === 'email' && email) {
          await sendEmail(email, 'Your Comrades360 Account Credentials', messageBody);
        } else if ((ch === 'whatsapp' || ch === 'sms') && normalizedPhone) {
          await sendMessage(normalizedPhone, messageBody, ch);
        }
      } catch (sendErr) {
        console.error(`Failed to send notification via ${ch}:`, sendErr.message);
      }
    }

    return res.status(201).json({
      message: 'User created successfully and credentials sent.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        roles: newUser.roles,
        publicId: newUser.publicId
      }
    });

  } catch (err) {
    console.error('Error in adminCreateUser:', err);
    next(err);
  }
};

// Change password with current password confirmation
const changePassword = async (req, res, next) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body || {};
  try {
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both current and new passwords are required.' });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: 'Password updated successfully.' });
  } catch (e) {
    next(e);
  }
};
const makeRef = () => `COMRADES360-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Helper to strip placeholders so frontend forms show empty fields
// DEPRECATED: Moved to shared utils/userUtils.js
// const sanitizeUserPayload = (userData) => { ... }


const me = async (req, res) => {
  const u = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password', 'emailChangeToken', 'phoneOtp'] }
  });
  if (!u) return res.status(404).json({ message: 'User not found' });
  const safeData = sanitizeUserPayload(u.get({ plain: true }));
  res.json(safeData);
};
const applyRole = async (req, res) => { const { name, email, phone, password, role, nationalIdNumber } = req.body; if (!['seller', 'marketer', 'delivery'].includes(role)) return res.status(400).json({ error: 'Invalid role' }); let userId = req.user?.id; let u = null; if (!userId) { if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' }); const norm = normalizeKenyanPhone(phone); if (!norm) return res.status(400).json({ error: 'Invalid phone' }); const hashed = await bcrypt.hash(password || Math.random().toString(36), 10); u = await User.create({ name, email, phone: norm, password: hashed, publicId: await genPublic(), referralCode: makeRef(), role: 'customer' }); userId = u.id; } const otp = `${Math.floor(100000 + Math.random() * 900000)}`; const r = await UserRole.create({ userId, role, nationalIdNumber, phoneOtp: otp, phoneOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) }); return res.json({ message: 'Role application received', otp, userRoleId: r.id }); };
const verifyRolePhone = async (req, res) => { const { userRoleId, otp } = req.body; const r = await UserRole.findByPk(userRoleId); if (!r || r.phoneOtp !== otp || r.phoneOtpExpiresAt < new Date()) return res.status(400).json({ error: 'Invalid/expired OTP' }); await r.update({ phoneOtp: null }); return res.json({ message: 'Phone verified' }); };
const adminApproveRole = async (req, res) => { const { userRoleId, approve } = req.body; const r = await UserRole.findByPk(userRoleId); if (!r) return res.status(404).json({ error: 'Not found' }); await r.update({ status: approve ? 'approved' : 'rejected' }); return res.json({ message: `Role ${approve ? 'approved' : 'rejected'}` }); };
const listPendingRoles = async (_req, res) => {
  const rows = await UserRole.findAll({
    where: { status: 'pending' },
    include: [{
      model: User,
      attributes: ['id', 'name', 'email', 'phone']
    }],
    order: [['createdAt', 'DESC']]
  });
  res.json(rows);
};

// Update current user's profile
const updateProfile = async (req, res, next) => {
  const userId = req.user.id;
  const {
    name, phone, username, county, town, estate, houseNumber, additionalPhone, bio, gender, dateOfBirth, profileVisibility,
    businessName, businessAddress, businessCounty, businessTown, businessLandmark, businessPhone,
    businessLat, businessLng
  } = req.body || {};
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Handle file upload if present
    if (req.file) {
      const oldProfileImage = user.profileImage;
      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      user.profileImage = imageUrl;
      
      if (oldProfileImage && oldProfileImage !== imageUrl) {
        deleteFiles([oldProfileImage]);
      }
    }

    // Update basic profile fields
    if (name !== undefined && name !== null) user.name = String(name).trim();
    
    // Update phone
    if (phone !== undefined) {
      if (phone) {
        const normPhone = normalizeKenyanPhone(phone);
        if (!normPhone) return res.status(400).json({ message: 'Invalid phone number format.' });
        if (normPhone !== user.phone) {
          const existing = await User.findOne({ where: { phone: normPhone, id: { [Op.ne]: userId } } });
          if (existing) return res.status(400).json({ message: 'Phone number already in use.' });
          user.phone = normPhone;
          // user.phoneVerified = false; // Optional: Reset verification if it changes
        }
      } else {
        // user.phone = null; // SQLite NOT NULL might prevent this, but usually we want to keep it
      }
    }

    if (username !== undefined && username !== null) {
      const trimmedUsername = String(username).trim();
      if (trimmedUsername && trimmedUsername !== user.username) {
        // Check if username already exists
        const existing = await User.findOne({ where: { username: trimmedUsername, id: { [Op.ne]: userId } } });
        if (existing) return res.status(400).json({ message: 'Username already in use.' });
        user.username = trimmedUsername;
      }
    }

    // Update address fields
    if (county !== undefined) user.county = (county && String(county).trim()) || null;
    if (town !== undefined) user.town = (town && String(town).trim()) || null;
    if (estate !== undefined) user.estate = (estate && String(estate).trim()) || null;
    if (houseNumber !== undefined) user.houseNumber = (houseNumber && String(houseNumber).trim()) || null;
    if (houseNumber !== undefined) user.houseNumber = (houseNumber && String(houseNumber).trim()) || null;
    if (additionalPhone !== undefined) {
      if (additionalPhone) {
        const normAdditional = normalizeKenyanPhone(additionalPhone);
        if (!normAdditional) return res.status(400).json({ message: 'Invalid format for additional phone.' });
        user.additionalPhone = normAdditional;
      } else {
        user.additionalPhone = null;
      }
    }

    // Update personal fields
    if (bio !== undefined) user.bio = (bio && String(bio).trim()) || null;
    if (gender !== undefined) user.gender = gender || null;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || null;
    if (profileVisibility !== undefined) user.profileVisibility = profileVisibility || 'public';

    // Update business fields
    let businessLocationChanged = false;
    if (businessName !== undefined) user.businessName = (businessName && String(businessName).trim()) || null;
    if (businessAddress !== undefined) {
      const newAddress = (businessAddress && String(businessAddress).trim()) || null;
      if (user.businessAddress !== newAddress) {
        user.businessAddress = newAddress;
        businessLocationChanged = true;
      }
    }
    if (businessCounty !== undefined) {
      const newCounty = (businessCounty && String(businessCounty).trim()) || null;
      if (user.businessCounty !== newCounty) {
        user.businessCounty = newCounty;
        businessLocationChanged = true;
      }
    }
    if (businessTown !== undefined) {
      const newTown = (businessTown && String(businessTown).trim()) || null;
      if (user.businessTown !== newTown) {
        user.businessTown = newTown;
        businessLocationChanged = true;
      }
    }
    if (businessLandmark !== undefined) user.businessLandmark = (businessLandmark && String(businessLandmark).trim()) || null;
    if (businessPhone !== undefined) {
      if (businessPhone) {
        const normBusPhone = normalizeKenyanPhone(businessPhone);
        if (normBusPhone) user.businessPhone = normBusPhone;
        else user.businessPhone = String(businessPhone).trim(); // Fallback if normalization fails but we want to save it
      } else {
        user.businessPhone = null;
      }
    }

    if (businessLat !== undefined) user.businessLat = businessLat;
    if (businessLng !== undefined) user.businessLng = businessLng;

    // AUTOMATIC GPS RESOLUTION: If business location changed AND manual coordinates weren't provided, geocode it!
    if (businessLocationChanged && (businessLat === undefined || businessLat === null)) {
      try {
        console.log(`[Smart Geocoder] Address changed for user ${user.id}, resolving GPS...`);
        const coords = await geocodeAddress(user.businessAddress, user.businessTown, user.businessCounty);
        if (coords) {
          user.businessLat = coords.lat;
          user.businessLng = coords.lng;
          console.log(`[Smart Geocoder] Successfully updated GPS for ${user.name}: [${coords.lat}, ${coords.lng}]`);
        }
      } catch (geoErr) {
        console.warn('[Smart Geocoder] Background geocoding failed:', geoErr.message);
      }
    }

    // Allow updating nationalIdUrl (typically from upload)
    const { nationalIdUrl: nationalIdUrlBody } = req.body || {};
    if (nationalIdUrlBody !== undefined) {
      if (user.nationalIdUrl && user.nationalIdUrl !== nationalIdUrlBody) {
        deleteFiles([user.nationalIdUrl]);
      }
      
      user.nationalIdUrl = nationalIdUrlBody;
      // If URL is present, status is pending. If cleared, status is none.
      user.nationalIdStatus = nationalIdUrlBody ? 'pending' : 'none';

      // If cleared, also clear rejection reason
      if (!nationalIdUrlBody) {
        user.nationalIdRejectionReason = null;
      }
    }

    await user.save();

    // Check if ID was just submitted (status is pending) and notify super admins
    if (user.nationalIdStatus === 'pending' && user.nationalIdUrl) {
      try {
        const superAdmins = await User.findAll({
          where: { role: { [Op.or]: ['superadmin', 'super_admin'] } },
          attributes: ['id']
        });

        if (superAdmins.length > 0) {
          const notifications = superAdmins.map(admin => ({
            userId: admin.id,
            title: 'ID Verification Request',
            message: `User ${user.name} (${user.email}) has submitted their National ID for verification.`,
            type: 'info'
          }));
          await Notification.bulkCreate(notifications);
        }
      } catch (err) {
        console.error('Failed to notify super admins about ID submission:', err);
      }
    }

    const payload = user.toJSON();
    delete payload.password;
    delete payload.emailChangeToken;
    delete payload.phoneOtp;
    res.json({
      message: 'Profile updated.',
      user: {
        ...payload,
        profileImage: `${process.env.BASE_URL || backendBaseFromReq(req)}${user.profileImage || ''}`
      }
    });
  } catch (e) {
    next(e);
  }
};

// User requests account deletion (admin must approve)
const requestAccountDeletion = async (req, res, next) => {
  const userId = req.user.id;
  const { reason } = req.body || {};
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isDeactivated) return res.status(400).json({ message: 'Account already deactivated.' });
    if (user.deletionRequested) return res.status(400).json({ message: 'Deletion already requested.' });
    user.deletionRequested = true;
    await user.save();

    // Notify user
    try { await Notification.create({ userId, title: 'Deletion Request Received', message: 'Your account deletion request is pending admin review.' }); } catch { }

    // Optionally notify admin(s) - if you have an admin user id listing, here we skip and rely on admin UI to list
    res.status(200).json({ message: 'Deletion request submitted. Admin will review shortly.' });
  } catch (error) {
    next(error);
  }
};

// Generate a unique referral code
const generateReferralCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code;
  let isUnique = false;

  // Keep generating until we find a unique code
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existingUser = await User.findOne({ where: { referralCode: code } });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return code;
};

// Get full user profile including referral code
const getFullProfile = async (req, res) => {
  try {
    let user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'emailVerificationToken'] },
      include: [
        {
          model: UserRole,
          as: 'userRoles',
          attributes: ['role', 'createdAt'],
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a referral code if the user doesn't have one
    if (!user.referralCode) {
      user.referralCode = await generateReferralCode();
      await user.save();
    }

    // Include the referral code in the response
    const userData = user.get({ plain: true });

    // Add order count
    userData.totalOrders = await Order.count({ where: { userId: user.id } });

    res.json(sanitizeUserPayload(userData));
  } catch (error) {
    console.error('Error fetching full user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
};

const listUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const users = await User.findAll({
      where: { role },
      attributes: ['id', 'name', 'email', 'phone', 'role']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error listing users by role.', error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'phone', 'role', 'roles', 'profileImage', 'businessAddress', 'businessCounty', 'businessTown']
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user.', error: error.message });
  }
};

// Set/Update dashboard password (requires current main password)
const setDashboardPassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, dashboardPassword } = req.body || {};
  try {
    if (!currentPassword || !dashboardPassword) return res.status(400).json({ message: 'Current password and new dashboard password are required.' });
    
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Verify main password first
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect.' });

    // Hash and save dashboard password
    const hashed = await bcrypt.hash(dashboardPassword, 10);
    user.dashboardPassword = hashed;
    await user.save();

    res.json({ message: 'Dashboard password set successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Server error setting dashboard password.', error: e.message });
  }
};

// Verify dashboard password for session access
const verifyDashboardPassword = async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body || {};
  try {
    if (!password) return res.status(400).json({ message: 'Password is required.' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.dashboardPassword) {
      return res.status(400).json({ message: 'Dashboard password not set. Please set it in your profile settings.' });
    }

    const ok = await bcrypt.compare(password, user.dashboardPassword);
    if (!ok) return res.status(401).json({ message: 'Incorrect dashboard password.' });

    res.json({ message: 'Dashboard password verified successfully.', success: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error verifying dashboard password.', error: e.message });
  }
};

// --- ADMIN FORCE VERIFY ---
const adminSearchUserForVerify = async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: 'Identifier is required.' });

    const cleanIdentifier = identifier.trim();
    const normPhone = normalizeKenyanPhone(cleanIdentifier) || cleanIdentifier;

    let whereClause = {
      [Op.or]: [
        { email: { [Op.like]: `%${cleanIdentifier}%` } },
        { name: { [Op.like]: `%${cleanIdentifier}%` } },
        { phone: { [Op.like]: `%${normPhone.replace('+', '')}%` } }
      ]
    };

    const users = await User.findAll({
      where: whereClause,
      limit: 10,
      attributes: ['id', 'name', 'email', 'phone', 'emailVerified', 'phoneVerified', 'role']
    });

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found matching that identifier.' });
    }

    res.json({ users });
  } catch (e) {
    next(e);
  }
};

const adminForceVerify = async (req, res, next) => {
  try {
    const { userId, email, phone, verifyEmail, verifyPhone } = req.body;
    
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });

    // Validate that the supplied email/phone are genuinely real before we trust them
    if (email && !isValidEmail(email.trim())) {
      return res.status(400).json({ message: 'The email address provided is not valid. Please enter a real email (e.g. user@example.com).' });
    }
    if (phone) {
      const normTest = normalizeKenyanPhone(phone);
      if (!normTest) {
        return res.status(400).json({ message: 'The phone number provided is not a valid Kenyan number. Use +254... or 07... format.' });
      }
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const changes = [];

    // Always apply a valid email if one is provided — Sequelize tracks if it truly changed
    if (email) {
      user.email = email.trim().toLowerCase();
    }

    // Always apply a valid phone if one is provided — normalize first
    if (phone) {
      const normPhone = normalizeKenyanPhone(phone);
      if (normPhone) user.phone = normPhone;
    }

    // Admin explicitly requests these verifications
    if (verifyEmail) user.emailVerified = true;
    if (verifyPhone) user.phoneVerified = true;

    // Ask Sequelize which fields actually changed vs what's in the DB
    const changedFields = user.changed() || [];
    if (changedFields.includes('email'))         changes.push('email updated');
    if (changedFields.includes('phone'))         changes.push('phone updated');
    if (changedFields.includes('emailVerified')) changes.push('email verified');
    if (changedFields.includes('phoneVerified')) changes.push('phone verified');

    const updated = changedFields.length > 0;

    if (updated) {
      await user.save();

      // In-app notification
      try {
        const changesLabel = changes.join(', ');
        await Notification.create({ userId: user.id, title: 'Account Verified by Admin', message: `An administrator has updated your account: ${changesLabel}. Your account is now fully verified.` });
      } catch (e) { /* non-fatal */ }

      // Send email notification if email was verified
      if (verifyEmail && user.email) {
        try {
          await sendEmail(
            user.email,
            '✅ Your Email Has Been Verified',
            `Hello ${user.name || 'there'},\n\nYour email address has been successfully verified by an administrator.\n\nYou can now access all features of Comrades360. If you have any questions, please contact support.\n\nThank you,\nThe Comrades360 Team`
          );
        } catch (e) { console.error('[Force Verify] Failed to send verification email:', e.message); }
      }
      
      // Send WhatsApp notification if phone was verified
      if (verifyPhone && user.phone) {
        try {
          await sendMessage(
            user.phone,
            `✅ Hello ${user.name || 'there'}, your phone number has been successfully verified by an administrator on Comrades360! You now have full access to all platform features. 🎉`,
            'whatsapp'
          );
        } catch (e) { console.error('[Force Verify] Failed to send WhatsApp notification:', e.message); }
      }

      res.json({ message: `User updated successfully (${changes.join(', ')}).`, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified } });
    } else {
      res.json({ message: 'No changes were needed — user already matches the provided data.', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified } });
    }

  } catch (e) {
    next(e);
  }
};

module.exports = {
  adminSetUserRole,
  requestEmailChange,
  confirmEmailChange,
  requestPhoneOtp,
  confirmPhoneOtp,
  changePassword,
  me,
  applyRole,
  verifyRolePhone,
  adminApproveRole,
  listPendingRoles,
  updateProfile,
  updateAddress: updateProfile,
  requestAccountDeletion,
  getFullProfile,
  listUsersByRole,
  getUserById,
  setDashboardPassword,
  verifyDashboardPassword,
  adminCreateUser,
  adminSearchUserForVerify,
  adminForceVerify
};
