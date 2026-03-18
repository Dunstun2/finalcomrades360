import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { validateKenyanPhone, PHONE_VALIDATION_ERROR, formatKenyanPhoneInput } from '../../utils/validation'
import SystemFeedbackModal from '../ui/SystemFeedbackModal'

export default function RegisterForm({ onSuccess, initialReferralCode, isModal = false }) {
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', referralCode: initialReferralCode || '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', description: '', onConfirm: null })

    const [success, setSuccess] = useState(false)

    // Update form if initialReferralCode changes (e.g. from props update)
    React.useEffect(() => {
        if (initialReferralCode) {
            setForm(prev => ({ ...prev, referralCode: initialReferralCode }));
        }
    }, [initialReferralCode]);

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        if (form.phone && !validateKenyanPhone(form.phone)) {
            setError(PHONE_VALIDATION_ERROR)
            setLoading(false)
            return
        }

        try {
            await api.post('/auth/register', {
                name: form.name,
                email: form.email,
                phone: form.phone,
                password: form.password,
                referralCode: form.referralCode
            })

            onRegisterSuccess();
        } catch (err) {
            let errorMessage = 'Registration failed. Please check your inputs.';
            if (err.response) {
                const { data } = err.response;
                if (data.errors && Array.isArray(data.errors)) {
                    errorMessage = data.errors.map(e => e.message).join('. ');
                } else if (data.message) {
                    errorMessage = data.message;
                } else if (data.error) {
                    errorMessage = data.error;
                }
            } else if (err.request) {
                errorMessage = 'Unable to connect to the server. Please check your internet connection.';
            } else {
                errorMessage = 'An unexpected error occurred. Please try again.';
            }

            setModalConfig({
                type: 'error',
                title: 'Registration Failed',
                description: errorMessage,
                onConfirm: null
            });
            setShowModal(true);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    const onRegisterSuccess = () => {
        setSuccess(true);
        setModalConfig({
            type: 'success',
            title: 'Welcome to Comrades360!',
            description: 'Your account has been created successfully. You can now log in to your dashboard.',
            confirmLabel: 'Login Now',
            onConfirm: () => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    window.location.href = '/login';
                }
            }
        });
        setShowModal(true);
    };

    return (
        <div>
            {!success && (
                <>
                    <h2 className="text-2xl font-bold mb-4 text-center">Join Comrades360</h2>

                    {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Full Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="john@university.ac.ke"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Phone Number</label>
                            <input
                                type="tel"
                                value={form.phone}
                                onInput={(e) => e.target.value = formatKenyanPhoneInput(e.target.value)}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., 0712345678, 0123456789, or +254712345678"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Password</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block mb-1 font-medium">Confirm Password</label>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Referral Code (Optional)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={form.referralCode}
                                    onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
                                    readOnly={!!initialReferralCode}
                                    className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${initialReferralCode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    placeholder="Enter referral code of the person who invited you"
                                />
                                {initialReferralCode && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-sm">Locked</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This person will earn commission on your future purchases as a secondary referrer.</p>
                        </div>
                        <div className="flex justify-center w-full mt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-1/2 py-3 px-6 rounded-lg shadow-md text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?
                            <Link to="/login" className="text-blue-600 hover:underline ml-1">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </>
            )}

            <SystemFeedbackModal
                open={showModal}
                onOpenChange={setShowModal}
                type={modalConfig.type}
                title={modalConfig.title}
                description={modalConfig.description}
                confirmLabel={modalConfig.confirmLabel || 'Done'}
                onConfirm={modalConfig.onConfirm}
            />
        </div>
    )
}
