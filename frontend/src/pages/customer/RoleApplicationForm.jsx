import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FaUserGraduate, FaUserTie, FaIdCard, FaUpload, FaArrowLeft, FaSave, FaSpinner, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import SystemFeedbackModal from '../../components/ui/SystemFeedbackModal';

// List of Kenyan universities and colleges
const KENYAN_INSTITUTIONS = [
  'Kenyatta University',
  'Jomo Kenyatta University of Agriculture and Technology (JKUAT)',
  'University of Nairobi',
  'Moi University',
  'Egerton University',
  'Maseno University',
  'Technical University of Kenya',
  'Technical University of Mombasa',
  'Dedan Kimathi University of Technology',
  'Masinde Muliro University of Science and Technology',
  'University of Eldoret',
  'Kisii University',
  'Pwani University',
  'Chuka University',
  'Karatina University',
  'Maasai Mara University',
  'Multimedia University of Kenya',
  'South Eastern Kenya University',
  'University of Kabianga',
  'Laikipia University',
  'Meru University of Science and Technology',
  'Kirinyaga University',
  'Other (Please specify)'
];

const ROLE_OPTIONS = [
  'Seller',
  'Marketer',
  'Delivery Agent',
  'Service Provider'
];

export default function RoleApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role: roleParam } = useParams();

  // Pure function for initial state
  const getInitialRole = () => {
    if (!roleParam) return ROLE_OPTIONS[0];
    const normalized = roleParam.toLowerCase().replace(/_/g, ' ');
    const found = ROLE_OPTIONS.find(opt => opt.toLowerCase() === normalized);
    return found || ROLE_OPTIONS[0];
  };

  const [formData, setFormData] = useState(() => ({
    userType: 'student',
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    studentId: '',
    institution: '',
    otherInstitution: '',
    role: getInitialRole(),
    bio: '',
    referee1Name: '',
    referee1Phone: '',
    referee2Name: '',
    referee2Phone: ''
  }));

  const location = useLocation();
  const [jobOpeningId, setJobOpeningId] = useState(location.state?.jobId || null);

  const [studentIdFront, setStudentIdFront] = useState(null);
  const [studentIdBack, setStudentIdBack] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', description: '', onConfirm: null });

  // Fetch job opening if missing
  useEffect(() => {
    const fetchJobOpening = async () => {
      if (jobOpeningId) return;

      try {
        const role = String(formData.role).toLowerCase().replace(/ /g, '_');
        const response = await api.get('/job-openings', { params: { status: 'active', role } });
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          setJobOpeningId(response.data.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching job opening:', err);
      }
    };

    fetchJobOpening();
  }, [formData.role, jobOpeningId]);

  // Load draft on component mount
  useEffect(() => {
    const loadDraft = async () => {
      if (!user?.id) return;

      try {
        const response = await api.get(`/role-applications/draft/${user.id}`);
        if (response.data.success && response.data.data) {
          const draft = response.data.data;
          setDraftId(draft.id);

          if (draft.jobOpeningId) {
            setJobOpeningId(draft.jobOpeningId);
          }

          let refereeData = {
            referee1Name: '', referee1Phone: '', referee2Name: '', referee2Phone: ''
          };

          if (draft.referees && Array.isArray(draft.referees)) {
            if (draft.referees[0]) {
              refereeData.referee1Name = draft.referees[0].name || '';
              refereeData.referee1Phone = draft.referees[0].contact || draft.referees[0].phone || '';
            }
            if (draft.referees[1]) {
              refereeData.referee2Name = draft.referees[1].name || '';
              refereeData.referee2Phone = draft.referees[1].contact || draft.referees[1].phone || '';
            }
          }

          setFormData(prev => ({
            ...prev,
            role: draft.appliedRole ? draft.appliedRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : prev.role,
            bio: draft.reason || '',
            studentId: draft.studentId || '',
            institution: draft.university || '',
            ...refereeData
          }));
          setLastSaved(new Date(draft.updatedAt));
        }
      } catch (error) {
        console.log('No existing draft found');
      }
    };

    loadDraft();
    loadDraft();
  }, [user?.id]);

  // Check for existing roles and pending applications on mount
  useEffect(() => {
    const checkExistingStatus = async () => {
      if (!user?.id || !roleParam) return;

      const normalized = roleParam.toLowerCase().replace(/_/g, ' ');
      const found = ROLE_OPTIONS.find(opt => opt.toLowerCase() === normalized);

      if (found) {
        const roleToCheck = found.toLowerCase().replace(/ /g, '_');
        const userRoles = user.roles || ['customer'];

        // 1. Check if user already holds the role
        if (userRoles.includes(roleToCheck)) {
          setModalConfig({
            type: 'warning',
            title: 'Role Already Assigned',
            description: `You already have the ${found} role and cannot apply for it again.`,
            onConfirm: () => navigate(-1)
          });
          setShowModal(true);
          return;
        }

        // 2. Check if user has a pending application for this role
        try {
          const response = await api.get(`/role-applications/user/${user.id}`);
          if (response.data.success && response.data.data) {
            const hasPending = response.data.data.some(
              app => app.appliedRole === roleToCheck && app.status === 'pending'
            );

            if (hasPending) {
              setModalConfig({
                type: 'warning',
                title: 'Application Pending',
                description: `You already have a pending application for the ${found} role. Please wait for our team to review it.`,
                onConfirm: () => navigate(-1)
              });
              setShowModal(true);
            }
          }
        } catch (err) {
          console.error('Error checking application status:', err);
        }
      }
    };

    checkExistingStatus();
  }, [user?.id, roleParam, navigate]);

  // Use a ref to track the last saved state to avoid redundant saves and loops
  const lastSavedDataRef = useRef(null);

  // Autosave function
  const saveDraft = useCallback(async (formDataToSave = formData, files = { studentIdFront, studentIdBack }) => {
    if (!user?.id || isSaving) return;

    // Check if anything actually changed since last save
    const currentDataString = JSON.stringify({
      ...formDataToSave,
      ...formDataToSave,
      studentIdFront: files.studentIdFront?.name,
      studentIdBack: files.studentIdBack?.name
    });

    if (lastSavedDataRef.current === currentDataString) {
      console.log('Autosave: No changes detected, skipping save.');
      return;
    }

    lastSavedDataRef.current = currentDataString; // Update ref BEFORE save to prevent race conditions

    setIsSaving(true);
    try {
      const formDataToSend = new FormData();

      // Add user data
      formDataToSend.append('userId', user.id);
      formDataToSend.append('appliedRole', String(formDataToSave.role).toLowerCase().replace(/ /g, '_'));

      if (jobOpeningId) {
        formDataToSend.append('jobOpeningId', jobOpeningId);
      }

      if (formDataToSave.bio) {
        formDataToSend.append('reason', formDataToSave.bio);
      }

      const referees = [
        { name: formDataToSave.referee1Name, contact: formDataToSave.referee1Phone },
        { name: formDataToSave.referee2Name, contact: formDataToSave.referee2Phone }
      ];
      formDataToSend.append('referees', JSON.stringify(referees));

      if (formDataToSave.userType === 'student') {
        if (formDataToSave.studentId) {
          formDataToSend.append('studentId', formDataToSave.studentId);
        }
        if (formDataToSave.institution && formDataToSave.institution !== '') {
          const university = formDataToSave.institution === 'Other (Please specify)'
            ? formDataToSave.otherInstitution
            : formDataToSave.institution;
          if (university) {
            formDataToSend.append('university', university);
          }
        }
        if (files.studentIdFront) formDataToSend.append('studentIdFront', files.studentIdFront);
        if (files.studentIdBack) formDataToSend.append('studentIdBack', files.studentIdBack);
      }



      const response = await api.post('/role-applications/draft', formDataToSend);

      if (response.data.success) {
        setDraftId(response.data.data.id);
        setLastSaved(new Date());

        setShowSaveNotification(true);
        setTimeout(() => setShowSaveNotification(false), 2000);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, formData, studentIdFront, studentIdBack, isSaving]);

  // Helper for image compression
  const compressImage = (file) => {
    return new Promise((resolve) => {
      // Skip compression for non-images
      if (!file.type.startsWith('image/')) {
        return resolve(file);
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`Compressed: ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7
          );
        };
      };
    });
  };

  // Debounced autosave
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const hasContent = formData.bio || formData.studentId || formData.institution ||
        formData.referee1Name || formData.referee2Name ||
        studentIdFront || studentIdBack;
      if (hasContent) {
        saveDraft();
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [formData, studentIdFront, studentIdBack, saveDraft]);

  const validatePhone = (phone) => {
    const s = String(phone).replace(/\s|-/g, '');
    if (/^\+254[17]\d{8}$/.test(s)) return true;
    if (/^0[17]\d{8}$/.test(s)) return true;
    return false;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Strict restriction for phone fields
    if (name.toLowerCase().includes('phone')) {
      // Only allow numbers and plus
      const cleanValue = value.replace(/[^\d+]/g, '');
      // Max length for +254 format is 13
      if (cleanValue.length > 13) return;

      setFormData(prev => ({ ...prev, [name]: cleanValue }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    console.log(`File selection triggered for: ${type}`, file ? { name: file.name, size: file.size, type: file.type } : 'No file');

    if (file) {
      setError('');
      try {
        let fileToUse = file;

        // Show "Compressing..." state if it's an image
        if (file.type.startsWith('image/')) {
          console.log(`Starting compression for ${file.name}...`);
          fileToUse = await compressImage(file);
        }

        if (fileToUse.size > 5 * 1024 * 1024) {
          setError(`File ${fileToUse.name} is too large (${(fileToUse.size / 1024 / 1024).toFixed(2)}MB). Max 5MB.`);
          console.error('File size exceeded limit after compression attempt');
          return;
        }

        switch (type) {

          case 'studentFront': setStudentIdFront(fileToUse); break;
          case 'studentBack': setStudentIdBack(fileToUse); break;
          default: break;
        }
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Failed to process file. Please try again.');
      }
    }
  };

  const handleManualSave = () => {
    saveDraft();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.bio || formData.bio.length < 50) {
      setError('Please fill in all required fields (Bio min 50 chars)');
      return;
    }

    const r1Phone = formData.referee1Phone.trim();
    const r2Phone = formData.referee2Phone.trim();

    if (!formData.referee1Name || !r1Phone || !formData.referee2Name || !r2Phone) {
      setError('Please provide details for two referees');
      return;
    }

    if (!validatePhone(r1Phone) || !validatePhone(r2Phone)) {
      setError('Referees phone numbers must be exactly 10 digits (07...) or 13 characters (+254...).');
      return;
    }

    if (formData.userType === 'student') {
      if (!formData.studentId || !formData.institution) {
        setError('Please provide your student details');
        return;
      }
      if (!studentIdFront || !studentIdBack) {
        setError('Please upload your student ID documents');
        return;
      }
    }



    try {
      setIsSubmitting(true);

      const formDataToSend = new FormData();
      formDataToSend.append('userId', user?.id || '');
      formDataToSend.append('appliedRole', String(formData.role).toLowerCase().replace(/ /g, '_'));
      formDataToSend.append('reason', formData.bio);

      if (jobOpeningId) {
        formDataToSend.append('jobOpeningId', jobOpeningId);
      }

      const referees = [
        { name: formData.referee1Name, contact: formData.referee1Phone },
        { name: formData.referee2Name, contact: formData.referee2Phone }
      ];
      formDataToSend.append('referees', JSON.stringify(referees));

      if (formData.userType === 'student') {
        formDataToSend.append('studentId', formData.studentId);
        formDataToSend.append('university', formData.institution === 'Other (Please specify)' ? formData.otherInstitution : formData.institution);
        formDataToSend.append('studentIdFront', studentIdFront);
        formDataToSend.append('studentIdBack', studentIdBack);
      }



      const response = await api.post('/role-applications', formDataToSend);

      if (response.data.success) {
        setModalConfig({
          type: 'success',
          title: 'Application Submitted!',
          description: `Thank you for applying to become a ${formData.role}. We've received your application and our team will review it within 48 hours.`,
          onConfirm: () => navigate('/'),
          confirmLabel: 'Return to Home'
        });
        setShowModal(true);
        setSuccess(true);
      } else {
        throw new Error(response.data.message || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Submission error details:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit application. Please try again.';
      setModalConfig({
        type: 'error',
        title: 'Submission Failed',
        description: errorMessage,
        onConfirm: null
      });
      setShowModal(true);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed custom success view as it's now handled by the modal

  // Success rendering handled by modal now

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {showSaveNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center animate-bounce">
          <FaSave className="mr-2" />
          Draft saved
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <FaArrowLeft className="mr-2" /> Back
        </button>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 flex justify-between items-center text-white">
            <h2 className="text-2xl font-bold">Apply for {formData.role}</h2>
            <button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving}
              className="flex items-center px-4 py-2 text-sm bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors"
            >
              <FaSave className="mr-2" /> {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md font-medium">{error}</div>}

            {/* Applicant Type Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">I am a:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'student' }))}
                  className={`p-5 border-2 rounded-xl flex items-center justify-center space-x-3 transition-all ${formData.userType === 'student' ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}
                >
                  <FaUserGraduate className="text-2xl" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'non-student' }))}
                  className={`p-5 border-2 rounded-xl flex items-center justify-center space-x-3 transition-all ${formData.userType === 'non-student' ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}
                >
                  <FaUserTie className="text-2xl" />
                  <span>Professional</span>
                </button>
              </div>
            </div>

            {/* Core Info */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Personal Details</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full Legal Name"
                className="w-full border-2 p-4 rounded-xl focus:border-blue-500 outline-none transition-all"
                disabled={!!user}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  className="w-full border-2 p-4 rounded-xl focus:border-blue-500 outline-none transition-all"
                  disabled={!!user}
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone Number (+254...)"
                  className="w-full border-2 p-4 rounded-xl focus:border-blue-500 outline-none transition-all"
                  disabled={!!user}
                />
              </div>
            </div>

            {/* Student Specifics */}
            {formData.userType === 'student' && (
              <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Academic Information</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    placeholder="Adm/Student ID"
                    className="w-full border-2 p-4 rounded-xl focus:border-blue-500 bg-white"
                  />
                  <select
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    className="w-full border-2 p-4 rounded-xl focus:border-blue-500 bg-white"
                  >
                    <option value="">Select University/College</option>
                    {KENYAN_INSTITUTIONS.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                  </select>
                </div>
                {formData.institution === 'Other (Please specify)' && (
                  <input
                    type="text"
                    name="otherInstitution"
                    value={formData.otherInstitution}
                    onChange={handleChange}
                    placeholder="Please specify institution name"
                    className="w-full border-2 p-4 rounded-xl focus:border-blue-500 bg-white"
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label className="block text-xs font-bold mb-2 text-gray-500 uppercase">Student ID (Front)</label>
                    <div className="relative border-2 border-blue-200 rounded-xl p-4 bg-white hover:bg-blue-50 transition-colors text-center cursor-pointer">
                      <FaUpload className="mx-auto text-blue-400 mb-2" />
                      <span className="text-sm font-medium text-gray-600 truncate block">
                        {studentIdFront ? studentIdFront.name : 'Choose File'}
                      </span>
                      <input type="file" onChange={(e) => handleFileChange(e, 'studentFront')} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*,.pdf,.doc,.docx" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-2 text-gray-500 uppercase">Student ID (Back)</label>
                    <div className="relative border-2 border-blue-200 rounded-xl p-4 bg-white hover:bg-blue-50 transition-colors text-center cursor-pointer">
                      <FaUpload className="mx-auto text-blue-400 mb-2" />
                      <span className="text-sm font-medium text-gray-600 truncate block">
                        {studentIdBack ? studentIdBack.name : 'Choose File'}
                      </span>
                      <input type="file" onChange={(e) => handleFileChange(e, 'studentBack')} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*,.pdf,.doc,.docx" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Motivation */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Your Motivation</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={5}
                placeholder="Briefly describe your experience and why you're interested in this role..."
                className="w-full border-2 p-4 rounded-xl focus:border-blue-500 outline-none transition-all"
              />
              <p className="text-right text-xs text-gray-400">{formData.bio.length} characters (Min 50)</p>
            </div>

            {/* Referees */}
            <div className="space-y-6 pt-4 border-t-2 border-gray-100">
              <div className="flex items-center space-x-2">
                <FaUsers className="text-blue-600" />
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Required Referees (2)</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Referee 1</label>
                  <input
                    type="text"
                    name="referee1Name"
                    value={formData.referee1Name}
                    onChange={handleChange}
                    placeholder="Name"
                    className="w-full border-2 p-3 rounded-lg focus:border-blue-500"
                  />
                  <input
                    type="tel"
                    name="referee1Phone"
                    value={formData.referee1Phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className="w-full border-2 p-3 rounded-lg focus:border-blue-500"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Referee 2</label>
                  <input
                    type="text"
                    name="referee2Name"
                    value={formData.referee2Name}
                    onChange={handleChange}
                    placeholder="Name"
                    className="w-full border-2 p-3 rounded-lg focus:border-blue-500"
                  />
                  <input
                    type="tel"
                    name="referee2Phone"
                    value={formData.referee2Phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className="w-full border-2 p-3 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>
            </div>



            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center space-x-3"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <SystemFeedbackModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          // If closing a success modal, navigate home automatically
          if (!open && modalConfig.type === 'success') {
            navigate('/');
          }
        }}
        type={modalConfig.type}
        title={modalConfig.title}
        description={modalConfig.description}
        onConfirm={modalConfig.onConfirm}
        confirmLabel={modalConfig.confirmLabel}
      />
    </div>
  );
}
