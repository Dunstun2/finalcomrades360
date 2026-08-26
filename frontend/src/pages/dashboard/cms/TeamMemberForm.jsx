import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaTimes, FaCamera, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { cmsApi } from '../../../services/api';

export default function TeamMemberForm() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const isEdit = !!memberId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    description: '',
    photo: null
  });

  useEffect(() => {
    if (isEdit) {
      fetchTeamMember();
    }
  }, [memberId]);

  const fetchTeamMember = async () => {
    try {
      setLoading(true);
      const response = await cmsApi.getTeamMember(memberId);
      const member = response.data?.team || response.data;
      setFormData({
        name: member.name || '',
        position: member.position || '',
        description: member.description || '',
        photo: null
      });
      if (member.photo) {
        setPhotoPreview(member.photo);
      }
    } catch (err) {
      console.error('Error fetching team member:', err);
      toast.error('Failed to load team member data');
      navigate('/dashboard/cms/about');
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

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setFormData(prev => ({
          ...prev,
          photo: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setFormData(prev => ({
      ...prev,
      photo: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter team member name');
      return;
    }

    if (!formData.position.trim()) {
      toast.error('Please enter team member position');
      return;
    }

    try {
      setSubmitting(true);

      const submitData = {
        name: formData.name.trim(),
        position: formData.position.trim(),
        description: formData.description.trim(),
        photo: formData.photo
      };

      if (isEdit) {
        // Update existing team member
        await cmsApi.updateTeamMember(memberId, submitData);
        toast.success('Team member updated successfully');
      } else {
        // Create new team member
        await cmsApi.createTeamMember(submitData);
        toast.success('Team member added successfully');
      }

      navigate('/dashboard/cms/about');
    } catch (err) {
      console.error('Error saving team member:', err);
      toast.error(err.response?.data?.message || 'Failed to save team member');
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
    <div className="w-full max-w-2xl mx-auto">
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
            {isEdit ? 'Edit' : 'Add'} Team Member
          </h1>
          <p className="text-gray-600 text-lg mt-1">Manage team member information</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Team Member Photo
          </label>

          {photoPreview ? (
            <div className="relative w-48 h-48 mx-auto mb-4">
              <img
                src={photoPreview}
                alt="Team member preview"
                className="w-full h-full object-cover rounded-lg border-2 border-blue-300"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <FaTrash size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 px-4 transition bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FaCamera className="w-8 h-8 text-gray-400 mb-2" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-bold text-gray-900 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter team member's full name"
            maxLength={100}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{formData.name.length}/100 characters</p>
        </div>

        {/* Position */}
        <div>
          <label htmlFor="position" className="block text-sm font-bold text-gray-900 mb-2">
            Position *
          </label>
          <input
            type="text"
            id="position"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            placeholder="e.g., CEO, CTO, Marketing Manager"
            maxLength={100}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{formData.position.length}/100 characters</p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-bold text-gray-900 mb-2">
            Description
          </label>
          <p className="text-gray-600 text-sm mb-3">A brief bio or description of the team member</p>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add a brief description about this team member... (experience, achievements, etc.)"
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FaSave size={18} />
            {submitting ? 'Saving...' : isEdit ? 'Update Team Member' : 'Add Team Member'}
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
