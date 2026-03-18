const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');

// @desc    Get all campaigns for the current user
// @route   GET /api/marketing/campaigns
// @access  Private/Marketer
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user.id })
      .sort('-createdAt')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name');

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new campaign
// @route   POST /api/marketing/campaigns
// @access  Private/Marketer
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      budget,
      targetAudience,
      platforms,
      creative
    } = req.body;

    const campaign = new Campaign({
      name,
      description,
      startDate,
      endDate,
      budget,
      targetAudience,
      platforms,
      creative,
      createdBy: req.user.id,
      status: 'draft'
    });

    await campaign.save();
    
    // Notify admin for approval
    await notifyAdminForApproval(campaign);
    
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a campaign
// @route   PUT /api/marketing/campaigns/:id
// @access  Private/Marketer
const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Check if user is the owner of the campaign
    if (campaign.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Prevent updates to approved/rejected campaigns
    if (['approved', 'rejected'].includes(campaign.status)) {
      return res.status(400).json({ message: 'Cannot update an approved or rejected campaign' });
    }
    
    const updates = { ...req.body };
    
    // Reset status to draft if updating an active/paused campaign
    if (['active', 'paused'].includes(campaign.status)) {
      updates.status = 'draft';
    }
    
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    // If status was changed to active, notify admin
    if (updates.status === 'active') {
      await notifyAdminForApproval(updatedCampaign);
    }
    
    res.json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a campaign
// @route   DELETE /api/marketing/campaigns/:id
// @access  Private/Marketer
const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Only allow deletion of draft or rejected campaigns
    if (!['draft', 'rejected'].includes(campaign.status)) {
      return res.status(400).json({ message: 'Cannot delete an active or approved campaign' });
    }
    
    await campaign.remove();
    res.json({ message: 'Campaign removed' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get campaigns pending approval (for admin)
// @route   GET /api/marketing/campaigns/pending-approvals
// @access  Private/Admin
const getPendingApprovals = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'pending_approval' })
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve/Reject campaign (for admin)
// @route   PUT /api/marketing/campaigns/:id/approve
// @access  Private/Admin
const reviewCampaign = async (req, res) => {
  try {
    const { status, feedback } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    if (campaign.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Campaign is not pending approval' });
    }
    
    campaign.status = status;
    campaign.approvedBy = req.user.id;
    campaign.feedback = feedback;
    
    await campaign.save();
    
    // Notify the marketer about the decision
    await notifyMarketerOfDecision(campaign);
    
    res.json(campaign);
  } catch (error) {
    console.error('Error reviewing campaign:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to notify admin for campaign approval
const notifyAdminForApproval = async (campaign) => {
  try {
    // Find admin users
    const admins = await User.find({ role: 'admin' }).select('_id');
    
    // Update campaign status to pending approval
    campaign.status = 'pending_approval';
    await campaign.save();
    
    // Send notifications to all admins
    const notification = {
      title: 'New Campaign Pending Approval',
      message: `Campaign "${campaign.name}" is waiting for your approval`,
      type: 'campaign_approval',
      recipients: admins.map(admin => admin._id),
      data: { campaignId: campaign._id }
    };
    
    await sendNotification(notification);
  } catch (error) {
    console.error('Error notifying admin:', error);
  }
};

// Helper function to notify marketer about campaign decision
const notifyMarketerOfDecision = async (campaign) => {
  try {
    const notification = {
      title: `Campaign ${campaign.status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your campaign "${campaign.name}" has been ${campaign.status}`,
      type: 'campaign_decision',
      recipients: [campaign.createdBy],
      data: { 
        campaignId: campaign._id,
        status: campaign.status,
        feedback: campaign.feedback
      }
    };
    
    await sendNotification(notification);
  } catch (error) {
    console.error('Error notifying marketer:', error);
  }
};

module.exports = {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getPendingApprovals,
  reviewCampaign
};
