import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaUsers, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { cmsApi } from '../../../services/api';

export default function AboutPageManagement() {
  const navigate = useNavigate();
  const [aboutPageContent, setAboutPageContent] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAboutPageContent();
  }, []);

  const fetchAboutPageContent = async () => {
    try {
      setLoading(true);
      // Fetch about page content
      const contentResponse = await cmsApi.getAboutPage();
      setAboutPageContent(contentResponse.data?.content || null);

      // Fetch team members
      const teamResponse = await cmsApi.getTeamMembers();
      setTeamMembers(teamResponse.data?.team || []);
    } catch (err) {
      console.error('Error fetching about page content:', err);
      if (err.response?.status === 404) {
        setAboutPageContent(null);
      } else {
        setError('Failed to load about page content');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeamMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;

    try {
      await cmsApi.deleteTeamMember(memberId);
      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
      toast.success('Team member deleted successfully');
    } catch (err) {
      console.error('Error deleting team member:', err);
      toast.error('Failed to delete team member');
    }
  };

  const handleDeleteAboutPage = async () => {
    if (!window.confirm('Are you sure you want to delete the about page content?')) return;

    try {
      await cmsApi.deleteAboutPage();
      setAboutPageContent(null);
      toast.success('About page content deleted successfully');
    } catch (err) {
      console.error('Error deleting about page:', err);
      toast.error('Failed to delete about page content');
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
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/cms')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FaArrowLeft className="text-gray-600" size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">About Page</h1>
            <p className="text-gray-600 text-lg mt-1">Manage your company information and team</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* About Page Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Company Information</h2>
          <button
            onClick={() => navigate('/dashboard/cms/about/form')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <FaPlus size={18} />
            {aboutPageContent ? 'Edit' : 'Create'} About Page
          </button>
        </div>

        {aboutPageContent ? (
          <div className="space-y-6">
            {/* Company Story */}
            {aboutPageContent.brandStory && (
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Brand Story</h3>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-4">{aboutPageContent.brandStory}</p>
              </div>
            )}

            {/* Vision */}
            {aboutPageContent.vision && (
              <div className="border-l-4 border-green-600 pl-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Vision</h3>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-4">{aboutPageContent.vision}</p>
              </div>
            )}

            {/* Mission */}
            {aboutPageContent.mission && (
              <div className="border-l-4 border-purple-600 pl-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Mission</h3>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-4">{aboutPageContent.mission}</p>
              </div>
            )}

            {/* Values */}
            {aboutPageContent.values && (
              <div className="border-l-4 border-orange-600 pl-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Values</h3>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-4">{aboutPageContent.values}</p>
              </div>
            )}

            {/* Additional Info */}
            {aboutPageContent.additionalInfo && (
              <div className="border-l-4 border-pink-600 pl-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Additional Information</h3>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-4">{aboutPageContent.additionalInfo}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => navigate('/dashboard/cms/about/form')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
              >
                <FaEdit size={18} />
                Edit Details
              </button>
              <button
                onClick={handleDeleteAboutPage}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold"
              >
                <FaTrash size={18} />
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No about page content created yet</p>
            <button
              onClick={() => navigate('/dashboard/cms/about/form')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <FaPlus size={20} />
              Create About Page
            </button>
          </div>
        )}
      </div>

      {/* Team Members Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaUsers className="text-blue-600 text-2xl" />
            <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          </div>
          <button
            onClick={() => navigate('/dashboard/cms/about/team/new')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            <FaPlus size={18} />
            Add Team Member
          </button>
        </div>

        {teamMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Team Member Image */}
                {member.photo && (
                  <div className="w-full h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Team Member Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-sm font-semibold text-blue-600 mb-2">{member.position}</p>
                  {member.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{member.description}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/dashboard/cms/about/team/${member.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors text-sm font-semibold"
                    >
                      <FaEdit size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTeamMember(member.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-sm font-semibold"
                    >
                      <FaTrash size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaUsers className="mx-auto text-gray-300 text-4xl mb-3" />
            <p className="text-gray-500 mb-4">No team members added yet</p>
            <button
              onClick={() => navigate('/dashboard/cms/about/team/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              <FaPlus size={20} />
              Add First Team Member
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
