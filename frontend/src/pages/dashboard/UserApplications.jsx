import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function UserApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetAlerts = () => { setError(''); setSuccess(''); };

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('🔍 Loading role applications...');
      const r = await api.get('/roles/');
      console.log('📊 API Response:', r.data);

      // Handle different response formats
      const data = r.data.data || r.data || [];
      console.log('📋 Setting applications:', data);
      setApplications(data);
    } catch (e) {
      console.error('❌ API Error:', e);
      if (e.response?.status === 401) {
        setError('Authentication required. Please login as an admin or superadmin.');
      } else if (e.response?.status === 403) {
        setError('You do not have permission to view role applications. Admin access required.');
      } else {
        setError(e.response?.data?.error || e.response?.data?.message || 'Failed to load applications');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const reviewApplication = async (id, status) => {
    resetAlerts();
    try {
      await api.put(`/roles/${id}/status`, { status });
      setSuccess(`Application ${status}`);
      loadApplications();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update application');
    }
  };

  const fileBase = api.defaults.baseURL?.replace(/\/?api\/?$/, '') || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Role Applications</h1>
        <button className="btn" onClick={loadApplications}>Refresh</button>
      </div>

      {/* Alerts */}
      {error && <div className="p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="p-3 rounded bg-green-100 text-green-700">{success}</div>}

      {/* Loading State */}
      {loading ? (
        <div className="card p-6 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
          <p className="mt-2 text-gray-600">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="card p-6 text-center text-gray-600">No applications found.</div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <div className="font-semibold text-lg">{app.User?.name || app.userId}</div>
                      <div className="text-gray-600">{app.User?.email || '-'}</div>
                    </div>
                    <div className="px-3 py-1 rounded bg-blue-100 text-blue-800">
                      Requested: {app.appliedRole}
                    </div>
                    {app.university && (
                      <div className="px-3 py-1 rounded bg-green-100 text-green-800">
                        University: {app.university}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500">Student ID</div>
                      <div>{app.studentId || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Applied Date</div>
                      <div>{new Date(app.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Document Links */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {app.nationalIdFrontUrl && (
                      <a
                        href={`${fileBase}/${app.nationalIdFrontUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline btn-sm"
                      >
                        National ID Front
                      </a>
                    )}
                    {app.nationalIdBackUrl && (
                      <a
                        href={`${fileBase}/${app.nationalIdBackUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline btn-sm"
                      >
                        National ID Back
                      </a>
                    )}
                    {app.studentIdFrontUrl && (
                      <a
                        href={`${fileBase}/${app.studentIdFrontUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline btn-sm"
                      >
                        Student ID Front
                      </a>
                    )}
                    {app.studentIdBackUrl && (
                      <a
                        href={`${fileBase}/${app.studentIdBackUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline btn-sm"
                      >
                        Student ID Back
                      </a>
                    )}
                  </div>

                  {/* Referees */}
                  {Array.isArray(app.referees) && app.referees.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Referees</div>
                      <ul className="list-disc pl-6 space-y-1">
                        {app.referees.map((r, idx) => (
                          <li key={idx} className="text-sm">
                            <span className="font-medium">{r.name}</span> — {r.contact || r.phone || 'N/A'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reason */}
                  {app.reason && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-1">Reason for Application</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{app.reason}</div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-6">
                  <button
                    className="btn btn-success"
                    onClick={() => reviewApplication(app.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => reviewApplication(app.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}