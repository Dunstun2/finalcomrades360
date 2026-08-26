// backend/controllers/blogController.js
const { BlogPost, BlogComment, BlogLike, BlogRating, User } = require('../database/models.registry');
const { Op } = require('sequelize');

// Helper to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// @desc Get all blog posts (public)
// @route GET /api/cms/blog
// @access Public
exports.getAllBlogs = async (req, res) => {
  try {
    const { status, category, featured, search, limit = 20, page = 1 } = req.query;

    const where = {};

    // Admin sees all posts by default, can filter by status
    // Public only sees published posts
    const isAdmin = req.user && ['admin', 'superadmin', 'super_admin'].includes(req.user.role);

    console.log('[Blog API] User:', req.user?.email, 'Role:', req.user?.role, 'isAdmin:', isAdmin);

    if (!isAdmin) {
      // Public users only see published posts
      where.status = 'published';
    } else if (status) {
      // Admin filtered by specific status
      where.status = status;
    }
    // If admin and no status filter, show all posts (no status filter applied)

    if (category) {
      where.category = category;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } },
        { authorName: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: posts, count } = await BlogPost.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['publishedAt', 'DESC'], ['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      posts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[blog] Get all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog posts',
      error: error.message
    });
  }
};

// @desc Get single blog post
// @route GET /api/cms/blog/:slugOrId
// @access Public
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if it's a UUID (old cache) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const post = await BlogPost.findOne({
      where: isUUID ? { id: slug } : { slug },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Only allow published posts for non-admin users
    if (post.status !== 'published' &&
      (!req.user || !['admin', 'superadmin', 'super_admin'].includes(req.user.role))) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Increment view count
    await post.increment('viewCount');

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('[blog] Get by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog post',
      error: error.message
    });
  }
};

// @desc Create blog post
// @route POST /api/cms/blog
// @access Admin
exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      featuredImage,
      authorName,
      authorAvatar,
      readingTime,
      summary,
      content,
      status,
      isFeatured,
      category,
      tags,
      metaTitle,
      metaDescription
    } = req.body;

    if (!title || !authorName || !summary || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title, author name, summary, and content are required'
      });
    }

    // Generate slug
    let slug = generateSlug(title);

    // Ensure slug is unique
    let existingPost = await BlogPost.findOne({ where: { slug } });
    let counter = 1;
    while (existingPost) {
      slug = `${generateSlug(title)}-${counter}`;
      existingPost = await BlogPost.findOne({ where: { slug } });
      counter++;
    }

    const publishedAt = status === 'published' ? new Date() : null;

    const post = await BlogPost.create({
      title,
      slug,
      featuredImage,
      authorName,
      authorAvatar,
      readingTime: readingTime || 5,
      summary,
      content,
      status: status || 'draft',
      publishedAt,
      isFeatured: isFeatured || false,
      category,
      tags: tags || [],
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || summary,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      post
    });
  } catch (error) {
    console.error('[blog] Create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blog post',
      error: error.message
    });
  }
};

// @desc Update blog post
// @route PUT /api/cms/blog/:id
// @access Admin
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const {
      title,
      featuredImage,
      authorName,
      authorAvatar,
      readingTime,
      summary,
      content,
      status,
      isFeatured,
      category,
      tags,
      metaTitle,
      metaDescription
    } = req.body;

    // Update slug if title changed
    if (title && title !== post.title) {
      let newSlug = generateSlug(title);
      let existingPost = await BlogPost.findOne({
        where: {
          slug: newSlug,
          id: { [Op.ne]: id }
        }
      });
      let counter = 1;
      while (existingPost) {
        newSlug = `${generateSlug(title)}-${counter}`;
        existingPost = await BlogPost.findOne({
          where: {
            slug: newSlug,
            id: { [Op.ne]: id }
          }
        });
        counter++;
      }
      post.slug = newSlug;
    }

    // Update publishedAt if status changed to published
    if (status === 'published' && post.status !== 'published') {
      post.publishedAt = new Date();
    }

    // Update fields
    if (title) post.title = title;
    if (featuredImage !== undefined) post.featuredImage = featuredImage;
    if (authorName) post.authorName = authorName;
    if (authorAvatar !== undefined) post.authorAvatar = authorAvatar;
    if (readingTime !== undefined) post.readingTime = readingTime;
    if (summary) post.summary = summary;
    if (content) post.content = content;
    if (status) post.status = status;
    if (isFeatured !== undefined) post.isFeatured = isFeatured;
    if (category !== undefined) post.category = category;
    if (tags !== undefined) post.tags = tags;
    if (metaTitle !== undefined) post.metaTitle = metaTitle;
    if (metaDescription !== undefined) post.metaDescription = metaDescription;

    post.updatedBy = req.user.id;

    await post.save();

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      post
    });
  } catch (error) {
    console.error('[blog] Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blog post',
      error: error.message
    });
  }
};

