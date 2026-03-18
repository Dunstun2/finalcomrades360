const { ProductInquiry, User, Notification } = require('../../models');
const { Op } = require('sequelize');

/**
 * Support Chat Module
 * Handles customer support inquiries and communication between customers and admins
 */

class SupportChatModule {
  constructor() {
    this.notificationTypes = {
      NEW_INQUIRY: 'product_inquiry',
      INQUIRY_RESPONSE: 'inquiry_response',
      INQUIRY_UPDATED: 'inquiry_updated'
    };
  }

  /**
   * Create a new product inquiry
   * @param {Object} inquiryData - Inquiry data
   * @param {number} userId - Customer user ID
   * @returns {Promise<Object>} Created inquiry
   */
  async createInquiry(inquiryData, userId) {
    try {
      const { productId, subject, message } = inquiryData;

      // Create the inquiry
      const inquiry = await ProductInquiry.create({
        productId,
        userId,
        subject: subject.trim(),
        message: message.trim(),
        userAgent: inquiryData.userAgent,
        ipAddress: inquiryData.ipAddress,
        sessionId: inquiryData.sessionId
      });

      // Notify super admin
      await this.notifySuperAdmin(inquiry);

      return inquiry;
    } catch (error) {
      console.error('Error creating inquiry:', error);
      throw error;
    }
  }

  /**
   * Notify super admin of new inquiry
   * @param {Object} inquiry - ProductInquiry instance
   * @returns {Promise<void>}
   */
  async notifySuperAdmin(inquiry) {
    try {
      const superAdmin = await User.findOne({
        where: { role: 'superadmin' }
      });

      if (superAdmin) {
        await Notification.create({
          userId: superAdmin.id,
          title: 'New Product Inquiry',
          message: `New inquiry about "${inquiry.Product?.name || 'a product'}": ${inquiry.subject}`,
          type: this.notificationTypes.NEW_INQUIRY,
          metadata: {
            inquiryId: inquiry.id,
            productId: inquiry.productId,
            customerId: inquiry.userId,
            priority: 'medium'
          }
        });
      }
    } catch (error) {
      console.error('Error notifying super admin:', error);
    }
  }

  /**
   * Respond to an inquiry (admin only)
   * @param {number} inquiryId - Inquiry ID
   * @param {string} response - Admin response
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Updated inquiry
   */
  async respondToInquiry(inquiryId, response, adminId) {
    try {
      const inquiry = await ProductInquiry.findByPk(inquiryId);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      // Update inquiry
      await inquiry.update({
        response: response.trim(),
        respondedAt: new Date(),
        status: 'resolved',
        resolvedAt: new Date(),
        assignedTo: adminId
      });

      // Notify customer
      await Notification.create({
        userId: inquiry.userId,
        title: 'Support Response',
        message: `Response to your inquiry about "${inquiry.subject}"`,
        type: this.notificationTypes.INQUIRY_RESPONSE,
        metadata: {
          inquiryId: inquiry.id,
          respondedBy: adminId
        }
      });

      return inquiry;
    } catch (error) {
      console.error('Error responding to inquiry:', error);
      throw error;
    }
  }

  /**
   * Get inquiries for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} User inquiries
   */
  async getUserInquiries(userId, filters = {}) {
    try {
      const whereClause = { userId };

      if (filters.status) whereClause.status = filters.status;

      const inquiries = await ProductInquiry.findAll({
        where: whereClause,
        include: [
          {
            model: require('../../models').Product,
            as: 'Product',
            attributes: ['id', 'name', 'coverImage', 'galleryImages']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 10,
        offset: filters.offset || 0
      });

      return inquiries;
    } catch (error) {
      console.error('Error fetching user inquiries:', error);
      throw error;
    }
  }

  /**
   * Get all inquiries (admin only)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Inquiries with pagination
   */
  async getAllInquiries(filters = {}) {
    try {
      const whereClause = {};

      if (filters.status) whereClause.status = filters.status;
      if (filters.priority) whereClause.priority = filters.priority;
      if (filters.assignedTo) whereClause.assignedTo = filters.assignedTo;

      const inquiries = await ProductInquiry.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: require('../../models').Product,
            as: 'Product',
            attributes: ['id', 'name', 'coverImage', 'galleryImages', 'categoryId']
          },
          {
            model: User,
            as: 'Customer',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: User,
            as: 'AssignedAdmin',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        order: [[filters.sortBy || 'createdAt', filters.sortOrder || 'DESC']]
      });

      return {
        inquiries: inquiries.rows,
        pagination: {
          total: inquiries.count,
          page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
          limit: filters.limit || 20,
          totalPages: Math.ceil(inquiries.count / (filters.limit || 20))
        }
      };
    } catch (error) {
      console.error('Error fetching all inquiries:', error);
      throw error;
    }
  }

  /**
   * Update inquiry status
   * @param {number} inquiryId - Inquiry ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated inquiry
   */
  async updateInquiry(inquiryId, updates) {
    try {
      const inquiry = await ProductInquiry.findByPk(inquiryId);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      await inquiry.update(updates);

      // Notify customer if status changed to resolved
      if (updates.status === 'resolved' && inquiry.response) {
        await Notification.create({
          userId: inquiry.userId,
          title: 'Inquiry Resolved',
          message: `Your inquiry about "${inquiry.subject}" has been resolved`,
          type: this.notificationTypes.INQUIRY_UPDATED,
          metadata: {
            inquiryId: inquiry.id,
            status: 'resolved'
          }
        });
      }

      return inquiry;
    } catch (error) {
      console.error('Error updating inquiry:', error);
      throw error;
    }
  }

  /**
   * Get inquiry statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    try {
      const statusStats = await ProductInquiry.findAll({
        attributes: [
          'status',
          [ProductInquiry.sequelize.fn('COUNT', ProductInquiry.sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      const priorityStats = await ProductInquiry.findAll({
        attributes: [
          'priority',
          [ProductInquiry.sequelize.fn('COUNT', ProductInquiry.sequelize.col('id')), 'count']
        ],
        group: ['priority']
      });

      const recentInquiries = await ProductInquiry.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: require('../../models').Product,
            as: 'Product',
            attributes: ['name']
          },
          {
            model: User,
            as: 'Customer',
            attributes: ['name']
          }
        ]
      });

      const totalInquiries = await ProductInquiry.count();
      const pendingInquiries = await ProductInquiry.count({
        where: { status: 'pending' }
      });

      return {
        statusStats,
        priorityStats,
        recentInquiries,
        totalInquiries,
        pendingInquiries
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  /**
   * Delete an inquiry
   * @param {number} inquiryId - Inquiry ID
   * @param {number} userId - User ID (for permission check)
   * @param {string} userRole - User role
   * @returns {Promise<void>}
   */
  async deleteInquiry(inquiryId, userId, userRole) {
    try {
      const inquiry = await ProductInquiry.findByPk(inquiryId);
      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      // Check permissions
      const isOwner = inquiry.userId === userId;
      const isAdmin = ['admin', 'superadmin'].includes(userRole);

      if (!isOwner && !isAdmin) {
        throw new Error('Access denied');
      }

      // Only allow deletion of pending inquiries for customers
      if (isOwner && inquiry.status !== 'pending') {
        throw new Error('Cannot delete inquiry that has been responded to');
      }

      await inquiry.destroy();
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      throw error;
    }
  }
}

// Export singleton instance
const supportChatModule = new SupportChatModule();

module.exports = supportChatModule;