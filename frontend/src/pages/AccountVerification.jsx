import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaUser, FaMapMarkerAlt, FaEnvelope, FaPhone, FaChevronRight, FaShieldAlt, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import verificationService from '../services/verificationService';
import { useAuth } from '../contexts/AuthContext';

const AccountVerification = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const { updateUser } = useAuth();

    useEffect(() => {
        fetchVerificationStatus();
        
        // Listen for real-time updates
        const handleRealtimeUpdate = (event) => {
            if (event.detail?.scope === 'verification' || event.detail?.scope === 'users') {
                console.log('Real-time verification update received:', event.detail);
                fetchVerificationStatus();
            }
        };

        window.addEventListener('realtime:data-updated', handleRealtimeUpdate);
        return () => window.removeEventListener('realtime:data-updated', handleRealtimeUpdate);
    }, []);

    const fetchVerificationStatus = async () => {
        try {
            setLoading(true);
            const response = await verificationService.getStatus();
            setData(response);

            // Sync with AuthContext to prevent stale redirection
            if (response.isFullyVerified !== undefined) {
                updateUser({ isVerified: response.isFullyVerified });
            }
        } catch (error) {
            console.error('Error fetching verification status:', error);
            toast.error('Failed to load verification status');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading verification status...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Unable to load verification status</p>
                    <button onClick={fetchVerificationStatus} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const { isFullyVerified, checks, completionPercentage, missingSteps } = data;

    const steps = [
        {
            id: 'emailVerified',
            title: 'Verify Email',
            description: 'Confirm your email address',
            icon: <FaEnvelope />,
            link: '/customer/settings',
            state: { tab: 'security', verificationFocus: 'email' },
            complete: checks.emailVerified
        },
        {
            id: 'phoneVerified',
            title: 'Verify Phone',
            description: 'Confirm via SMS code',
            icon: <FaPhone />,
            link: '/customer/settings',
            state: { tab: 'security', verificationFocus: 'phone' },
            complete: checks.phoneVerified
        },
        {
            id: 'nationalIdByAdmin',
            title: 'Upload National ID',
            description: 'Upload a copy of your National ID',
            icon: <FaShieldAlt />,
            link: '/customer/id-upload',
            complete: checks.nationalIdApproved,
            status: checks.nationalIdStatus
        }
    ];

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-0 md:px-4">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium ml-4 md:ml-0"
                >
                    <FaArrowLeft className="mr-2" /> Back
                </button>

                {/* Header */}
                <div className="bg-white md:rounded-lg shadow-lg border-0 md:border border-gray-100 p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                            <FaShieldAlt className="text-3xl text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Account Verification</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-gray-600">Complete all steps to verify your account</p>
                                <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    Real-time
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                            <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Status Badge */}
                    {isFullyVerified ? (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                            <FaCheckCircle className="text-2xl text-green-600" />
                            <div>
                                <p className="font-semibold text-green-900">Account Fully Verified</p>
                                <p className="text-sm text-green-700">All verification requirements completed</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                            <FaTimesCircle className="text-2xl text-yellow-600" />
                            <div>
                                <p className="font-semibold text-yellow-900">Verification Incomplete</p>
                                <p className="text-sm text-yellow-700">{missingSteps.length} step(s) remaining</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Verification Steps */}
                <div className="space-y-4 px-4 md:px-0">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`bg-white md:rounded-lg shadow border-2 p-6 transition-all ${step.complete ? 'border-green-500' : 'border-gray-200 hover:border-blue-300'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step.complete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {step.complete ? <FaCheckCircle className="text-2xl" /> : step.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                                        <p className="text-sm text-gray-600">{step.description}</p>
                                        {step.complete && (
                                            <span className="inline-block mt-1 text-xs font-medium text-green-600">✓ Completed</span>
                                        )}
                                    </div>
                                </div>
                                {!step.complete && (
                                    <>
                                        {step.status === 'pending' ? (
                                            <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                                                Pending Approval
                                            </span>
                                        ) : (
                                            <Link
                                                to={step.link}
                                                state={step.state}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                {step.status === 'rejected' ? 'Re-upload' : 'Complete'}
                                                <FaChevronRight />
                                            </Link>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Refresh Button */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={fetchVerificationStatus}
                        className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors w-full sm:w-auto"
                    >
                        Refresh Status
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        Go to Home
                        <FaChevronRight className="text-sm" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountVerification;
