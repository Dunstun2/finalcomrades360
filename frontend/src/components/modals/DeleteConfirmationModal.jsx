import React, { useState } from 'react';

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ isOpen, onClose, product, onConfirm }) => {
    const [step, setStep] = useState(1)
    const [reason, setReason] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const resetModal = () => {
        setStep(1)
        setReason('')
        setPassword('')
        setLoading(false)
    }

    const handleClose = () => {
        resetModal()
        onClose()
    }

    const handleNext = () => {
        if (step === 1) {
            setStep(2)
        } else if (step === 2) {
            setStep(3)
        } else if (step === 3) {
            handleDelete()
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            // Pass product details including approval status to handler
            await onConfirm(product.id, reason, password, product.approved)
            handleClose()
        } catch (error) {
            // Error handling is usually done by the parent, but we can show alert here for critical failures if needed
            // The parent component should handle specific error messages
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen || !product) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Delete Product</h3>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">&times;</button>
                </div>

                {step === 1 && (
                    <div>
                        <p className="mb-4">Are you sure you want to delete <span className="font-semibold">"{product.name}"</span>?</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">No</button>
                            <button onClick={handleNext} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Yes</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <p className="mb-2 font-medium">Why do you want to delete this product?</p>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow mb-4"
                            rows="3"
                            placeholder="Enter reason for deletion..."
                            required
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">Back</button>
                            <button
                                onClick={handleNext}
                                disabled={!reason.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <p className="mb-2 font-medium">Enter your password to confirm deletion</p>
                        <div className="relative mb-6">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 pr-10 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
                                placeholder="Enter password..."
                                required
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </button>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setStep(2)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={!password || loading}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors min-w-[100px] justify-center"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    'Confirm Delete'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DeleteConfirmationModal
