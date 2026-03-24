import React, { useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { validateKenyanPhone, PHONE_VALIDATION_ERROR, formatKenyanPhoneInput } from '../../utils/validation'
import SystemFeedbackModal from '../ui/SystemFeedbackModal'

export default function RegisterForm({ onSuccess, initialReferralCode, isModal = false }) {
    const location = useLocation()
    const { setSession } = useAuth()
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', referralCode: initialReferralCode || '' })
    const [error, setError] = useState(location.state?.message || '')
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', description: '', onConfirm: null })

    // OTP step
    const [step, setStep] = useState(location.state?.emailToVerify ? 'verify' : 'register') // 'register' | 'verify'
    const [registeredEmail, setRegisteredEmail] = useState(location.state?.emailToVerify || '')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const otpRefs = useRef([])
    const [resendCooldown, setResendCooldown] = useState(0)
    const [verifying, setVerifying] = useState(false)

    React.useEffect(() => {
        if (initialReferralCode) {
            setForm(prev => ({ ...prev, referralCode: initialReferralCode }));
        }
    }, [initialReferralCode]);

    // Countdown timer for resend cooldown
    React.useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (form.name.trim().split(/\s+/).length < 2) {
            setError('Please provide at least two names (First and Last Name)')
            setLoading(false)
            return
        }

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
            await api.post('/auth/send-registration-otp', { email: form.email })
            setRegisteredEmail(form.email)
            setStep('verify')
            setResendCooldown(60)
        } catch (err) {
            let errorMessage = 'Registration failed. Please check your inputs.';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.request) {
                errorMessage = 'Unable to connect to the server.';
            }
            setModalConfig({ type: 'error', title: 'Registration Failed', description: errorMessage, onConfirm: null });
            setShowModal(true);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return
        const newOtp = [...otp]
        newOtp[index] = value.slice(-1)
        setOtp(newOtp)
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus()
        }
    }

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (pasted.length === 6) {
            setOtp(pasted.split(''))
            otpRefs.current[5]?.focus()
        }
    }

    const handleVerify = async (e) => {
        e.preventDefault()
        const otpString = otp.join('')
        if (otpString.length < 6) {
            setError('Please enter the complete 6-digit code.')
            return
        }
        setVerifying(true)
        setError('')
        try {
            const res = await api.post('/auth/register', { 
                name: form.name,
                email: registeredEmail,
                phone: form.phone,
                password: form.password,
                referralCode: form.referralCode,
                otp: otpString 
            })
            if (res.data.token && res.data.user) {
                await setSession(res.data.token, res.data.user)
            }
            setModalConfig({
                type: 'success',
                title: '🎉 Welcome to Comrades360!',
                description: 'Your email has been verified and your account is ready.',
                confirmLabel: 'Get Started',
                onConfirm: () => {
                    if (onSuccess) onSuccess()
                    else window.location.href = '/'
                }
            })
            setShowModal(true)
        } catch (err) {
            const msg = err.response?.data?.message || 'Verification failed. Please try again.'
            setError(msg)
        } finally {
            setVerifying(false)
        }
    }

    const handleResend = async () => {
        if (resendCooldown > 0) return
        try {
            await api.post('/auth/send-registration-otp', { email: registeredEmail })
            setResendCooldown(60)
            setError('')
            setOtp(['', '', '', '', '', ''])
            otpRefs.current[0]?.focus()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code. Please try again.')
        }
    }

    // ─── OTP Verify Screen ──────────────────────────────────────────────────────
    if (step === 'verify') {
        return (
            <div>
                <div className="text-center mb-6">
                    <div className="text-4xl mb-3">📧</div>
                    <h2 className="text-2xl font-bold mb-1">Check your email</h2>
                    <p className="text-gray-500 text-sm">
                        We sent a 6-digit verification code to<br />
                        <span className="font-semibold text-gray-700">{registeredEmail}</span>
                    </p>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleVerify}>
                    <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => otpRefs.current[i] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleOtpChange(i, e.target.value)}
                                onKeyDown={e => handleOtpKeyDown(i, e)}
                                className="w-11 h-12 text-center text-xl font-bold border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                autoFocus={i === 0}
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={verifying || otp.join('').length < 6}
                        className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {verifying ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-500">
                    Didn't receive a code?{' '}
                    {resendCooldown > 0 ? (
                        <span className="text-gray-400">Resend in {resendCooldown}s</span>
                    ) : (
                        <button onClick={handleResend} className="text-blue-600 hover:underline font-medium">
                            Resend code
                        </button>
                    )}
                </div>
                <div className="mt-2 text-center text-xs text-gray-400">
                    <button onClick={() => setStep('register')} className="hover:underline">← Back to registration</button>
                </div>

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

    // ─── Registration Form ──────────────────────────────────────────────────────
    return (
        <div>
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
