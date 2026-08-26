import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { cmsApi } from '../../../services/api';

export default function AboutPageForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageId, setPageId] = useState(null);
  const [formData, setFormData] = useState({
    brandStory: '',
    vision: '',
    mission: '',
    values: '',
    additionalInfo: ''
  });

  useEffect(() => {
    fetchAboutPageContent();
  }, []);

  const fetchAboutPageContent = async () => {
    try {
      setLoading(true);
      const response = await cmsApi.getAboutPage();
      if (response.data?.content) {
        // The API returns the full AboutPage object in 'content'
        const pageData = response.data.content;
        setPageId(pageData.id);
        setFormData({
          brandStory: pageData.brandStory || '',
          vision: pageData.vision || '',
          mission: pageData.mission || '',
          values: pageData.values || '',
          additionalInfo: pageData.additionalInfo || ''
        });
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Error fetching about page content:', err);
        toast.error('Failed to load about page content');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Allow saving even if all fields are empty (to delete/clear content)
    // Just ensure at least one field has some content for meaningful updates
    const hasContent = formData.brandStory.trim() || formData.vision.trim() || formData.mission.trim() || formData.values.trim() || formData.additionalInfo.trim();

    if (!hasContent && !window.confirm('You are about to clear all information. Continue?')) {
      return;
    }

    try {
      setSubmitting(true);

      if (pageId) {
        // Update existing
        await cmsApi.updateAboutPage({ content: formData });
        toast.success('About page updated successfully');
      } else {
        // Create new
        await cmsApi.createAboutPage({ content: formData });
        toast.success('About page created successfully');
      }

      navigate('/dashboard/cms/about');
    } catch (err) {
      console.error('Error saving about page:', err);
      toast.error(err.response?.data?.message || 'Failed to save about page');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/cms/about')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FaArrowLeft className="text-gray-600" size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {pageId ? 'Edit' : 'Create'} About Page
          </h1>
          <p className="text-gray-600 text-lg mt-1">Share your brand story, vision, mission, and values</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">

        {/* Brand Story */}
        <div>
          <label htmlFor="brandStory" className="block text-sm font-bold text-gray-900 mb-2">
            Brand Story *
          </label>
          <p className="text-gray-600 text-sm mb-3">Share your company's origin, journey, and what drives you</p>
          <textarea
            id="brandStory"
            name="brandStory"
            value={formData.brandStory}
            onChange={handleInputChange}
            placeholder="Tell us your brand story..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">{formData.brandStory.length} characters</p>
        </div>

        {/* Vision */}
        <div>
          <label htmlFor="vision" className="block text-sm font-bold text-gray-900 mb-2">
            Vision
          </label>
          <p className="text-gray-600 text-sm mb-3">What do you aspire to achieve in the future?</p>
          <textarea
            id="vision"
            name="vision"
            value={formData.vision}
            onChange={handleInputChange}
            placeholder="Describe your vision..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">{formData.vision.length} characters</p>
        </div>

        {/* Mission */}
        <div>
          <label htmlFor="mission" className="block text-sm font-bold text-gray-900 mb-2">
            Mission
          </label>
          <p className="text-gray-600 text-sm mb-3">What is your purpose and how do you serve your customers?</p>
          <textarea
            id="mission"
            name="mission"
            value={formData.mission}
            onChange={handleInputChange}
            placeholder="Describe your mission..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">{formData.mission.length} characters</p>
        </div>

        {/* Values */}
        <div>
          <label htmlFor="values" className="block text-sm font-bold text-gray-900 mb-2">
            Values
          </label>
          <p className="text-gray-600 text-sm mb-3">What principles guide your business decisions?</p>
          <textarea
            id="values"
            name="values"
            value={formData.values}
            onChange={handleInputChange}
            placeholder="List your core values (e.g., Integrity, Innovation, Customer Focus)..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">{formData.values.length} characters</p>
        </div>

        {/* Additional Info */}
        <div>
          <label htmlFor="additionalInfo" className="block text-sm font-bold text-gray-900 mb-2">
            Additional Information
          </label>
          <p className="text-gray-600 text-sm mb-3">Any other important information about your company</p>
          <textarea
            id="additionalInfo"
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            placeholder="Add any other details about your company..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">{formData.additionalInfo.length} characters</p>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FaSave size={18} />
            {submitting ? 'Saving...' : pageId ? 'Update About Page' : 'Save About Page'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/cms/about')}
            className="flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-bold"
          >
            <FaTimes size={18} />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
