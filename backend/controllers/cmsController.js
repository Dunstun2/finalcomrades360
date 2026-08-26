// backend/controllers/cmsController.js
const { AboutPage, TeamMember, ContactPage, User, sequelize } = require('../database/models.registry');
const { Op } = require('sequelize');

// ============= ABOUT PAGE ENDPOINTS =============

const getAboutPage = async (req, res) => {
  try {
    const aboutPage = await AboutPage.findOne();

    if (!aboutPage) {
      return res.status(404).json({
        success: false,
        message: 'About page not found'
      });
    }

    res.json({
      success: true,
      content: aboutPage
    });
  } catch (error) {
    console.error('Error fetching about page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch about page',
      error: error.message
    });
  }
};

const createAboutPage = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if about page already exists
    const existingPage = await AboutPage.findOne();
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'About page already exists. Please use update endpoint instead.'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const aboutPage = await AboutPage.create({
      brandStory: content.brandStory || '',
      vision: content.vision || '',
      mission: content.mission || '',
      values: content.values || '',
      additionalInfo: content.additionalInfo || '',
      createdBy: userId,
      updatedBy: null
    });

    res.status(201).json({
      success: true,
      message: 'About page created successfully',
      content: aboutPage
    });
  } catch (error) {
    console.error('Error creating about page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create about page',
      error: error.message
    });
  }
};

const updateAboutPage = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    let aboutPage = await AboutPage.findOne();

    if (!aboutPage) {
      // If doesn't exist, create it
      aboutPage = await AboutPage.create({
        brandStory: content.brandStory || '',
        vision: content.vision || '',
        mission: content.mission || '',
        values: content.values || '',
        additionalInfo: content.additionalInfo || '',
        createdBy: userId,
        updatedBy: userId
      });
    } else {
      // Update existing
      await aboutPage.update({
        brandStory: content.brandStory || aboutPage.brandStory,
        vision: content.vision || aboutPage.vision,
        mission: content.mission || aboutPage.mission,
        values: content.values || aboutPage.values,
        additionalInfo: content.additionalInfo || aboutPage.additionalInfo,
        updatedBy: userId
      });
    }

    res.json({
      success: true,
      message: 'About page updated successfully',
      content: aboutPage
    });
  } catch (error) {
    console.error('Error updating about page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update about page',
      error: error.message
    });
  }
};

const deleteAboutPage = async (req, res) => {
  try {
    const aboutPage = await AboutPage.findOne();

    if (!aboutPage) {
      return res.status(404).json({
        success: false,
        message: 'About page not found'
      });
    }

    await aboutPage.destroy();

    res.json({
      success: true,
      message: 'About page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting about page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete about page',
      error: error.message
    });
  }
};

// ============= TEAM MEMBER ENDPOINTS =============

const getTeamMembers = async (req, res) => {
  try {
    const { isActive } = req.query;
    const whereClause = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const teamMembers = await TeamMember.findAll({
      where: whereClause,
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      team: teamMembers
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
};

const getTeamMember = async (req, res) => {
  try {
    const { id } = req.params;

    const teamMember = await TeamMember.findByPk(id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      team: teamMember
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team member',
      error: error.message
    });
  }
};

const createTeamMember = async (req, res) => {
  try {
    const { name, position, description, photo } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!name || !position) {
      return res.status(400).json({
        success: false,
        message: 'Name and position are required'
      });
    }

    // Get the next order number
    const lastMember = await TeamMember.findOne({
      order: [['order', 'DESC']],
      attributes: ['order']
    });

    const nextOrder = (lastMember?.order || 0) + 1;

    const teamMember = await TeamMember.create({
      name: name.trim(),
      position: position.trim(),
      description: description?.trim() || null,
      photo: photo || null,
      order: nextOrder,
      isActive: true,
      createdBy: userId,
      updatedBy: null
    });

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: teamMember
    });
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team member',
      error: error.message
    });
  }
};

const updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, description, photo, order, isActive } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const teamMember = await TeamMember.findByPk(id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    const updateData = {
      updatedBy: userId
    };

    if (name) updateData.name = name.trim();
    if (position) updateData.position = position.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (photo !== undefined) updateData.photo = photo || null;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    await teamMember.update(updateData);

    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: teamMember
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team member',
      error: error.message
    });
  }
};

