import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaStore, FaShareAlt, FaTruck, FaCheckCircle, FaClock, FaTimesCircle, FaTools } from 'react-icons/fa';
import { toast } from 'react-toastify';
import userService from '../../services/userService';

export default function CustomerUpgrade() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const data = await userService.getRoleApplications();
        setApplications(data);
      } catch (error) {
        toast.error('Failed to load role applications');
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FaCheckCircle className="mr-1" /> Approved
        </span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <FaClock className="mr-1" /> Pending
        </span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <FaTimesCircle className="mr-1" /> Rejected
        </span>;
      default:
        return null;
    }
  };

  const handleApply = (role) => {
    // Check if already applied - compare lowercase to ensure consistency
    const roleLower = String(role).toLowerCase();
    const existingApp = applications.find(app => String(app.role).toLowerCase() === roleLower);
    
    if (existingApp) {
      toast.info(`You've already applied to be a ${role}. Status: ${existingApp.status}`);
      return;
    }
    
    console.log(`Navigating to apply-role with role:`, { 
      roleId: role,
      normalizedRole: roleLower,
      currentApplications: applications
    });
    
    navigate(`/apply-role?role=${roleLower}`);
  };

  const roleCards = [
    {
      id: 'seller',
      title: 'Become a Seller',
      description: 'Sell your products on our platform. Requires phone & email verification.',
      icon: <FaStore className="text-2xl text-blue-600 mb-2" />,
      requirements: [
        'Verified email address',
        'Verified phone number',
        'Valid ID document',
        'Bank account details'
      ]
    },
    {
      id: 'marketer',
      title: 'Become a Marketer',
      description: 'Share links and earn commission on every sale.',
      icon: <FaShareAlt className="text-2xl text-green-600 mb-2" />,
      requirements: [
        'Verified email address',
        'Active social media presence',
        'Marketing experience preferred'
      ]
    },
    {
      id: 'delivery_agent',
      title: 'Become a Delivery Agent',
      description: 'Earn money by delivering orders to customers.',
      icon: <FaTruck className="text-2xl text-purple-600 mb-2" />,
      requirements: [
        'Valid driver\'s license',
        'Motorcycle or vehicle',
        'Clean criminal record',
        'Smartphone with GPS'
      ]
    },
    {
      id: 'service_provider',
      title: 'Become a Service Provider',
      description: 'Offer your services to customers on our platform.',
      icon: <FaTools className="text-2xl text-orange-600 mb-2" />,
      requirements: [
        'Verified email address',
        'Service portfolio or certification',
        'Business registration (if applicable)',
        'Valid ID document'
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Your Role</h1>
        <p className="text-gray-600">Choose a role to apply for and unlock new features</p>
      </div>

      {/* Application Status */}
      {applications.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Your Applications</h2>
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium">Application for {app.role}</h3>
                  <p className="text-sm text-gray-500">Submitted on {new Date(app.appliedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(app.status)}
                  <button 
                    onClick={() => navigate(`/application/${app.id}`)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roleCards.map((role) => {
          const roleLower = String(role.id).toLowerCase();
          const hasApplied = applications.some(app => String(app.role).toLowerCase() === roleLower);
          const application = applications.find(app => String(app.role).toLowerCase() === roleLower);
          
          console.log('Rendering role card:', { 
            roleId: role.id, 
            normalizedRole: roleLower,
            hasApplied,
            application
          });
          
          return (
            <div key={role.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-center">
                  {role.icon}
                </div>
                <h3 className="text-xl font-semibold text-center mt-2">{role.title}</h3>
                <p className="text-gray-600 text-sm mt-2 text-center">{role.description}</p>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Requirements:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {role.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  {hasApplied ? (
                    <div className="text-center">
                      <button 
                        disabled
                        className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md cursor-not-allowed"
                      >
                        {application?.status === 'pending' 
                          ? 'Application Pending' 
                          : application?.status === 'approved'
                            ? 'Application Approved!'
                            : 'Application Submitted'}
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: {application?.status || 'Under Review'}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApply(role.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-white shadow rounded-lg p-6 mt-8">
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              question: 'How long does the application process take?',
              answer: 'Most applications are reviewed within 2-3 business days. You\'ll be notified via email once a decision is made.'
            },
            {
              question: 'Can I apply for multiple roles?',
              answer: 'Yes, you can apply for multiple roles, but you can only be approved for one role at a time.'
            },
            {
              question: 'What happens if my application is rejected?',
              answer: 'If your application is rejected, you\'ll receive feedback on why and can reapply after 30 days.'
            }
          ].map((faq, idx) => (
            <div key={idx} className="border-b pb-4 last:border-0 last:pb-0">
              <h3 className="font-medium text-gray-900">{faq.question}</h3>
              <p className="text-gray-600 text-sm mt-1">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
