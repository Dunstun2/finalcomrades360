import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';


export default function PendingApplications() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filterStatus] = useState('pending');


  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadApplications = async () => {
    try {
      setLoading(true);
      resetAlerts();
      // Fetch all role applications with user details
      console.log('Fetching role applications...');

      // Use the roles endpoint (mapped to roleApplicationRoutes in the backend)
      let response;
      try {
        response = await api.get('/role-applications', {
          params: { status: 'pending' }
        });
        console.log('API Response Status:', response.status);
        console.log('API Response Data:', response.data); // Log the response data for debugging
      } catch (error) {
        console.error('Error fetching role applications:', error);
        // If the first attempt fails, try the admin endpoint
        if (error.response?.status === 404) {
          console.log('Trying admin endpoint...');
          response = await api.get('/admin/roles', {
            params: { status: 'pending' }
          });
          console.log('Admin API Response Status:', response.status);
        } else {
          console.error('Error details:', error.response?.data || error.message);
          throw error; // Re-throw if it's not a 404 error
        }
      }

      console.log('API Response:', response);

      // The response data is in response.data.data or response.data depending on the endpoint
      let apps = [];
      if (response.data) {
        if (response.data.success && response.data.data !== undefined) {
          // Handle response from /roles endpoint
          apps = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        } else if (Array.isArray(response.data)) {
          // Handle response from /admin/role-applications endpoint
          apps = response.data;
        } else if (response.data.data) {
          // Handle case where data is nested under data property
          apps = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        } else {
          // Handle any other response structure
          apps = [response.data];
        }
      }

      // Log each application's complete data for debugging
      console.log('=== DEBUG: Complete Applications Data ===');
      apps.forEach((app, index) => {
        // Log each piece of data separately to ensure visibility
        console.log(`\n=== Application ${index + 1} ===`);
        console.log('App ID:', app.id);
        console.log('Status:', app.status);

        if (app.user) {
          console.log('--- User Data ---');
          console.log('User ID:', app.user.id);
          console.log('Name:', app.user.name);
          console.log('Email:', app.user.email);
          console.log('Phone:', app.user.phone);
          console.log('Role:', app.user.role);

          // Log all user properties
          console.log('All User Properties:');
          Object.entries(app.user).forEach(([key, value]) => {
            console.log(`  ${key}:`, value);
          });
        } else {
          console.log('No user data available');
        }

        // Log all application properties
        console.log('--- All Application Properties ---');
        Object.entries(app).forEach(([key, value]) => {
          // Skip the user object as we've already logged it
          if (key !== 'user') {
            console.log(`${key}:`, value);
          }
        });
      });
      console.log('=== END DEBUG ===');

      setApplications(apps);
    } catch (e) {
      console.error('Error loading applications:', e);
      if (e.response?.status === 401) {
        setError('Authentication required. Please login as an admin or superadmin.');
      } else if (e.response?.status === 403) {
        setError('You do not have permission to view role applications. Admin access required.');
      } else {
        setError(e.response?.data?.message || 'Failed to load applications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const reviewApplication = async (id, status, comments = '') => {
    resetAlerts();
    try {
      // Map the action to the correct status value
      const statusMapping = {
        'approve': 'approved',
        'reject': 'rejected',
        'request_info': 'pending'
      };

      const mappedStatus = statusMapping[status] || status;

      if (!['approved', 'rejected', 'pending'].includes(mappedStatus)) {
        throw new Error(`Invalid status: ${status}. Must be one of: approved, rejected, pending`);
      }

      // Use the admin API to update the application status
      await adminApi.updateApplicationStatus(id, {
        status: mappedStatus,
        adminNotes: comments,
        adminId: currentUser?.id || 'admin'
      });

      setSuccess(`Application ${mappedStatus} successfully`);
      // Reload applications to reflect the changes
      loadApplications();
      return true;
    } catch (e) {
      console.error('Error updating application status:', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to update application. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage); // Re-throw to be caught by the modal
    }
  };

  // Ensure applications is always an array before filtering
  const filteredApplications = Array.isArray(applications)
    ? applications.filter(app => {
      if (filterStatus === 'all') return true;
      return app.status === filterStatus;
    })
    : [];

  const fileBase = import.meta.env.VITE_API_BASE_URL || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Pending Role Applications</h3>
          <p className="text-sm text-gray-600">Review and approve pending role requests</p>
        </div>

        <button
          onClick={loadApplications}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700 border border-red-200">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700 border border-green-200">{success}</div>}

      {/* Applications Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">
            {filterStatus === 'all'
              ? 'No role applications have been submitted yet.'
              : `No ${filterStatus} applications found.`
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ minWidth: '700px' }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Role Applied
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Verify
                  </th>

                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    {/* User Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          {app.user?.email || 'Email not available'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {app.user?.phone || 'Phone not available'}
                        </div>
                      </div>
                    </td>

                    {/* Role Applied Column */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {app.appliedRole || app.role || 'N/A'}
                      </div>
                    </td>

                    {/* Date Column */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(app.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(app.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    {/* Verify Column */}
                    <td className="px-6 py-4">
                      {app.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedApplication({
                              ...app,
                              action: 'review',
                              comments: ''
                            });
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                          title="View Documents & Review"
                        >
                          📄 uploads
                        </button>
                      ) : (
                        <div className="text-center">
                          {app.status === 'approved' ? (
                            <button
                              onClick={() => navigate('/dashboard/users/role-applications/approved')}
                              className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium hover:bg-green-200 transition-colors"
                              title="View Approved Applications"
                            >
                              ✓ Approved
                            </button>
                          ) : app.status === 'rejected' ? (
                            <button
                              onClick={() => navigate('/dashboard/users/role-applications/rejected')}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200 transition-colors"
                              title="View Rejected Applications"
                            >
                              ✗ Rejected
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate('/dashboard/users/role-applications/pending')}
                              className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                            >
                              {app.status}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedApplication && (
        <ReviewApplicationModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onActionChange={(newAction) => {
            setSelectedApplication({
              ...selectedApplication,
              action: newAction,
              comments: ''
            });
          }}
          onSubmit={reviewApplication}
        />
      )}
    </div>
  );
}

// Review Application Modal Component
const ReviewApplicationModal = ({ application, onClose, onSubmit, onActionChange }) => {
  const [comments, setComments] = useState('');
  const [documentsReviewed, setDocumentsReviewed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(application.id, application.action === 'request_info' ? 'pending' : application.action, comments);
      onClose();
    } catch (error) {
      console.error('Review failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Parse referees from multiple possible field names
  const parseReferees = (refereesData) => {
    if (!refereesData) return [];
    if (Array.isArray(refereesData)) return refereesData;
    if (typeof refereesData === 'string') {
      try {
        return JSON.parse(refereesData);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Enhanced referee parsing to handle both new and old formats
  const parseRefereesEnhanced = (refereesData, appData) => {
    if (!refereesData) {
      // Try to extract from individual fields (new format)
      const extractedReferees = [];
      if (appData.referee1Name && appData.referee1Phone) {
        extractedReferees.push({
          name: appData.referee1Name,
          contact: appData.referee1Phone
        });
      }
      if (appData.referee2Name && appData.referee2Phone) {
        extractedReferees.push({
          name: appData.referee2Name,
          contact: appData.referee2Phone
        });
      }
      return extractedReferees;
    }
    if (Array.isArray(refereesData)) return refereesData;
    if (typeof refereesData === 'string') {
      try {
        return JSON.parse(refereesData);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Use enhanced referee parsing to handle both new format (individual fields) and old format (JSON array)
  let referees = parseRefereesEnhanced(application.referees, application);

  // Also check alternative field names if no referees found
  if (referees.length === 0) {
    const refereeFields = ['Referees', 'references', 'References'];
    for (const field of refereeFields) {
      if (application[field]) {
        const parsed = parseReferees(application[field]);
        if (parsed.length > 0) {
          referees = parsed;
          console.log(`✅ Found referees in field: ${field}`, referees);
          break;
        }
      }
    }
  }

  // Check nested user object as fallback
  if (referees.length === 0 && application.user) {
    const userReferees = parseRefereesEnhanced(application.user.referees, application.user);
    if (userReferees.length > 0) {
      referees = userReferees;
      console.log('✅ Found referees in user object:', referees);
    }
  }

  console.log('🔍 Referee Debug:', {
    availableFields: Object.keys(application),
    foundReferees: referees,
    refereeCount: referees.length,
    // Log individual referee fields for debugging
    referee1Name: application.referee1Name,
    referee1Phone: application.referee1Phone,
    referee2Name: application.referee2Name,
    referee2Phone: application.referee2Phone
  });

  // Document field data with proper URL construction
  const documentFields = {
    nationalIdFront: application.nationalIdFrontUrl || application.nationalIdFront,
    nationalIdBack: application.nationalIdBackUrl || application.nationalIdBack,
    studentIdFront: application.studentIdFrontUrl || application.studentIdFront,
    studentIdBack: application.studentIdBackUrl || application.studentIdBack
  };

  // Build full image URLs
  const fileBase = import.meta.env.VITE_API_URL || '';
  const imageUrls = {
    nationalIdFront: documentFields.nationalIdFront ? `${fileBase}/uploads/${documentFields.nationalIdFront}` : null,
    nationalIdBack: documentFields.nationalIdBack ? `${fileBase}/uploads/${documentFields.nationalIdBack}` : null,
    studentIdFront: documentFields.studentIdFront ? `${fileBase}/uploads/${documentFields.studentIdFront}` : null,
    studentIdBack: documentFields.studentIdBack ? `${fileBase}/uploads/${documentFields.studentIdBack}` : null
  };

  // Check what documents are available
  const hasNationalId = imageUrls.nationalIdFront || imageUrls.nationalIdBack;
  const hasStudentId = imageUrls.studentIdFront || imageUrls.studentIdBack;

  // Debug logging
  console.log('🔍 Document Debug for Application ID:', application.id);
  console.log('📄 Document Fields:', documentFields);
  console.log('🌐 Image URLs:', imageUrls);
  console.log('📊 Has Documents:', { hasNationalId, hasStudentId });
  console.log('🔧 Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('🔧 Constructed URLs:', {
    nationalIdFrontUrl: documentFields.nationalIdFront ? `${fileBase}/uploads/${documentFields.nationalIdFront}` : null,
    nationalIdBackUrl: documentFields.nationalIdBack ? `${fileBase}/uploads/${documentFields.nationalIdBack}` : null
  });

  // Image modal state
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {application.action === 'review' && 'Review Application Documents'}
            {application.action === 'approve' && 'Review Application - Approve'}
            {application.action === 'reject' && 'Review Application - Reject'}
            {application.action === 'request_info' && 'Review Application - Request Info'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Applicant Information */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Applicant Information</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <div className="text-sm text-gray-900 bg-white p-2 border rounded">
                    {application.user?.name || application.User?.name || `User ${application.userId}`}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="text-sm text-gray-900 bg-white p-2 border rounded">
                    {application.user?.email || application.User?.email || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="text-sm text-gray-900 bg-white p-2 border rounded">
                    {application.user?.phone || application.User?.phone || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Applied Role</label>
                  <div className="text-sm font-medium text-blue-600 bg-white p-2 border rounded">
                    {application.appliedRole || application.role || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Application Date</label>
                  <div className="text-sm text-gray-900 bg-white p-2 border rounded">
                    {new Date(application.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            {(application.university || application.studentId) && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Academic Information</h4>

                <div className="space-y-3">
                  {application.university && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Institution</label>
                      <div className="text-sm text-gray-900 bg-white p-2 border rounded">
                        {application.university}
                      </div>
                    </div>
                  )}

                  {application.studentId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                      <div className="text-sm text-gray-900 bg-white p-2 border rounded">
                        {application.studentId}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Referees */}
            {referees.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Referees</h4>

                <div className="space-y-3">
                  {referees.map((referee, index) => (
                    <div key={index} className="bg-white p-3 border rounded">
                      <div className="font-medium text-sm text-gray-900">Referee {index + 1}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div><strong>Name:</strong> {referee.name}</div>
                        <div><strong>Contact:</strong> {referee.contact || referee.phone || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-4">📄 Uploaded Documents</h4>

              <div className="space-y-6">

                {/* Student ID Documents */}
                {hasStudentId ? (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Student/Institution ID Documents</h5>
                    <div className="space-y-4">
                      {imageUrls.studentIdFront && (
                        <div className="bg-white border rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-700 mb-3">Front Side</div>
                          <div className="border border-gray-300 rounded p-4">
                            <div className="flex flex-col items-center space-y-2">
                              <img
                                src={imageUrls.studentIdFront}
                                alt="Student ID Front"
                                className="max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setSelectedImage({ url: imageUrls.studentIdFront, title: 'Student ID - Front Side' })}
                                onLoad={(e) => {
                                  console.log('✅ Student ID Front loaded:', imageUrls.studentIdFront);
                                }}
                                onError={(e) => {
                                  console.error('❌ Student ID Front failed to load:', imageUrls.studentIdFront);
                                  e.currentTarget.style.border = '2px solid red';
                                  e.currentTarget.style.backgroundColor = '#fee';
                                  e.currentTarget.alt = 'Image failed to load';
                                }}
                                crossOrigin="anonymous"
                              />
                              <a
                                href={imageUrls.studentIdFront}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Open in new tab
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      {imageUrls.studentIdBack && (
                        <div className="bg-white border rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-700 mb-3">Back Side</div>
                          <div className="border border-gray-300 rounded p-4">
                            <div className="flex flex-col items-center space-y-2">
                              <img
                                src={imageUrls.studentIdBack}
                                alt="Student ID Back"
                                className="max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setSelectedImage({ url: imageUrls.studentIdBack, title: 'Student ID - Back Side' })}
                                onLoad={(e) => {
                                  console.log('✅ Student ID Back loaded:', imageUrls.studentIdBack);
                                }}
                                onError={(e) => {
                                  console.error('❌ Student ID Back failed to load:', imageUrls.studentIdBack);
                                  e.currentTarget.style.border = '2px solid red';
                                  e.currentTarget.style.backgroundColor = '#fee';
                                  e.currentTarget.alt = 'Image failed to load';
                                }}
                                crossOrigin="anonymous"
                              />
                              <a
                                href={imageUrls.studentIdBack}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Open in new tab
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-700">❌ No Student/Institution ID documents found</div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Review Confirmation */}
            {hasStudentId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="documentsReviewed"
                    checked={documentsReviewed}
                    onChange={(e) => setDocumentsReviewed(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="documentsReviewed" className="text-sm text-blue-800">
                    <span className="font-medium">I have reviewed the academic documents</span>
                    <br />
                    <span className="text-blue-600">
                      I have carefully examined the Student/Institution ID documents for this application.
                    </span>
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Application Details */}
          <div className="space-y-4">
            {/* Reason */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Application Reason</h4>
              <div className="bg-white p-3 border rounded">
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {application.reason || 'No reason provided'}
                </div>
              </div>
            </div>

            {/* Admin Comments Section */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Review Decision</h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {application.action === 'approve' && 'Approval Comments (Optional)'}
                  {application.action === 'reject' && 'Rejection Reason (Required)'}
                  {application.action === 'request_info' && 'Information Requested (Required)'}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    application.action === 'approve'
                      ? 'Any additional notes about this approval...'
                      : application.action === 'reject'
                        ? 'Please provide a reason for rejection...'
                        : 'What additional information do you need?'
                  }
                  required={application.action !== 'approve'}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {application.action === 'review' ? 'Close' : 'Cancel'}
                </button>
                {application.action === 'review' ? (
                  <>
                    <button
                      onClick={() => {
                        // Switch to reject mode
                        onActionChange('reject');
                        setComments('');
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={() => {
                        // Switch to approve mode
                        onActionChange('approve');
                        setComments('');
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || (application.action !== 'approve' && !comments.trim()) || ((hasNationalId || hasStudentId) && !documentsReviewed)}
                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${application.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : application.action === 'reject'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                  >
                    {loading ? 'Processing...' :
                      application.action === 'approve' ? `Approve Application${(hasNationalId || hasStudentId) && !documentsReviewed ? ' (Review Documents Required)' : ''}` :
                        application.action === 'reject' ? `Reject Application${(hasNationalId || hasStudentId) && !documentsReviewed ? ' (Review Documents Required)' : ''}` : 'Send Request'
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{selectedImage.title}</h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};