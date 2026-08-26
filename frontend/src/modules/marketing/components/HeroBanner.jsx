import React from 'react';
import HeroSlider from '@/modules/marketing/components/HeroSlider';


const HeroBanner = ({
    title = "Welcome to Comrades360",
    subtitle = "Your campus marketplace for products and services",
    apiStatus = 'connected',
    onRetry = null,
    promotions = [],
    onAddToCart = null,
    loading = false
}) => {
    if (loading) {
        return (
            <div className="w-full h-52 sm:h-64 bg-gradient-to-br from-blue-100 to-blue-200 animate-pulse mb-4" />
        );
    }
    // If we have active dynamic promotions, show the slider instead of static banner
    if (promotions && promotions.length > 0) {
        return <HeroSlider items={promotions} onAddToCart={onAddToCart} />;
    }

    // No promotions — show static fallback banner
    return (
        <div className="w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
                <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-10 sm:py-16 md:py-20">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg">
                    {title}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-blue-100 max-w-2xl mb-4 sm:mb-6 drop-shadow">
                    {subtitle}
                </p>
                <div className="flex flex-row gap-3">
                    <a href="/products" className="px-5 py-2 sm:px-6 sm:py-3 bg-white text-blue-700 font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm sm:text-base">
                        Shop Now
                    </a>
                    <a href="/services" className="px-5 py-2 sm:px-6 sm:py-3 bg-white/20 backdrop-blur text-white font-semibold rounded-lg border border-white/30 hover:bg-white/30 hover:scale-105 transition-all text-sm sm:text-base">
                        Our Services
                    </a>
                </div>
            </div>
        </div>
    );
};

export default HeroBanner;
