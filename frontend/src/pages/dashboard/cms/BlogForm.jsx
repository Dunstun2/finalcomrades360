import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  Image as ImageIcon,
  User,
  Clock,
  Tag,
  FileText,
  Globe,
  Star,
  X,
  Link as LinkIcon,
  ExternalLink,
  Bold
} from 'lucide-react';
import api from '../../../shared/services/api';
import { toast } from 'react-toastify';

const BlogForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    featuredImage: '',
    authorName: '',
    authorAvatar: '',
    readingTime: 5,
    summary: '',
    content: '',
    status: 'draft',
    isFeatured: false,
    category: '',
    tags: [],
    metaTitle: '',
    metaDescription: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkData, setLinkData] = useState({ text: '', url: '', type: 'external' });
  const contentTextareaRef = useRef(null);

  const fetchPost = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await api.get(`/cms/blog`);
      const post = response.data.posts?.find(p => p.id === id);

      if (post) {
        setFormData({
          title: post.title || '',
          featuredImage: post.featuredImage || '',
          authorName: post.authorName || '',
          authorAvatar: post.authorAvatar || '',
          readingTime: post.readingTime || 5,
          summary: post.summary || '',
          content: post.content || '',
          status: post.status || 'draft',
          isFeatured: post.isFeatured || false,
          category: post.category || '',
          tags: post.tags || [],
          metaTitle: post.metaTitle || '',
          metaDescription: post.metaDescription || ''
        });
      } else {
        toast.error('Blog post not found');
        navigate('/dashboard/cms/blog');
      }
    } catch (error) {
      console.error('Error fetching blog post:', error);
      toast.error('Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file, field) => {
    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('uploadType', 'blog');

      const response = await api.post('/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData(prev => ({
        ...prev,
        [field]: response.data.url
      }));

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.authorName || !formData.summary || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const submitData = {
        ...formData,
        metaTitle: formData.metaTitle || formData.title,
        metaDescription: formData.metaDescription || formData.summary
      };

      if (isEdit) {
        await api.put(`/cms/blog/${id}`, submitData);
        toast.success('Blog post updated successfully');
      } else {
        await api.post('/cms/blog', submitData);
        toast.success('Blog post created successfully');
      }

      navigate('/dashboard/cms/blog');
    } catch (error) {
      console.error('Error saving blog post:', error);
      toast.error('Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Link insertion handler
  const handleInsertLink = () => {
    if (!linkData.text || !linkData.url) {
      toast.error('Please fill in both link text and URL');
      return;
    }

    // Create the link markup using special delimiters
    // Format: <<LINK:link_text|URL>>
    // This format makes it harder to accidentally break and easier to identify
    const linkMarkup = `<<LINK:${linkData.text}|${linkData.url}>>`;

    // Get current cursor position or append to end
    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = formData.content;

      // Insert link at cursor position
      const newContent =
        currentContent.substring(0, start) +
        linkMarkup +
        currentContent.substring(end);

      setFormData(prev => ({ ...prev, content: newContent }));

      // Set cursor position after inserted link
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + linkMarkup.length, start + linkMarkup.length);
      }, 0);
    } else {
      // Fallback: append to end
      setFormData(prev => ({
        ...prev,
        content: prev.content + (prev.content ? '\n' : '') + linkMarkup
      }));
    }

    // Reset and close dialog
    setLinkData({ text: '', url: '', type: 'external' });
    setShowLinkDialog(false);
    toast.success('Link inserted successfully');
  };

  // Bold text handler
  const handleBoldText = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) {
      toast.error('Unable to access text editor');
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);

    if (!selectedText) {
      toast.info('Please select some text first to make it bold');
      return;
    }

    // Check if the selected text is already bold
    const beforeSelection = formData.content.substring(Math.max(0, start - 2), start);
    const afterSelection = formData.content.substring(end, Math.min(formData.content.length, end + 2));

    const isAlreadyBold = beforeSelection === '**' && afterSelection === '**';

    let newContent;
    let newCursorPos;

    if (isAlreadyBold) {
      // Remove bold formatting
      newContent =
        formData.content.substring(0, start - 2) +
        selectedText +
        formData.content.substring(end + 2);
      newCursorPos = start - 2 + selectedText.length;
      toast.success('Bold formatting removed');
    } else {
      // Add bold formatting
      newContent =
        formData.content.substring(0, start) +
        `**${selectedText}**` +
        formData.content.substring(end);
      newCursorPos = start + 2 + selectedText.length + 2;
      toast.success('Text made bold');
    }

    setFormData(prev => ({ ...prev, content: newContent }));

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Quick link presets for common internal pages
  const quickLinks = [
    { label: 'Become a Seller', url: '/seller/apply', description: 'Apply to sell on Comrades360' },
    { label: 'Join as Delivery Agent', url: '/delivery-agent/apply', description: 'Apply for delivery opportunities' },
    { label: 'Browse Products', url: '/products', description: 'Shop student products' },
    { label: 'Explore Services', url: '/services', description: 'Find student services' },
    { label: 'View All Blogs', url: '/blog', description: 'Read more articles' },
    { label: 'Contact Us', url: '/contact', description: 'Get in touch' },
  ];

  useEffect(() => {
    if (isEdit) {
      fetchPost();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/cms/blog')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? 'Edit Blog Post' : 'Create Blog Post'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEdit ? 'Update your blog post' : 'Create a new blog post for your audience'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {formData.status === 'published' && (
              <button
                onClick={() => window.open(`/blog/${formData.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : (isEdit ? 'Update Post' : 'Create Post')}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter blog post title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary *
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  rows="3"
                  placeholder="Brief summary or excerpt (shown on blog cards)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>

                {/* Formatting Buttons */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleBoldText}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    title="Make selected text bold"
                  >
                    <Bold className="w-4 h-4" />
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinkDialog(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Insert Link
                  </button>
                  <span className="text-xs text-gray-500">Select text and click Bold, or click Insert Link for clickable links</span>
                </div>

                <textarea
                  ref={contentTextareaRef}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows="12"
                  placeholder="Write your blog post content here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base leading-relaxed"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use **text** for bold. Links use format: &lt;&lt;LINK:text|url&gt;&gt;
                </p>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              Featured Image
            </h2>

            <div className="space-y-4">
              {formData.featuredImage && (
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                  <img
                    src={formData.featuredImage}
                    alt="Featured"
                    className="w-full h-auto object-contain max-h-96"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, featuredImage: '' }))}
                    className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transition-colors"
                    title="Remove image"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Featured Image
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0], 'featuredImage')}
                    className="hidden"
                    id="featured-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="featured-upload"
                    className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                  <span className="text-sm text-gray-500">or</span>
                  <input
                    type="url"
                    value={formData.featuredImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                    placeholder="Enter image URL"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Recommended size: 1200x630px for best results</p>
              </div>
            </div>
          </div>

          {/* Author Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Author Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author Name *
                </label>
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                  placeholder="Author display name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reading Time (minutes)
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.readingTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, readingTime: parseInt(e.target.value) || 5 }))}
                    min="1"
                    max="60"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author Avatar
                </label>

                {formData.authorAvatar && (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={formData.authorAvatar}
                      alt="Author avatar preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, authorAvatar: '' }))}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove avatar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0], 'authorAvatar')}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Avatar'}
                  </label>
                  <span className="text-sm text-gray-500">or</span>
                  <input
                    type="url"
                    value={formData.authorAvatar}
                    onChange={(e) => setFormData(prev => ({ ...prev, authorAvatar: e.target.value }))}
                    placeholder="Enter avatar URL"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Publishing & SEO */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Publishing & SEO
            </h2>

            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Technology, Business"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFeatured ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <Star className="w-5 h-5 text-yellow-500 ml-2" />
                    <span className="ml-2 text-sm font-medium text-gray-700">Featured Post</span>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Tag className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* SEO Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="Leave empty to use post title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Description
                  </label>
                  <textarea
                    value={formData.metaDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                    rows="2"
                    placeholder="Leave empty to use summary"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Link Insertion Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <LinkIcon className="w-6 h-6 text-blue-600" />
                Insert Link
              </h3>
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkData({ text: '', url: '', type: 'external' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Link Type Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setLinkData(prev => ({ ...prev, type: 'internal', url: '' }))}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${linkData.type === 'internal'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Internal Link
              </button>
              <button
                type="button"
                onClick={() => setLinkData(prev => ({ ...prev, type: 'external', url: '' }))}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${linkData.type === 'external'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <span className="flex items-center gap-1">
                  External Link
                  <ExternalLink className="w-4 h-4" />
                </span>
              </button>
            </div>

            {/* Internal Link - Quick Links */}
            {linkData.type === 'internal' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Links (Click to select)
                </label>
                <div className="grid gap-2">
                  {quickLinks.map((link) => (
                    <button
                      key={link.url}
                      type="button"
                      onClick={() => setLinkData(prev => ({
                        ...prev,
                        url: link.url,
                        text: prev.text || link.label
                      }))}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${linkData.url === link.url
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="font-medium text-gray-900">{link.label}</div>
                      <div className="text-sm text-gray-600">{link.description}</div>
                      <div className="text-xs text-blue-600 mt-1">{link.url}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or enter custom internal URL:
                  </label>
                  <input
                    type="text"
                    value={linkData.url}
                    onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="/your-page-url"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* External Link Input */}
            {linkData.type === 'external' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={linkData.url}
                  onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the complete URL including https://</p>
              </div>
            )}

            {/* Link Text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Text *
              </label>
              <input
                type="text"
                value={linkData.text}
                onChange={(e) => setLinkData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="e.g., Click here to apply, Learn more, Visit our services"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">The text that users will see and click on</p>
            </div>

            {/* Preview */}
            {linkData.text && linkData.url && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview:
                </label>
                <div className="text-base">
                  This link will appear as: <a href={linkData.url} className="text-blue-600 underline hover:text-blue-800" onClick={(e) => e.preventDefault()}>{linkData.text}</a>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Format: <code className="bg-white px-2 py-1 rounded">&lt;&lt;LINK:{linkData.text}|{linkData.url}&gt;&gt;</code>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkData({ text: '', url: '', type: 'external' });
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkData.text || !linkData.url}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogForm;