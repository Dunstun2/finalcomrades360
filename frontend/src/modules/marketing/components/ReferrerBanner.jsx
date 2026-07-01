import React from 'react';
import { FaUserTag, FaTimes } from 'react-icons/fa';

const ReferrerBanner = ({ referrerName, onClear }) => {
    if (!referrerName) return null;

    return (
        <div className="bg-blue-50 border-b border-blue-100 py-2 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center text-blue-800 text-sm font-medium">
                    <FaUserTag className="mr-2 text-blue-500" />
                    <span>You are shopping with <span className="font-bold">{referrerName}</span></span>
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] uppercase rounded font-bold tracking-wider">Marketer</span>
                </div>
                <button
                    onClick={onClear}
                    className="text-blue-400 hover:text-blue-600 transition-colors p-1"
                    title="Dismiss"
                >
                    <FaTimes size={12} />
                </button>
            </div>
        </div>
    );
};

export default ReferrerBanner;
