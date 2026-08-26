const express = require('express');
const router = express.Router();
const { ContactMessage, ContactReply, User } = require('../../../database/models.registry');
const { auth, adminOnly, optionalAuth } = require('../../../middleware/auth');

// @route   POST api/contact
// @desc    Submit a contact message
// @access  Public (Guest or Auth)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Please provide name, email, and message' });
    }

    const newMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      userId: req.user ? req.user.id : null,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('[contact] Submit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/contact/my-messages
// @desc    Get user's own contact messages
// @access  Authenticated
router.get('/my-messages', auth, async (req, res) => {
  try {
    const messages = await ContactMessage.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: ContactReply,
          as: 'replies',
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: ContactReply, as: 'replies' }, 'createdAt', 'ASC']
      ]
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('[contact] My messages fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/contact/admin/all
// @desc    Get all contact messages (Admin)
// @access  Admin
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } }
      ];
    }

    const messages = await ContactMessage.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role']
        },
        {
          model: ContactReply,
          as: 'replies',
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: ContactReply, as: 'replies' }, 'createdAt', 'ASC']
      ]
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('[contact] Admin fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/contact/admin/:id/reply
// @desc    Respond to a contact message (Admin)
// @access  Admin
router.put('/admin/:id/reply', auth, adminOnly, async (req, res) => {
  try {
    const { adminResponse, status } = req.body;
    const message = await ContactMessage.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.adminResponse = adminResponse;
    message.status = status || 'replied';
    message.respondedAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: 'Response saved successfully',
      data: message
    });
  } catch (error) {
    console.error('[contact] Admin reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/contact/:id/reply
// @desc    Add a reply to a contact message (Admin or Original Customer)
// @access  Protected
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await ContactMessage.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check permissions: Admin can reply, or the original sender can reply
    // If the message has a userId, check if current user matches
    // If the message was guest-sent (userId: null), only admin can reply for now
    const isAdmin = ['admin', 'superadmin', 'super_admin', 'support'].includes(req.user.role);
    const isOwner = message.userId === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You do not have permission to reply to this message' });
    }

    const reply = await ContactReply.create({
      contactMessageId: message.id,
      userId: req.user.id,
      content,
      isAdminReply: isAdmin
    });

    // Update parent message status
    message.status = isAdmin ? 'replied' : 'pending';
    await message.save();

    // Send email notification if admin is replying to a guest user (no userId)
    if (isAdmin && !message.userId) {
      try {
        const { sendEmail } = require('../../../utils/email');
        await sendEmail({
          to: message.email,
          subject: `Re: ${message.subject || 'Your Contact Message'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Response to Your Message</h2>
              <p>Hello ${message.name},</p>
              <p>Thank you for contacting us. We've responded to your inquiry:</p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <p style="margin: 0; color: #374151;"><strong>Your Original Message:</strong></p>
                <p style="margin: 10px 0 0 0; color: #6b7280;">${message.message}</p>
              </div>

              <div style="background-color: #ecfdf5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
                <p style="margin: 0; color: #065f46;"><strong>Our Response:</strong></p>
                <p style="margin: 10px 0 0 0; color: #047857;">${content}</p>
              </div>

              <p>If you have any further questions, please don't hesitate to contact us again or reply to this email.</p>
              
              <p style="margin-top: 30px;">Best regards,<br/>The Support Team</p>
            </div>
          `
        });
        console.log(`[contact] Email notification sent to guest user: ${message.email}`);
      } catch (emailError) {
        console.error('[contact] Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: reply
    });
  } catch (error) {
    console.error('[contact] Reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
