import React, { useEffect, useState } from 'react';
import { FaStore, FaBullhorn, FaTruck, FaTools, FaArrowRight, FaClock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { jobOpeningApi } from '@/shared/services/api';
import SystemFeedbackModal from '@/shared/components/SystemFeedbackModal';

export default function WorkWithUs() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showPendingModal, setShowPendingModal] = React.useState(false);
  const [openings, setOpenings] = useState([]);
  const [fetching, setFetching] = useState(true);

  // No auth gate on page load — the page is public.
  // Verification is only checked when a user clicks "Apply Now".

  useEffect(() => {
    const fetchOpenings = async () => {
      try {
        const res = await jobOpeningApi.getAll({ status: 'active' });
        setOpenings(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch job openings:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchOpenings();
  }, []);

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  const handleGetStarted = (opening) => {
    // Logged-in users: check if they already hold the role or have a pending application
    if (user) {
      const userRoles = user?.roles || [user?.role || 'customer'];
      if (userRoles.includes(opening.role)) {
        alert(`You already have the ${opening.role.replace('_', ' ')} role and cannot apply for it again.`);
        return;
      }
      if (user.applicationStatus === 'pending' && user.appliedRole === opening.role) {
        alert(`You already have a pending application for the ${opening.role.replace('_', ' ')} role.`);
        return;
      }
    }

    // Everyone (logged-in or not) goes straight to the form
    navigate(`/customer/apply/${opening.role.replace(/_/g, '-')}`, {
      state: { jobId: opening.id, jobTitle: opening.title }
    });
  };

  const getIcon = (role) => {
    switch (role) {
      case 'seller': return <FaStore className="text-4xl text-blue-600" />;
      case 'marketer': return <FaBullhorn className="text-4xl text-purple-600" />;
      case 'delivery_agent': return <FaTruck className="text-4xl text-green-600" />;
      case 'service_provider': return <FaTools className="text-4xl text-amber-600" />;
      default: return <FaUserTie className="text-4xl text-gray-600" />;
    }
  };

  const getBgColor = (role) => {
    switch (role) {
      case 'seller': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'marketer': return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'delivery_agent': return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'service_provider': return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <div className="md:container md:mx-auto px-0 md:px-4 py-8">
      <div className="text-center mb-12 px-4 md:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Work with Comrades360</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {openings.length > 0
            ? "Join our growing community. We are currently looking for new members for the following roles."
            : "We don't have any active openings at the moment. Please check back later!"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
        {openings.map((opening) => (
          <div
            key={opening.id}
            className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-lg flex flex-col items-center text-center h-full ${getBgColor(opening.role)}`}
          >
            <div className="mb-4 p-4 rounded-full bg-white shadow-md">
              {getIcon(opening.role)}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{opening.title}</h3>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              {opening.role.replace('_', ' ')}
            </div>
            <p className="text-gray-600 mb-4 flex-grow text-sm">{opening.description}</p>

            {opening.deadline && (
              <div className="flex items-center gap-1 text-xs text-red-600 mb-4 font-medium">
                <FaClock /> Deadline: {new Date(opening.deadline).toLocaleDateString()}
              </div>
            )}

            <button
              onClick={() => handleGetStarted(opening)}
              className="mt-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 w-full"
            >
              <span>Apply Now</span>
              <FaArrowRight className="text-sm" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-gray-50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-6">Why Join Comrades360?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[
            'Competitive Commissions',
            'Flexible Working Hours',
            'Dedicated Support',
            'Training & Resources',
            'Growing Community',
            'Secure Payments'
          ].map((benefit, index) => (
            <div key={index} className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-10 flex justify-center pb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </button>
      </div>

      <SystemFeedbackModal
        open={showPendingModal}
        onOpenChange={(open) => setShowPendingModal(open)}
        type="warning"
        title="Verification Pending"
        description="Your account verification request was received and it is being worked on. Please wait for approval before applying for new roles."
        confirmLabel="Understood"
        onConfirm={() => setShowPendingModal(false)}
      />
    </div>
  );
}