const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;

    const teamMember = await TeamMember.findByPk(id);

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    await teamMember.destroy();

    res.json({
      success: true,
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team member',
      error: error.message
    });
  }
};

// ============= CONTACT PAGE ENDPOINTS =============

const getContactPage = async (req, res) => {
  try {
    const contactPage = await ContactPage.findOne();

    if (!contactPage) {
      return res.status(404).json({
        success: false,
        message: 'Contact page not found'
      });
    }

    res.json({
      success: true,
      content: contactPage
    });
  } catch (error) {
    console.error('Error fetching contact page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact page',
      error: error.message
    });
  }
};

const createOrUpdateContactPage = async (req, res) => {
  try {
    const contactData = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!contactData) {
      return res.status(400).json({
        success: false,
        message: 'Contact data is required'
      });
    }

    let contactPage = await ContactPage.findOne();

    // Helper function to convert Google Maps URL to embed format
    const convertToEmbedUrl = (url) => {
      if (!url) return '';

      // If it's already an embed URL, return as-is
      if (url.includes('/embed')) {
        return url;
      }

      // Extract coordinates from various Google Maps URL formats
      let lat = null;
      let lng = null;

      // Format 1: !3d-1.2864!4d36.8219 (embed URL format)
      const embedMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
      if (embedMatch) {
        lat = embedMatch[1];
        lng = embedMatch[2];
      }

      // Format 2: @-1.2864,36.8219 (share URL format)
      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch && !lat) {
        lat = atMatch[1];
        lng = atMatch[2];
      }

      // Format 3: q=-1.2864,36.8219 (query format)
      const qMatch = url.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch && !lat) {
        lat = qMatch[1];
        lng = qMatch[2];
      }

      // Format 4: ll=-1.2864,36.8219 (ll parameter)
      const llMatch = url.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (llMatch && !lat) {
        lat = llMatch[1];
        lng = llMatch[2];
      }

      // Format 5: place/name/@lat,lng (place URL)
      const placeMatch = url.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (placeMatch && !lat) {
        lat = placeMatch[1];
        lng = placeMatch[2];
      }

      // If we found coordinates, convert to embed URL
      if (lat && lng) {
        return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v${Date.now()}`;
      }

      // Return original URL if we can't convert it
      return url;
    };

    const dataToSave = {
      pageTitle: contactData.pageTitle || 'Get In Touch',
      pageSubtitle: contactData.pageSubtitle || '',
      email: contactData.email || '',
      phone: contactData.phone || '',
      location: contactData.location || '',
      availabilityText: contactData.availabilityText || '',
      country: contactData.country || '',
      city: contactData.city || '',
      address: contactData.address || '',
      latitude: contactData.latitude || '',
      longitude: contactData.longitude || '',
      socialMediaLinks: contactData.socialMediaLinks || [],
      responseTimeText: contactData.responseTimeText || 'I typically respond within 1-2 business days.',
      googleMapsEmbedUrl: convertToEmbedUrl(contactData.googleMapsEmbedUrl || ''),
      updatedBy: userId
    };

    if (!contactPage) {
      // Create new
      dataToSave.createdBy = userId;
      contactPage = await ContactPage.create(dataToSave);
    } else {
      // Update existing
      await contactPage.update(dataToSave);
    }

    res.json({
      success: true,
      message: contactPage.isNewRecord ? 'Contact page created successfully' : 'Contact page updated successfully',
      content: contactPage
    });
  } catch (error) {
    console.error('Error saving contact page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save contact page',
      error: error.message
    });
  }
};

const deleteContactPage = async (req, res) => {
  try {
    const contactPage = await ContactPage.findOne();

    if (!contactPage) {
      return res.status(404).json({
        success: false,
        message: 'Contact page not found'
      });
    }

    await contactPage.destroy();

    res.json({
      success: true,
      message: 'Contact page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact page:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact page',
      error: error.message
    });
  }
};

module.exports = {
  // About Page
  getAboutPage,
  createAboutPage,
  updateAboutPage,
  deleteAboutPage,
  // Team Members
  getTeamMembers,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  // Contact Page
  getContactPage,
  createOrUpdateContactPage,
  deleteContactPage
};
