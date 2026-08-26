// backend/routes/cmsRoutes.js
const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const blogController = require('../controllers/blogController');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');

// ============= ABOUT PAGE ROUTES =============

// Get about page (public)
router.get('/about', cmsController.getAboutPage);

// Create about page (admin only)
router.post('/about', auth, adminOnly, cmsController.createAboutPage);

// Update about page (admin only)
router.put('/about', auth, adminOnly, cmsController.updateAboutPage);

// Delete about page (admin only)
router.delete('/about', auth, adminOnly, cmsController.deleteAboutPage);

// ============= TEAM MEMBER ROUTES =============

// Get all team members (public)
router.get('/about/team', cmsController.getTeamMembers);

// Get specific team member (public)
router.get('/about/team/:id', cmsController.getTeamMember);

// Create team member (admin only)
router.post('/about/team', auth, adminOnly, cmsController.createTeamMember);

// Update team member (admin only)
router.put('/about/team/:id', auth, adminOnly, cmsController.updateTeamMember);

// Delete team member (admin only)
router.delete('/about/team/:id', auth, adminOnly, cmsController.deleteTeamMember);

// ============= CONTACT PAGE ROUTES =============

// Get contact page (public)
router.get('/contact', cmsController.getContactPage);

// Create or update contact page (admin only)
router.post('/contact', auth, adminOnly, cmsController.createOrUpdateContactPage);

// Delete contact page (admin only)
router.delete('/contact', auth, adminOnly, cmsController.deleteContactPage);

// ============= BLOG ROUTES =============

// Get all blog posts (public with admin access to drafts)
router.get('/blog', optionalAuth, blogController.getAllBlogs);

// Get single blog post by slug (public)
router.get('/blog/:slug', optionalAuth, blogController.getBlogBySlug);

// Create blog post (admin only)
router.post('/blog', auth, adminOnly, blogController.createBlog);

// Update blog post (admin only)
router.put('/blog/:id', auth, adminOnly, blogController.updateBlog);

// Delete blog post (admin only)
router.delete('/blog/:id', auth, adminOnly, blogController.deleteBlog);

// ============= BLOG COMMENTS ROUTES =============

// Get comments for a blog post (public)
router.get('/blog/:slug/comments', blogController.getComments);

// Create a comment (public)
router.post('/blog/:slug/comments', blogController.createComment);

// ============= BLOG LIKES ROUTES =============

// Get like count and status (public)
router.get('/blog/:slug/likes', blogController.getLikes);

// Toggle like (public)
router.post('/blog/:slug/likes', blogController.toggleLike);

// ============= BLOG RATINGS ROUTES =============

// Get ratings for a blog post (public)
router.get('/blog/:slug/ratings', blogController.getRatings);

// Add or update rating (public)
router.post('/blog/:slug/ratings', blogController.addRating);

// ============= ADMIN BLOG COMMENT MODERATION =============

// Get all comments for a blog post (admin only - includes all statuses)
router.get('/blog/:slug/comments/admin', auth, adminOnly, blogController.getCommentsAdmin);

// Get pending comments (admin only)
router.get('/blog/comments/pending', auth, adminOnly, blogController.getPendingComments);

// Approve comment (admin only)
router.put('/blog/comments/:commentId/approve', auth, adminOnly, blogController.approveComment);

// Reject comment (admin only)
router.put('/blog/comments/:commentId/reject', auth, adminOnly, blogController.rejectComment);

// Delete comment (admin only)
router.delete('/blog/comments/:commentId', auth, adminOnly, blogController.deleteComment);

module.exports = router;
