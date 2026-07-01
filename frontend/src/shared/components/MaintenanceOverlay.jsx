import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPause, FaRocket, FaHome, FaArrowRight } from 'react-icons/fa';

/**
 * MaintenanceOverlay
 * A premium, non-blocking overlay that preserves the background state.
 * It blurs the content and prevents interaction without destroying the page.
 */
export default function MaintenanceOverlay({ 
    isVisible, 
    message = "This section is temporarily offline for maintenance.",
    isDashboard = false,
    returnPath = '/'
}) {
    const navigate = useNavigate();

    if (!isVisible) return null;

    return (
        <div 
            className="absolute inset-0 z-40 flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-500"
            style={{ 
                backdropFilter: 'blur(10px) saturate(180%)',
                backgroundColor: 'rgba(255, 255, 255, 0.7)'
            }}
        >
            <div className="max-w-md w-full bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl p-8 text-center relative overflow-hidden group">
                {/* Decorative background elements */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl group-hover:bg-blue-200/50 transition-colors duration-1000" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-100/50 rounded-full blur-3xl group-hover:bg-orange-200/50 transition-colors duration-1000" />
                
                {/* Icon Header */}
                <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl rotate-12 flex items-center justify-center mx-auto shadow-xl shadow-blue-200 animate-bounce">
                        <FaPause className="text-white text-3xl -rotate-12" />
                    </div>
                </div>

                {/* Status Badge */}
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-gray-100 rounded-full mb-6 border border-gray-200">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Paused</span>
                </div>

                {/* Content */}
                <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight leading-none">
                    Session on Hold
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-8 px-4 font-medium">
                    {message} <br/> 
                    <span className="text-blue-600 italic">"Don't worry, your progress is safe. We will resume automatically."</span>
                </p>

                {/* Action Choices */}
                <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-left flex items-start space-x-3">
                        <div className="mt-1 bg-blue-600 text-white rounded-full p-1 shadow-md">
                            <FaRocket size={10} />
                        </div>
                        <p className="text-[11px] text-blue-800 font-bold leading-tight">
                            Status: <span className="animate-pulse">Waiting for admin signal...</span>
                            <br/>
                            <span className="font-normal opacity-80">You can stay here and we'll unlock this page the moment it's back.</span>
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button 
                            onClick={() => navigate('/')}
                            className="flex-1 flex items-center justify-center space-x-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200"
                        >
                            <FaHome />
                            <span>BACK TO HOME</span>
                        </button>
                        
                        <button 
                            onClick={() => navigate('/search')}
                            className="flex-1 flex items-center justify-center space-x-2 bg-white text-gray-900 border-2 border-gray-900 px-6 py-3.5 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all active:scale-95 group"
                        >
                            <span>MARKETPLACE</span>
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Footer Info */}
                <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    Comrades360 State-Preservation System v2.0
                </p>
            </div>
        </div>
    );
}
