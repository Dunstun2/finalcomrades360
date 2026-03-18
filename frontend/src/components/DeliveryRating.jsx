import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import api from '../services/api';

const DeliveryRating = ({ orderId, onRated }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('Please select a rating');
            return;
        }

        try {
            setSubmitting(true);
            await api.post(`/orders/${orderId}/rate-delivery`, { rating, review });
            setSubmitted(true);
            if (onRated) onRated(rating, review);
        } catch (error) {
            console.error('Failed to submit rating:', error);
            alert(error.response?.data?.error || 'Failed to submit rating');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">✓ Thank you for rating your delivery!</p>
                <p className="text-sm text-green-600 mt-1">Your feedback helps us improve our service.</p>
            </div>
        );
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Rate Your Delivery Experience</h4>

            <div className="flex items-center space-x-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                    >
                        <FaStar
                            className={`h-8 w-8 transition-colors ${star <= (hover || rating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                        />
                    </button>
                ))}
                {rating > 0 && (
                    <span className="ml-2 text-sm font-medium text-gray-700">
                        {rating} star{rating !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience (optional)"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
            />

            <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
                {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
        </div>
    );
};

export default DeliveryRating;