// @desc Delete blog post
// @route DELETE /api/cms/blog/:id
// @access Admin
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    await post.destroy();

    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('[blog] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog post',
      error: error.message
    });
  }
};

// ============================================
// COMMENTS
// ============================================

// @desc Get comments for a blog post
// @route GET /api/cms/blog/:slugOrId/comments
// @access Public
exports.getComments = async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if it's a UUID (old cache) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const post = await BlogPost.findOne({
      where: isUUID ? { id: slug } : { slug }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const comments = await BlogComment.findAll({
      where: {
        blogPostId: post.id,
        status: 'approved',
        parentId: null // Only get top-level comments
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: BlogComment,
          as: 'replies',
          where: { status: 'approved' },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'profileImage']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error('[blog] Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

// @desc Create a comment
// @route POST /api/cms/blog/:slug/comments
// @access Public
exports.createComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { content, authorName, authorEmail, parentId } = req.body;

    if (!content || !authorName) {
      return res.status(400).json({
        success: false,
        message: 'Content and author name are required'
      });
    }

    const post = await BlogPost.findOne({ where: { slug } });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if parent comment exists (for replies)
    if (parentId) {
      const parentComment = await BlogComment.findByPk(parentId);
      if (!parentComment || parentComment.blogPostId !== post.id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment'
        });
      }
    }

    const comment = await BlogComment.create({
      blogPostId: post.id,
      userId: req.user?.id || null,
      authorName,
      authorEmail,
      content,
      parentId: parentId || null,
      status: 'pending' // Require admin approval
    });

    res.status(201).json({
      success: true,
      message: 'Comment submitted for approval. It will appear after admin review.',
      comment
    });
  } catch (error) {
    console.error('[blog] Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post comment',
      error: error.message
    });
  }
};

// ============================================
// LIKES
// ============================================

// @desc Get like count and user's like status
// @route GET /api/cms/blog/:slug/likes
// @access Public
exports.getLikes = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ where: { slug } });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const likeCount = await BlogLike.count({
      where: { blogPostId: post.id }
    });

    let userLiked = false;
    if (req.user) {
      const userLike = await BlogLike.findOne({
        where: {
          blogPostId: post.id,
          userId: req.user.id
        }
      });
      userLiked = !!userLike;
    }

    res.json({
      success: true,
      likeCount,
      userLiked
    });
  } catch (error) {
    console.error('[blog] Get likes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch likes',
      error: error.message
    });
  }
};

