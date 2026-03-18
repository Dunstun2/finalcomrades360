const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, PasswordReset } = require('../models');
const { sendEmail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');

const requestPasswordReset = async (req, res) => {
  const { email } = req.body || {}
  try {
    if (!email) return res.status(400).json({ message: 'Email is required.' })
    const user = await User.findOne({ where: { email } })
    // To prevent user enumeration, always respond with success, but only create token if user exists
    // Generate 6-digit numeric code
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    if (user) {
      await PasswordReset.update({ used: true }, { where: { userId: user.id, used: false } })
      await PasswordReset.create({ userId: user.id, token, expiresAt, used: false })
      try {
        await sendEmail(user.email, 'Reset your Comrades360 password', `Your password reset code is: ${token}`)
        if (user.phone) {
          await sendSms(user.phone, `Your Comrades360 password reset code is: ${token}`)
        }
      } catch { }
    }
    return res.json({ message: 'If that email exists, a reset code has been sent to your email and phone.' })
  } catch (e) {
    return res.status(500).json({ message: 'Server error requesting password reset.', error: e.message })
  }
}

const confirmPasswordReset = async (req, res) => {
  const { token, newPassword } = req.body || {}
  try {
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and newPassword are required.' })
    const pr = await PasswordReset.findOne({ where: { token, used: false, expiresAt: { [Op.gt]: new Date() } } })
    if (!pr) return res.status(400).json({ message: 'Invalid or expired token.' })
    const user = await User.findByPk(pr.userId)
    if (!user) return res.status(404).json({ message: 'User not found.' })
    const hashed = await bcrypt.hash(newPassword, 10)
    user.password = hashed
    await user.save()
    pr.used = true
    await pr.save()
    return res.json({ message: 'Password has been reset successfully.' })
  } catch (e) {
    return res.status(500).json({ message: 'Server error confirming password reset.', error: e.message })
  }
}

module.exports = {
  requestPasswordReset,
  confirmPasswordReset
};
