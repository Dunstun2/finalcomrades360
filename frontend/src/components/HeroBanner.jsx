import React from 'react';
import HeroSlider from './HeroSlider';


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
            <div className="w-full h-40 sm:h-56 bg-gradient-to-br from-blue-100 to-blue-200 animate-pulse rounded-lg mb-4" />
        );
    }
    // If we have active dynamic promotions, show the slider instead of static banner
    if (promotions && promotions.length > 0) {
        return <HeroSlider items={promotions} onAddToCart={onAddToCart} />;
    }
    return null;
};

export default HeroBanner;
