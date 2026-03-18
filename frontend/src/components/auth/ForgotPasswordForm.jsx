import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { formatKenyanPhoneInput } from '../../utils/validation'

function useQuery() {
    const { search } = useLocation()
    return useMemo(() => new URLSearchParams(search), [search])
}

export default function ForgotPasswordForm({ isModal = false }) {
    const q = useQuery()
    const navigate = useNavigate()
    const [step, setStep] = useState('request') // 'request' | 'confirm'
    const [email, setEmail] = useState('')
    const [token, setToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const e = q.get('email')
        if (e) setEmail(e)
    }, [q])

    const handleRequest = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)
        try {
            await api.post('/password-reset/request', { email })
            setMessage('If that email exists, a reset code has been sent. Check your inbox or phone.')
            setStep('confirm')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to request password reset')
        } finally {
            setLoading(false)
        }
    }

    const handleConfirm = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)
        try {
            if (newPassword !== confirmPassword) {
                setLoading(false)
                return setError('Passwords do not match.')
            }
            await api.post('/password-reset/confirm', { token, newPassword })
            setMessage('Password has been reset. Redirecting to login...')

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                navigate('/login', {
                    state: {
                        message: 'Password reset successful! You can now log in with your new password.',
                        email: email
                    }
                })
            }, 2000)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            {!isModal && (
                <>
                    <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
                    <p className="text-gray-600 mb-6">Reset access to your account securely.</p>
                </>
            )}

            {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</div>}
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

            {step === 'request' && (
                <form onSubmit={handleRequest}>
                    <div className="mb-4">
                        <label className="block mb-1 font-medium">Email or Phone Number</label>
                        <input
                            type="text"
                            value={email}
                            onInput={(e) => {
                                // If input contains only digits and plus, treat as potential phone and format
                                if (/^[\d+]+$/.test(e.target.value)) {
                                    e.target.value = formatKenyanPhoneInput(e.target.value)
                                }
                            }}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="your.email@university.ac.ke or 0712345678"
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full btn disabled:opacity-50 py-3 rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                        {loading ? 'Sending...' : 'Send Reset Code'}
                    </button>
                </form>
            )}

            {step === 'confirm' && (
                <form onSubmit={handleConfirm}>
                    <div className="mb-4">
                        <label className="block mb-1 font-medium">Reset Code</label>
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block mb-1 font-medium">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block mb-1 font-medium">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full btn disabled:opacity-50 py-3 rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    )
}
