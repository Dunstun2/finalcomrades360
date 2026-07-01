import React, { useState } from 'react';
import { FaHeadset, FaQuestionCircle, FaShieldAlt, FaPhoneAlt, FaEnvelope, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-gray-200 rounded-lg">
            <button
                className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-medium text-gray-900">{question}</span>
                {isOpen ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
            </button>
            {isOpen && (
                <div className="px-6 pb-4 text-gray-600 border-t border-gray-100 pt-4">
                    {answer}
                </div>
            )}
        </div>
    );
};

const DeliverySupport = () => {
    const faqs = [
        {
            question: "How do I get paid?",
            answer: "We process payments weekly every Tuesday directly to your M-Pesa or Bank account. You can track your earnings in the Earnings tab."
        },
        {
            question: "What if I can't find the customer?",
            answer: "Try calling the customer through the app masked number. If they don't answer after 3 attempts and 10 minutes, contact support for further instructions."
        },
        {
            question: "How do I update my vehicle information?",
            answer: "Go to your Account page, click 'Edit Profile', and scroll down to the Vehicle Details section to update your vehicle type, plate, or model."
        },
        {
            question: "Why am I not getting any orders?",
            answer: "Ensure you are in a high-demand zone ('Hotspot') and your internet connection is stable. Also check if your vehicle documents are up to date."
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-blue-600 rounded-lg shadow-lg p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">How can we help you?</h1>
                    <p className="text-blue-100">Find answers or contact our support team 24/7</p>
                </div>
                <FaHeadset className="absolute right-4 bottom-[-10px] text-blue-500 opacity-30 h-40 w-40" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {/* Contact Cards */}
                <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaPhoneAlt className="text-green-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Call Support</h3>
                    <p className="text-gray-500 text-sm mb-4">Available 24/7 for urgent issues</p>
                    <a href="tel:0757588395" className="text-blue-600 font-medium hover:underline">0757588395</a>
                </div>

                <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaEnvelope className="text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Email Support</h3>
                    <p className="text-gray-500 text-sm mb-4">For general inquiries and documents</p>
                    <a href="mailto:wambutsidunstun@gmail.com" className="text-blue-600 font-medium hover:underline">wambutsidunstun@gmail.com</a>
                </div>

                <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaShieldAlt className="text-red-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Emergency</h3>
                    <p className="text-gray-500 text-sm mb-4">Accidents or safety concerns</p>
                    <button className="text-red-600 font-medium hover:underline">Report Safety Issue</button>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 flex items-center space-x-2">
                    <FaQuestionCircle className="text-gray-400" />
                    <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
                </div>
                <div className="p-6 space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>

            {/* Policies */}
            <div className="text-center text-sm text-gray-500 space-x-6">
                <a href="#" className="hover:text-gray-900">Terms of Service</a>
                <a href="#" className="hover:text-gray-900">Privacy Policy</a>
                <a href="#" className="hover:text-gray-900">Safety Guidelines</a>
            </div>
        </div>
    );
};

export default DeliverySupport;