// @desc Toggle like on a blog post
// @route POST /api/cms/blog/:slug/likes
// @access Public
exports.toggleLike = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ where: { slug } });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Check if already liked
    const existingLike = await BlogLike.findOne({
      where: {
        blogPostId: post.id,
        [Op.or]: [
          userId ? { userId } : {},
          { ipAddress }
        ]
      }
    });

    if (existingLike) {
      // Unlike
      await existingLike.destroy();

      const newCount = await BlogLike.count({
        where: { blogPostId: post.id }
      });

      return res.json({
        success: true,
        message: 'Like removed',
        liked: false,
        likeCount: newCount
      });
    } else {
      // Like
      await BlogLike.create({
        blogPostId: post.id,
        userId,
        ipAddress,
        userAgent
      });

      const newCount = await BlogLike.count({
        where: { blogPostId: post.id }
      });

      return res.json({
        success: true,
        message: 'Post liked',
        liked: true,
        likeCount: newCount
      });
    }
  } catch (error) {
    console.error('[blog] Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

// ============================================
// RATINGS
// ============================================

// @desc Get ratings for a blog post
// @route GET /api/cms/blog/:slug/ratings
// @access Public
exports.getRatings = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await BlogPost.findOne({ where: { slug } });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const ratings = await BlogRating.findAll({
      where: { blogPostId: post.id },
      attributes: ['rating']
    });

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    // Check if current user has rated
    let userRating = null;
    if (req.user) {
      const rating = await BlogRating.findOne({
        where: {
          blogPostId: post.id,
          userId: req.user.id
        }
      });
      userRating = rating ? rating.rating : null;
    }

    res.json({
      success: true,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings,
      userRating
    });
  } catch (error) {
    console.error('[blog] Get ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings',
      error: error.message
    });
  }
};

// @desc Add or update rating
// @route POST /api/cms/blog/:slug/ratings
// @access Public
exports.addRating = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const post = await BlogPost.findOne({ where: { slug } });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Check if user has already rated
    const existingRating = await BlogRating.findOne({
      where: {
        blogPostId: post.id,
        [Op.or]: [
          userId ? { userId } : {},
          { ipAddress }
        ]
      }
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      await existingRating.save();

      return res.json({
        success: true,
        message: 'Rating updated successfully',
        rating: existingRating.rating
      });
    } else {
      // Create new rating
      const newRating = await BlogRating.create({
        blogPostId: post.id,
        userId,
        rating,
        ipAddress
      });

      return res.status(201).json({
        success: true,
        message: 'Rating added successfully',
        rating: newRating.rating
      });
    }
  } catch (error) {
    console.error('[blog] Add rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add rating',
      error: error.message
    });
  }
};


// ============================================
// ADMIN COMMENT MODERATION
// ============================================

// @desc Get all comments for a blog post (admin - includes all statuses)
// @route GET /api/cms/blog/:slugOrId/comments/admin
// @access Admin
exports.getCommentsAdmin = async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if it's a UUID (old cache) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const post = await BlogPost.findOne({
      where: isUUID ? { id: slug } : { slug }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    const comments = await BlogComment.findAll({
      where: {
        blogPostId: post.id,
        parentId: null // Only get top-level comments
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: BlogComment,
          as: 'replies',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'profileImage']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error('[blog] Get admin comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

// @desc Get pending comments
// @route GET /api/cms/blog/comments/pending
// @access Admin
exports.getPendingComments = async (req, res) => {
  try {
    const comments = await BlogComment.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: BlogPost,
          as: 'blogPost',
          attributes: ['id', 'title', 'slug']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error('[blog] Get pending comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending comments',
      error: error.message
    });
  }
};

// @desc Approve comment
// @route PUT /api/cms/blog/comments/:commentId/approve
// @access Admin
exports.approveComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await BlogComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    comment.status = 'approved';
    await comment.save();

    res.json({
      success: true,
      message: 'Comment approved successfully',
      comment
    });
  } catch (error) {
    console.error('[blog] Approve comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve comment',
      error: error.message
    });
  }
};

// @desc Reject comment
// @route PUT /api/cms/blog/comments/:commentId/reject
// @access Admin
exports.rejectComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await BlogComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    comment.status = 'rejected';
    await comment.save();

    res.json({
      success: true,
      message: 'Comment rejected successfully',
      comment
    });
  } catch (error) {
    console.error('[blog] Reject comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject comment',
      error: error.message
    });
  }
};

// @desc Delete/reject comment
// @route DELETE /api/cms/blog/comments/:commentId
// @access Admin
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await BlogComment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await comment.destroy();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('[blog] Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};
