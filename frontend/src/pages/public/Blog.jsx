import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Search,
  Calendar,
  Clock,
  User,
  Star,
  Filter,
  ChevronRight,
  Eye,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import api from '../../shared/services/api';

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    featured: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        status: 'published', // Only show published posts
        ...filters
      });

      const response = await api.get(`/cms/blog?${params}`);
      setPosts(response.data.posts || []);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [pagination.page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUniqueCategories = () => {
    const categories = posts.map(post => post.category).filter(Boolean);
    return [...new Set(categories)];
  };

  const getUniqueTags = () => {
    const tags = posts.flatMap(post => {
      // Handle tags that might be strings, arrays, or null
      if (!post.tags) return [];
      if (Array.isArray(post.tags)) return post.tags;
      if (typeof post.tags === 'string') {
        try {
          const parsed = JSON.parse(post.tags);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    });
    return [...new Set(tags.filter(Boolean))].slice(0, 10);
  };

  const BlogCard = ({ post }) => (
    <Link
      to={`/blog/${post.slug}`}
      className="group block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Featured Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100">
        {post.featuredImage ? (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl font-bold text-gray-300">
              {post.title.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Featured Badge */}
        {post.isFeatured && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
              <Star className="w-3 h-3 fill-current" />
              FEATURED
            </span>
          </div>
        )}

        {/* Category Badge */}
        {post.category && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              {post.category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Author & Reading Time */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                {post.authorName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">{post.authorName}</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{post.readingTime} min read</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {post.title}
        </h3>

        {/* Summary */}
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
          {post.summary}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span>{post.viewCount || 0}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <>
      <Helmet>
        <title>Comrades360 Blog | Student Success, Business & Opportunities in Kenya</title>
        <meta
          name="description"
          content="Explore insights, tips, opportunities, and resources for university students in Kenya. Discover student business ideas, career advice, campus life tips, and more with Comrades360."
        />
        <meta
          name="keywords"
          content="Comrades360 blog, student life in Kenya, university student tips, student entrepreneurship Kenya, business ideas for students, jobs for university students, student opportunities Kenya, how to earn money as a student, campus life Kenya, career tips for students, digital skills for students, student marketplace Kenya"
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Our Blog
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Discover insights, tips, and stories from the Comrades360 community
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Tags Row */}
          {getUniqueTags().length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3">
                {getUniqueTags().map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Posts</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search articles..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter</label>
                <select
                  value={filters.featured}
                  onChange={(e) => handleFilterChange('featured', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Posts</option>
                  <option value="true">Featured Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Blog Posts */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-600">Try adjusting your search filters or check back later for new content.</p>
            </div>
          ) : (
            <>
              {/* Featured Posts Section */}
              {posts.some(post => post.isFeatured) && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                    Featured Articles
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {posts.filter(post => post.isFeatured).slice(0, 3).map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {/* All Posts Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {filters.search || filters.category ? 'Search Results' : 'Latest Articles'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(pagination.pages)].map((_, i) => {
                        const page = i + 1;
                        const isActive = page === pagination.page;
                        const showPage = page === 1 || page === pagination.pages ||
                          (page >= pagination.page - 1 && page <= pagination.page + 1);

                        if (!showPage) {
                          if (page === pagination.page - 2 || page === pagination.page + 2) {
                            return <span key={page} className="px-2 text-gray-500">...</span>;
                          }
                          return null;
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => setPagination(prev => ({ ...prev, page }))}
                            className={`px-4 py-2 rounded-lg transition-colors ${isActive
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Section */}
        <footer className="bg-gray-900 text-gray-300 mt-16">
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

              {/* Categories */}
              <div>
                <h3 className="text-white text-lg font-bold mb-4">Blog Categories</h3>
                <ul className="space-y-2 text-sm">
                  {getUniqueCategories().slice(0, 6).map(category => (
                    <li key={category}>
                      <button
                        onClick={() => handleFilterChange('category', category)}
                        className="hover:text-white transition-colors text-left"
                      >
                        {category}
                      </button>
                    </li>
                  ))}
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
    </>
  );
};

export default Blog;