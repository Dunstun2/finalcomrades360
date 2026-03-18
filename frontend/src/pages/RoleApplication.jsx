import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaArrowLeft } from 'react-icons/fa';
import api from '../services/api';
import Dialog from '../components/Dialog';
import { validateKenyanPhone, PHONE_VALIDATION_ERROR, formatKenyanPhoneInput, getPhoneMaxLength } from '../utils/validation';

export default function RoleApplication({ user }) {
  const location = useLocation();
  const [formData, setFormData] = useState({
    role: '',
    university: '',
    studentId: '',
    reason: '',
    isStudent: user?.role === 'student',
    nationalIdFront: null,
    nationalIdBack: null,
    studentIdFront: null,
    studentIdBack: null,
    referee1Name: '',
    referee1Phone: '',
    referee2Name: '',
    referee2Phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    message: '',
    type: 'info'
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = (data) => {
    const errs = {};
    if (!data.role) errs.role = 'Please select a role';
    if (!data.reason?.trim()) errs.reason = 'Please provide your motivation';
    if (!data.nationalIdFront) errs.nationalIdFront = 'Front of National ID is required';
    if (!data.nationalIdBack) errs.nationalIdBack = 'Back of National ID is required';
    if (data.isStudent) {
      if (!data.university?.trim()) errs.university = 'University is required for students';
      if (!data.studentId?.trim()) errs.studentId = 'Student ID is required for students';
      if (!data.studentIdFront) errs.studentIdFront = 'Upload front of Student/Institution ID';
      if (!data.studentIdBack) errs.studentIdBack = 'Upload back of Student/Institution ID';
    }
    // Validate referees
    if (!data.referee1Name?.trim()) errs.referee1Name = 'Referee 1 name is required';
    if (!data.referee1Phone?.trim()) {
      errs.referee1Phone = 'Referee 1 phone is required';
    } else if (!validateKenyanPhone(data.referee1Phone)) {
      errs.referee1Phone = PHONE_VALIDATION_ERROR;
    }
    if (!data.referee2Name?.trim()) errs.referee2Name = 'Referee 2 name is required';
    if (!data.referee2Phone?.trim()) {
      errs.referee2Phone = 'Referee 2 phone is required';
    } else if (!validateKenyanPhone(data.referee2Phone)) {
      errs.referee2Phone = PHONE_VALIDATION_ERROR;
    }
    return errs;
  };

  const isFormValid = useMemo(() => Object.keys(validate(formData)).length === 0, [formData]);

  useEffect(() => {
    // Preselect role from query parameter
    const params = new URLSearchParams(location.search);
    // Check for both 'role' and 'type' parameters for backward compatibility
    let roleParam = params.get('role') || params.get('type');
    const allowed = ['marketer', 'seller', 'delivery_agent', 'service_provider'];

    // Normalize role parameter (convert hyphens to underscores)
    if (roleParam) {
      roleParam = roleParam.replace(/-/g, '_');
    }

    console.log('URL Parameters:', {
      role: params.get('role'),
      type: params.get('type'),
      normalizedRole: roleParam,
      allowedRoles: allowed
    });

    if (roleParam && allowed.includes(roleParam)) {
      // Check if user already has this role
      const userRoles = user?.roles || ['customer'];
      if (userRoles.includes(roleParam)) {
        alert(`You already have the ${roleParam.replace(/_/g, ' ')} role and cannot apply for it again.`);
        navigate(-1);
        return;
      }

      console.log('Setting role from URL parameter:', roleParam);
      setFormData(prev => ({
        ...prev,
        role: roleParam
      }));
      // Clear any existing dialog when role changes
      setShowDialog(false);
    } else if (roleParam) {
      console.warn(`Invalid role parameter: ${roleParam}. Must be one of:`, allowed);
    }
  }, [location.search, user, navigate]);

  const markTouched = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Don't submit if already loading
    if (loading) return;

    setLoading(true);

    // Clear any previous errors
    setDialogConfig({
      title: '',
      message: '',
      type: 'info'
    });

    // Validate form
    const formErrors = validate(formData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setLoading(false);
      return;
    }

    // Validate referees
    if (!formData.referee1Name?.trim() || !formData.referee1Phone?.trim() ||
      !formData.referee2Name?.trim() || !formData.referee2Phone?.trim()) {
      setDialogConfig({
        title: 'Validation Error',
        message: 'Please provide complete referee information for both referees',
        type: 'error'
      });
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      // Add user ID to the form data
      formDataToSend.append('userId', user.id);

      // Add role and other fields
      formDataToSend.append('appliedRole', formData.role);
      formDataToSend.append('university', formData.university || '');
      formDataToSend.append('studentId', formData.studentId || '');
      formDataToSend.append('reason', formData.reason);

      // Append files
      if (formData.nationalIdFront) {
        formDataToSend.append('nationalIdFront', formData.nationalIdFront);
      }
      if (formData.nationalIdBack) {
        formDataToSend.append('nationalIdBack', formData.nationalIdBack);
      }

      if (formData.isStudent) {
        if (formData.studentIdFront) {
          formDataToSend.append('studentIdFront', formData.studentIdFront);
        }
        if (formData.studentIdBack) {
          formDataToSend.append('studentIdBack', formData.studentIdBack);
        }
      }

      // Add referees as JSON string
      const refereesData = [
        { name: formData.referee1Name.trim(), contact: formData.referee1Phone.trim() },
        { name: formData.referee2Name.trim(), contact: formData.referee2Phone.trim() }
      ];
      formDataToSend.append('referees', JSON.stringify(refereesData));

      // Add jobOpeningId if present
      const jobId = location.state?.jobId;
      if (jobId) {
        formDataToSend.append('jobOpeningId', jobId);
      }

      // Debug: Log form data and file sizes
      const logFileInfo = (file, name) => {
        if (!file) return `${name}: null`;
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        return `${name}: ${file.name} (${sizeInMB}MB, ${file.type})`;
      };

      console.log('Submitting form with files:', {
        userId: user.id,
        appliedRole: formData.role,
        university: formData.university,
        studentId: formData.studentId,
        reason: formData.reason,
        files: [
          formData.nationalIdFront && logFileInfo(formData.nationalIdFront, 'nationalIdFront'),
          formData.nationalIdBack && logFileInfo(formData.nationalIdBack, 'nationalIdBack'),
          formData.studentIdFront && logFileInfo(formData.studentIdFront, 'studentIdFront'),
          formData.studentIdBack && logFileInfo(formData.studentIdBack, 'studentIdBack')
        ].filter(Boolean),
        referees: refereesData
      });

      const response = await api.post('/role-applications/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: 50 * 1024 * 1024, // 50MB max content length
        maxContentLength: 50 * 1024 * 1024, // 50MB max content length
        timeout: 60000, // 60 second timeout
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });

      console.log('Server response:', response.data);

      // Show success dialog
      setDialogConfig({
        title: 'Application Submitted!',
        message: 'Your application has been submitted successfully. You will be notified once it is reviewed.',
        type: 'success'
      });
      setShowDialog(true);

      // Reset form
      setFormData({
        role: '', university: '', studentId: '', reason: '', isStudent: user?.role === 'student',
        nationalIdFront: null, nationalIdBack: null, studentIdFront: null, studentIdBack: null,
        referee1Name: '', referee1Phone: '', referee2Name: '', referee2Phone: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting application:', error);
      console.error('Error response:', error.response?.data);

      let errorMessage = 'Failed to submit application. ';
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage += error.response.data?.message ||
          error.response.data?.error ||
          `Server responded with status ${error.response.status}`;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage += 'No response from server. Please check your connection.';
      } else {
        errorMessage += error.message || 'An unexpected error occurred.';
      }

      // Show error dialog
      setDialogConfig({
        title: 'Submission Failed',
        message: errorMessage,
        type: 'error'
      });
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="container py-8">Please login to apply for roles.</div>;
  }

  const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(user.role);
  if (!isAdmin && !user.isVerified) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto card text-center p-8">
          <div className="mb-4 flex justify-center text-amber-500">
            <FaShieldAlt className="text-6xl" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Verification Required</h2>
          <p className="text-gray-600 mb-6">
            You must complete your account verification (including National ID approval) before you can apply for a specialized role.
          </p>
          <button
            onClick={() => navigate('/account/verification')}
            className="w-full btn btn-primary mb-3"
          >
            Go to Verification Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (user.applicationStatus === 'pending') {
    return (
      <div className="container py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium"
        >
          <FaArrowLeft className="mr-2" /> Back
        </button>
        <div className="max-w-md mx-auto card p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Application Pending</h2>
          <p>Your application for <strong>{user.appliedRole}</strong> is currently under review.</p>
          <p className="text-sm text-gray-600 mt-2 mb-6">You will be notified once the admin reviews your application.</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full btn btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium"
        >
          <FaArrowLeft className="mr-2" /> Back
        </button>
        <h1 className="text-3xl font-bold mb-6">Apply for {location.state?.jobTitle || 'Role'}</h1>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Role Application Form</h2>

          {/* Dialog for success/error messages */}
          <Dialog
            isOpen={showDialog}
            onClose={() => {
              setShowDialog(false);
              // If it was a success dialog, close the form
              if (dialogConfig.type === 'success') {
                navigate('/dashboard'); // or wherever you want to redirect after success
              }
            }}
            title={dialogConfig.title}
            message={dialogConfig.message}
            type={dialogConfig.type}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData({ ...formData, role: v });
                  setErrors(validate({ ...formData, role: v }));
                }}
                onBlur={() => { markTouched('role'); setErrors(validate(formData)); }}
                className={`w-full p-2 border rounded ${errors.role ? 'border-red-500' : 'border-gray-300'}`}
                required
              >
                <option value="">Select a role</option>
                <option value="marketer">Marketer</option>
                <option value="seller">Seller</option>
                <option value="delivery_agent">Delivery Agent</option>
                <option value="service_provider">Service Provider</option>
              </select>
              {errors.role && touched.role && (
                <div className="text-red-600 text-sm mt-1">{errors.role}</div>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="isStudent"
                type="checkbox"
                checked={!!formData.isStudent}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const next = {
                    ...formData,
                    isStudent: checked,
                    university: checked ? formData.university : '',
                    studentId: checked ? formData.studentId : '',
                    studentIdFront: checked ? formData.studentIdFront : null,
                    studentIdBack: checked ? formData.studentIdBack : null
                  };
                  setFormData(next);
                  setErrors(validate(next));
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isStudent" className="ml-2 text-sm text-gray-700">I am a student</label>
            </div>

            {formData.isStudent && (
              <>
                <div>
                  <label className="block font-medium mb-1">University *</label>
                  <input
                    type="text"
                    value={formData.university}
                    onChange={(e) => { const v = e.target.value; const next = { ...formData, university: v }; setFormData(next); setErrors(validate(next)); }}
                    onBlur={() => { markTouched('university'); setErrors(validate(formData)); }}
                    className={`w-full p-2 border rounded ${errors.university ? 'border-red-500' : ''}`}
                    placeholder="e.g., University of Nairobi"
                    required
                  />
                  {errors.university && touched.university && <div className="text-red-600 text-sm mt-1">{errors.university}</div>}
                </div>

                <div>
                  <label className="block font-medium mb-1">Student ID *</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => { const v = e.target.value; const next = { ...formData, studentId: v }; setFormData(next); setErrors(validate(next)); }}
                    onBlur={() => { markTouched('studentId'); setErrors(validate(formData)); }}
                    className={`w-full p-2 border rounded ${errors.studentId ? 'border-red-500' : ''}`}
                    placeholder="e.g., S21/12345/2023"
                    required
                  />
                  {errors.studentId && touched.studentId && <div className="text-red-600 text-sm mt-1">{errors.studentId}</div>}
                </div>
              </>
            )}

            <div>
              <label className="block font-medium mb-1">National ID Documents (Front & Back) *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm">Front</span>
                  <input type="file" onChange={(e) => { const f = e.target.files[0]; const next = { ...formData, nationalIdFront: f }; setFormData(next); setErrors(validate(next)); }} onBlur={() => { markTouched('nationalIdFront'); }} className={`w-full border rounded p-2 ${errors.nationalIdFront ? 'border-red-500' : ''}`} accept="image/*,.pdf" required />
                  {formData.nationalIdFront && <div className="text-xs text-gray-600 mt-1">Selected: {formData.nationalIdFront.name}</div>}
                  {errors.nationalIdFront && touched.nationalIdFront && <div className="text-red-600 text-sm mt-1">{errors.nationalIdFront}</div>}
                </div>
                <div>
                  <span className="text-sm">Back</span>
                  <input type="file" onChange={(e) => { const f = e.target.files[0]; const next = { ...formData, nationalIdBack: f }; setFormData(next); setErrors(validate(next)); }} onBlur={() => { markTouched('nationalIdBack'); }} className={`w-full border rounded p-2 ${errors.nationalIdBack ? 'border-red-500' : ''}`} accept="image/*,.pdf" required />
                  {formData.nationalIdBack && <div className="text-xs text-gray-600 mt-1">Selected: {formData.nationalIdBack.name}</div>}
                  {errors.nationalIdBack && touched.nationalIdBack && <div className="text-red-600 text-sm mt-1">{errors.nationalIdBack}</div>}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Upload clear images or PDFs of your National ID front and back.</p>
            </div>

            {formData.isStudent && (
              <div>
                <label className="block font-medium mb-1">Student/Institution ID (Front & Back) *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm">Front</span>
                    <input type="file" onChange={(e) => { const f = e.target.files[0]; const next = { ...formData, studentIdFront: f }; setFormData(next); setErrors(validate(next)); }} onBlur={() => { markTouched('studentIdFront'); }} className={`w-full border rounded p-2 ${errors.studentIdFront ? 'border-red-500' : ''}`} accept="image/*,.pdf" required />
                    {formData.studentIdFront && <div className="text-xs text-gray-600 mt-1">Selected: {formData.studentIdFront.name}</div>}
                    {errors.studentIdFront && touched.studentIdFront && <div className="text-red-600 text-sm mt-1">{errors.studentIdFront}</div>}
                  </div>
                  <div>
                    <span className="text-sm">Back</span>
                    <input type="file" onChange={(e) => { const f = e.target.files[0]; const next = { ...formData, studentIdBack: f }; setFormData(next); setErrors(validate(next)); }} onBlur={() => { markTouched('studentIdBack'); }} className={`w-full border rounded p-2 ${errors.studentIdBack ? 'border-red-500' : ''}`} accept="image/*,.pdf" required />
                    {formData.studentIdBack && <div className="text-xs text-gray-600 mt-1">Selected: {formData.studentIdBack.name}</div>}
                    {errors.studentIdBack && touched.studentIdBack && <div className="text-red-600 text-sm mt-1">{errors.studentIdBack}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Referee Section */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900 mb-4">Referee Information</h3>
              <p className="text-sm text-gray-600 mb-4">Please provide contact details for two people who can verify your information.</p>

              {/* Referee 1 */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">Referee 1</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.referee1Name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, referee1Name: v });
                        setErrors(validate({ ...formData, referee1Name: v }));
                      }}
                      onBlur={() => { markTouched('referee1Name'); setErrors(validate(formData)); }}
                      className={`w-full p-3 border rounded-lg ${errors.referee1Name && touched.referee1Name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Enter referee's full name"
                      required
                    />
                    {errors.referee1Name && touched.referee1Name && (
                      <div className="text-red-600 text-sm mt-1">{errors.referee1Name}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={formData.referee1Phone}
                      onInput={(e) => e.target.value = formatKenyanPhoneInput(e.target.value)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, referee1Phone: v });
                        setErrors(validate({ ...formData, referee1Phone: v }));
                      }}
                      onBlur={() => { markTouched('referee1Phone'); setErrors(validate(formData)); }}
                      maxLength={getPhoneMaxLength(formData.referee1Phone)}
                      className={`w-full p-3 border rounded-lg ${errors.referee1Phone && touched.referee1Phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="e.g., 0712345678 or +254712345678"
                      required
                    />
                    {errors.referee1Phone && touched.referee1Phone && (
                      <div className="text-red-600 text-sm mt-1">{errors.referee1Phone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Referee 2 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">Referee 2</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.referee2Name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, referee2Name: v });
                        setErrors(validate({ ...formData, referee2Name: v }));
                      }}
                      onBlur={() => { markTouched('referee2Name'); setErrors(validate(formData)); }}
                      className={`w-full p-3 border rounded-lg ${errors.referee2Name && touched.referee2Name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Enter referee's full name"
                      required
                    />
                    {errors.referee2Name && touched.referee2Name && (
                      <div className="text-red-600 text-sm mt-1">{errors.referee2Name}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={formData.referee2Phone}
                      onInput={(e) => e.target.value = formatKenyanPhoneInput(e.target.value)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, referee2Phone: v });
                        setErrors(validate({ ...formData, referee2Phone: v }));
                      }}
                      onBlur={() => { markTouched('referee2Phone'); setErrors(validate(formData)); }}
                      maxLength={getPhoneMaxLength(formData.referee2Phone)}
                      className={`w-full p-3 border rounded-lg ${errors.referee2Phone && touched.referee2Phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="e.g., 0712345678 or +254712345678"
                      required
                    />
                    {errors.referee2Phone && touched.referee2Phone && (
                      <div className="text-red-600 text-sm mt-1">{errors.referee2Phone}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Why do you want this role? *</label>
              <textarea
                value={formData.reason}
                onChange={(e) => { const v = e.target.value; const next = { ...formData, reason: v }; setFormData(next); setErrors(validate(next)); }}
                onBlur={() => { markTouched('reason'); setErrors(validate(formData)); }}
                className={`w-full p-2 border rounded h-24 ${errors.reason ? 'border-red-500' : ''}`}
                placeholder="Explain your motivation and relevant experience..."
                required
              />
              {errors.reason && touched.reason && <div className="text-red-600 text-sm mt-1">{errors.reason}</div>}
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full btn disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
