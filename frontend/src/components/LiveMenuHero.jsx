import React from 'react';
import { FaSearch } from 'react-icons/fa';

const LiveMenuHero = ({
    title,
    subtitle,
    backgroundImage,
    searchTerm,
    setSearchTerm
}) => {
    // If no promo data, render a simplified search hero
    const hasPromoData = title || subtitle || backgroundImage;

    if (!hasPromoData) {
        return (
            <div className="relative py-8 md:py-16 w-full flex flex-col items-center justify-center text-center px-4 bg-orange-50/30 rounded-3xl mb-8 border border-orange-100">
                <div className="w-full max-w-xl relative group">
                    <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search your favorite bites..."
                        className="w-full bg-white border border-gray-200 h-14 pl-14 pr-6 rounded-2xl shadow-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none text-gray-900 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-[45vh] md:h-[55vh] w-full overflow-hidden rounded-b-[3rem] shadow-2xl mb-8 group">
            <div className="absolute inset-0 bg-black/50 z-10 transition-opacity group-hover:bg-black/40" />
            {backgroundImage && (
                <img
                    src={backgroundImage}
                    alt="Menu Banner"
                    className="w-full h-full object-cover scale-105 animate-slow-zoom"
                />
            )}

            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                <div className="backdrop-blur-md bg-white/10 px-6 py-2 rounded-full border border-white/20 mb-6 animate-fade-in-up">
                    <span className="text-white text-sm font-bold tracking-[0.2em] uppercase">The Ultimate Campus Dining</span>
                </div>
                {title && (
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 animate-fade-in-up delay-100 drop-shadow-lg">
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-8 font-medium animate-fade-in-up delay-200 drop-shadow-md">
                        {subtitle}
                    </p>
                )}

                {/* Search Bar */}
                <div className="w-full max-w-xl relative group animate-fade-in-up delay-300">
                    <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search your favorite bites..."
                        className="w-full bg-white/90 backdrop-blur-xl border-0 h-14 pl-14 pr-6 rounded-2xl shadow-2xl focus:ring-4 focus:ring-orange-500/20 transition-all outline-none text-gray-900 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Wave Shape Divider */}
            <div className="absolute bottom-0 left-0 w-full z-20">
                <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    <path d="M0 100H1440V0C1440 0 1239 50 720 50C201 50 0 0 0 0V100Z" fill="#FDFCFB" />
                </svg>
            </div>

            <style jsx="true">{`
                @keyframes slow-zoom {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }
                .animate-slow-zoom {
                    animation: slow-zoom 20s infinite alternate ease-in-out;
                }
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s forwards ease-out;
                }
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                .delay-300 { animation-delay: 0.3s; }
            `}</style>
        </div>
    );
};

export default LiveMenuHero;
