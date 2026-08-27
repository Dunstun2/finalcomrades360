import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SEO from '../../shared/components/SEO';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Star,
  Eye,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Tag,
  ChevronRight,
  Instagram,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import api from '../../shared/services/api';
import { toast } from 'react-toastify';

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Engagement states
  const [comments, setComments] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [rating, setRating] = useState({ average: 0, total: 0, userRating: null });
  const [hoverRating, setHoverRating] = useState(0);

  // Form states
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showThankYouDialog, setShowThankYouDialog] = useState(false);

  // Autofill user info on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.name) setCommentAuthor(user.name);
        if (user.email) setCommentEmail(user.email);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  const formatContent = (content) => {
    if (!content) return '';

    // If content already has HTML tags, return as is
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return content;
    }

    let processedContent = content;

    // Convert new format links <<LINK:text|URL>> to HTML links
    processedContent = processedContent.replace(/<<LINK:([^|]+)\|([^>]+)>>/g, (match, text, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // Also support old markdown-style links [text](url) for backward compatibility
    processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Convert **bold text** to <strong> tags
    processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert plain text to HTML with proper headings and paragraphs
    const lines = processedContent.split('\n');
    let html = '';
    let currentParagraph = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        if (currentParagraph) {
          html += `<p>${currentParagraph}</p>\n`;
          currentParagraph = '';
        }
        continue;
      }

      // Check if the ENTIRE line is bold (heading) vs just some words are bold (inline formatting)
      // A line is a heading if it starts with <strong> and ends with </strong> with nothing else
      const startsWithStrong = line.startsWith('<strong>');
      const endsWithStrong = line.endsWith('</strong>');
      const hasMultipleStrong = (line.match(/<strong>/g) || []).length > 1;
      const isEntireLineBold = startsWithStrong && endsWithStrong && !hasMultipleStrong;

      // Check if line is a heading (but NOT if it just has some bold words inline)
      const isHeading = isEntireLineBold ||
        // Ends with question mark and relatively short (no bold tags or entire line bold)
        (line.endsWith('?') && line.length < 150 && (!line.includes('<strong>') || isEntireLineBold)) ||
        // Ends with colon (no bold tags or entire line bold)
        (line.endsWith(':') && line.length < 150 && (!line.includes('<strong>') || isEntireLineBold)) ||
        // Starts with common heading words (entire line is bold)
        (isEntireLineBold && /^<strong>(What|Why|How|When|Where|Who|Introduction|Conclusion|Overview|Summary|Frequently Asked Questions|Start|Turn|Build|Ready|Looking)/i.test(line) && line.length < 150);

      if (isHeading) {
        // Close any open paragraph
        if (currentParagraph) {
          html += `<p>${currentParagraph}</p>\n`;
          currentParagraph = '';
        }
        // Add as heading
        html += `<h3>${line}</h3>\n`;
      } else {
        // Add to current paragraph
        if (currentParagraph) {
          currentParagraph += ' ';
        }
        currentParagraph += line;
      }
    }

    // Close final paragraph if exists
    if (currentParagraph) {
      html += `<p>${currentParagraph}</p>\n`;
    }

    return html;
  };

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/cms/blog/${slug}`);

      if (response.data.success) {
        setPost(response.data.post);

        // Fetch engagement data
        fetchComments();
        fetchLikes();
        fetchRatings();

        // Fetch related posts
        if (response.data.post.category) {
          try {
            const relatedResponse = await api.get(`/cms/blog?category=${response.data.post.category}&limit=3&status=published`);
            const related = relatedResponse.data.posts?.filter(p => p.id !== response.data.post.id) || [];
            setRelatedPosts(related.slice(0, 3));
          } catch (error) {
            console.error('Error fetching related posts:', error);
          }
        }
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching blog post:', error);
      if (error.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/cms/blog/${slug}/comments`);
      if (response.data.success) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchLikes = async () => {
    try {
      const response = await api.get(`/cms/blog/${slug}/likes`);
      if (response.data.success) {
        setLikeCount(response.data.likeCount || 0);
        setUserLiked(response.data.userLiked || false);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const fetchRatings = async () => {
    try {
      const response = await api.get(`/cms/blog/${slug}/ratings`);
      if (response.data.success) {
        setRating({
          average: response.data.averageRating || 0,
          total: response.data.totalRatings || 0,
          userRating: response.data.userRating || null
        });
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const handleLike = async () => {
    try {
      const response = await api.post(`/cms/blog/${slug}/likes`);
      if (response.data.success) {
        setUserLiked(response.data.liked);
        setLikeCount(response.data.likeCount);
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleRating = async (ratingValue) => {
    try {
      const response = await api.post(`/cms/blog/${slug}/ratings`, { rating: ratingValue });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchRatings(); // Refresh ratings
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!commentText.trim() || !commentAuthor.trim()) {
      toast.error('Please fill in your name and comment');
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await api.post(`/cms/blog/${slug}/comments`, {
        content: commentText,
        authorName: commentAuthor,
        authorEmail: commentEmail
      });

      if (response.data.success) {
        setShowThankYouDialog(true);
        setCommentText('');
        setCommentAuthor('');
        setCommentEmail('');
        // Don't refresh comments since it won't show until approved
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shareUrl = window.location.href;
  const shareTitle = post?.title || 'Check out this blog post';

  const handleShare = (platform) => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
      return;
    }

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Eye className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  // Article JSON-LD
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: post.featuredImage || undefined,
    author: post.authorName ? { '@type': 'Person', name: post.authorName } : undefined,
    datePublished: post.publishedAt || post.createdAt,
    description: post.metaDescription || post.summary,
    url: shareUrl
  };

  return (
    <>
      <SEO title={(post.metaTitle || post.title) + ' - Comrades360 Blog'} description={post.metaDescription || post.summary} image={post.featuredImage} url={shareUrl} schema={articleSchema} />

      <div className="min-h-screen bg-white">
        {/* Article Header */}
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header className="mb-8">
            {/* Back Button, Category & Featured Badge */}
            <div className="flex items-center gap-3 mb-4">
              <Link to="/blog" className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
                Blog
              </Link>
              {post.category && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {post.category}
                </span>
              )}
              {post.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white text-sm font-bold rounded-full">
                  <Star className="w-3 h-3 fill-current" />
                  FEATURED
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Summary */}
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              {post.summary}
            </p>

            {/* Author & Meta Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-8 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  {post.authorAvatar ? (
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {post.authorName?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{post.authorName}</div>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-7 bg-gray-300 flex-shrink-0"></div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{post.readingTime} min read</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span>{post.viewCount || 0} views</span>
                  </div>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">Share:</span>
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Share on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Share on Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Copy link"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="mb-8">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-xl shadow-lg"
              />
            </div>
          )}

          {/* Article Content */}
          <div className="prose prose-lg max-w-none mb-12">
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
            />
          </div>

          {/* Social Engagement Bar */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <span>{post.viewCount || 0} views</span>
                <span>{comments.length} comments</span>
                <span>{likeCount} likes</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: post.title,
                        text: post.summary,
                        url: window.location.href
                      });
                    }
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Copy link"
                >
                  <LinkIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLike}
                  className={`p-2 rounded-full transition-colors ${userLiked
                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  title={userLiked ? 'Unlike' : 'Like'}
                >
                  <svg className="w-6 h-6" fill={userLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-gray-900 text-white rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Comments ({comments.length})</h3>
              <div className="flex items-center gap-2 text-gray-400">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(rating.average) ? 'text-yellow-400' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm">
                  {rating.total > 0 ? `${rating.average} (${rating.total} ratings)` : 'No ratings yet'}
                </span>
              </div>
            </div>

            {/* Add Rating */}
            <div className="mb-6 pb-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {rating.userRating ? `Your rating: ${rating.userRating}/5` : 'Add a rating'}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRating(star)}
                      className={`transition-colors ${star <= (hoverRating || rating.userRating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-500 hover:text-yellow-400'
                        }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Comment Input */}
            <form onSubmit={handleCommentSubmit}>
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your name *"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Your email (optional)"
                    value={commentEmail}
                    onChange={(e) => setCommentEmail(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <textarea
                  placeholder="Write a comment..."
                  rows="4"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="mt-8 space-y-6">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="border-t border-gray-700 pt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {comment.authorName?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{comment.authorName}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 ml-6 space-y-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                  {reply.authorName?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-white text-sm">{reply.authorName}</span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(reply.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Tags:</span>
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-gray-200 bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    to={`/blog/${relatedPost.slug}`}
                    className="group block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative h-40 bg-gradient-to-br from-blue-50 to-indigo-100">
                      {relatedPost.featuredImage ? (
                        <img
                          src={relatedPost.featuredImage}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-4xl font-bold text-gray-300">
                            {relatedPost.title.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {relatedPost.summary}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(relatedPost.publishedAt || relatedPost.createdAt)}</span>
                        <span>{relatedPost.readingTime} min read</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-8">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View All Articles
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Footer Section */}
        <footer className="bg-gray-900 text-gray-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* About Section */}
              <div>
                <h3 className="text-white text-lg font-bold mb-4">About Comrades360</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Empowering university students in Kenya with opportunities to earn, learn, and grow through our innovative marketplace platform.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://facebook.com/comrades360"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a
                    href="https://twitter.com/comrades360"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a
                    href="https://instagram.com/comrades360"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://linkedin.com/company/comrades360"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-white text-lg font-bold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                  </li>
                  <li>
                    <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
                  </li>
                  <li>
                    <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
                  </li>
                  <li>
                    <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
                  </li>
                  <li>
                    <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
                  </li>
                </ul>
              </div>

              {/* Popular Tags */}
              <div>
                <h3 className="text-white text-lg font-bold mb-4">Popular Topics</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/blog" className="hover:text-white transition-colors">Student Entrepreneurship</Link>
                  </li>
                  <li>
                    <Link to="/blog" className="hover:text-white transition-colors">Campus Life</Link>
                  </li>
                  <li>
                    <Link to="/blog" className="hover:text-white transition-colors">Career Tips</Link>
                  </li>
                  <li>
                    <Link to="/blog" className="hover:text-white transition-colors">Business Ideas</Link>
                  </li>
                  <li>
                    <Link to="/blog" className="hover:text-white transition-colors">Student Opportunities</Link>
                  </li>
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-white text-lg font-bold mb-4">Get In Touch</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <a href="mailto:info@comrades360.shop" className="hover:text-white transition-colors">
                      info@comrades360.shop
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <a href="tel:+254757588395" className="hover:text-white transition-colors">
                      +254 757 588 395
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Nairobi, Kenya</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-gray-800">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
                <p>© {new Date().getFullYear()} Comrades360. All rights reserved.</p>
                <div className="flex items-center gap-6">
                  <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                  <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                  <Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Thank You Dialog */}
      {showThankYouDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-fadeIn">
            <div className="text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You for Your Comment!
              </h3>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                Your comment has been submitted successfully and is currently under review.
                It will appear on the blog once approved by our team.
              </p>

              {/* Close Button */}
              <button
                onClick={() => setShowThankYouDialog(false)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Clean Blog Content Styling */
        .article-content {
          color: #1a202c;
          line-height: 1.75;
          font-size: 1.125rem;
          white-space: pre-wrap; /* Preserve line breaks and spaces */
        }

        /* Fade-in animation for dialog */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        /* Headings */
        .article-content h1 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111827;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.2;
          white-space: normal;
        }

        .article-content h2 {
          font-size: 2rem;
          font-weight: 800;
          color: #111827;
          margin-top: 1.25rem;
          margin-bottom: 0.625rem;
          line-height: 1.3;
          white-space: normal;
        }

        .article-content h3 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
          white-space: normal;
        }

        .article-content h4 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-top: 0.875rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
          white-space: normal;
        }

        .article-content h5 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin-top: 0.875rem;
          margin-bottom: 0.5rem;
          white-space: normal;
        }

        .article-content h6 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
          margin-top: 0.875rem;
          margin-bottom: 0.5rem;
          white-space: normal;
        }

        /* Paragraphs - reduced spacing */
        .article-content p {
          margin-bottom: 0.75rem;
          line-height: 1.8;
          color: #374151;
          white-space: normal;
        }

        /* First paragraph has no top margin */
        .article-content > p:first-child,
        .article-content h1:first-child,
        .article-content h2:first-child {
          margin-top: 0;
        }

        /* Strong and emphasis */
        .article-content strong {
          font-weight: 700;
          color: #111827;
        }

        .article-content em {
          font-style: italic;
        }

        /* Links */
        .article-content a {
          color: #2563eb;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .article-content a:hover {
          color: #1d4ed8;
        }

        /* Lists */
        .article-content ul,
        .article-content ol {
          margin-bottom: 1.5rem;
          padding-left: 1.75rem;
          white-space: normal;
        }

        .article-content ul {
          list-style-type: disc;
        }

        .article-content ol {
          list-style-type: decimal;
        }

        .article-content li {
          margin-bottom: 0.625rem;
          line-height: 1.75;
          color: #374151;
        }

        .article-content li p {
          margin-bottom: 0.5rem;
        }

        /* Nested lists */
        .article-content ul ul,
        .article-content ol ul {
          list-style-type: circle;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .article-content ol ol,
        .article-content ul ol {
          list-style-type: lower-alpha;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        /* Blockquotes */
        .article-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1.25rem;
          margin: 2rem 0;
          font-style: italic;
          color: #4b5563;
          background-color: #f8fafc;
          padding: 1.25rem 1.25rem 1.25rem 1.5rem;
          border-radius: 0.375rem;
          white-space: normal;
        }

        .article-content blockquote p {
          margin-bottom: 0.75rem;
        }

        .article-content blockquote p:last-child {
          margin-bottom: 0;
        }

        /* Images */
        .article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 2rem 0;
          display: block;
        }

        /* Code */
        .article-content code {
          background-color: #f3f4f6;
          color: #dc2626;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: 'Courier New', Courier, monospace;
          white-space: pre-wrap;
        }

        .article-content pre {
          background-color: #1f2937;
          color: #f3f4f6;
          padding: 1.25rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 2rem 0;
          white-space: pre;
        }

        .article-content pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: 0.9375rem;
        }

        /* Tables */
        .article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
          border: 1px solid #e5e7eb;
          white-space: normal;
        }

        .article-content thead {
          background-color: #f9fafb;
        }

        .article-content th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e5e7eb;
          color: #111827;
        }

        .article-content td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }

        .article-content tbody tr:hover {
          background-color: #f9fafb;
        }

        /* Horizontal rule */
        .article-content hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 2.5rem 0;
        }

        /* Utility classes */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .article-content {
            font-size: 1rem;
          }

          .article-content h1 {
            font-size: 2rem;
          }

          .article-content h2 {
            font-size: 1.625rem;
          }

          .article-content h3 {
            font-size: 1.375rem;
          }

          .article-content h4 {
            font-size: 1.25rem;
          }

          .article-content h5 {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </>
  );
};

export default BlogPost;