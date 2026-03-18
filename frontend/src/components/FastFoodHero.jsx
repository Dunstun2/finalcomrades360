import React from 'react';
import LiveMenuHero from './LiveMenuHero';
import FastFoodCard from './FastFoodCard';
import { Button } from './ui/button';
import OptimizedImageWithCDN from './OptimizedImageWithCDN';
import { resolveImageUrl } from '../utils/imageUtils';
import { FaShoppingCart, FaStar } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../utils/currency';

const FastFoodHero = ({ settings, item, searchTerm, setSearchTerm, onOrder, loading }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Show shimmer/placeholder if loading
    if (loading) {
        return (
            <div className="w-full h-40 sm:h-56 bg-gradient-to-br from-orange-100 to-orange-200 animate-pulse rounded-lg mb-4" />
        );
    }
    // Background Themes (Gradient + Pattern + Texture)
    const backgroundThemes = [
        {
            name: 'Sunny Grid',
            gradient: "bg-gradient-to-br from-amber-50 to-orange-100",
            pattern: "radial-gradient(circle, #f59e0b 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            opacity: "0.15"
        },
        {
            name: 'Fresh Mint',
            gradient: "bg-gradient-to-br from-emerald-50 to-green-100",
            pattern: "linear-gradient(45deg, #059669 0.5px, transparent 0.5px), linear-gradient(-45deg, #059669 0.5px, transparent 0.5px)",
            backgroundSize: "30px 30px",
            opacity: "0.1"
        },
        {
            name: 'Red Hot',
            gradient: "bg-gradient-to-br from-red-50 to-rose-100",
            pattern: "linear-gradient(90deg, #dc2626 1px, transparent 1px), linear-gradient(#dc2626 1px, transparent 1px)",
            backgroundSize: "45px 45px",
            opacity: "0.08"
        },
        {
            name: 'Royal Stone',
            gradient: "bg-gradient-to-br from-slate-50 to-stone-200",
            pattern: "repeating-linear-gradient(45deg, #475569 0, #475569 1px, transparent 0, transparent 20px)",
            backgroundSize: "20px 20px",
            opacity: "0.05"
        },
        {
            name: 'Deep Amber',
            gradient: "bg-gradient-to-br from-yellow-50 to-amber-200",
            pattern: "radial-gradient(circle at center, #d97706 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            opacity: "0.12"
        },
        {
            name: 'Soft Violet',
            gradient: "bg-gradient-to-br from-violet-50 to-purple-100",
            pattern: "linear-gradient(135deg, #7c3aed 1px, transparent 1px)",
            backgroundSize: "25px 25px",
            opacity: "0.1"
        }
    ];

    const getTheme = (id) => {
        if (!id) return backgroundThemes[0];
        // For campaign IDs like "camp_123", extract the numeric part or hash it
        const idStr = String(id);
        const numericPart = idStr.includes('_') ? idStr.split('_').pop() : idStr;
        const index = isNaN(Number(numericPart)) ? 0 : Number(numericPart) % backgroundThemes.length;
        return backgroundThemes[index] || backgroundThemes[0];
    };

    // Show Split Layout if:
    // - Linked to an item 
    // - OR explicitly marked as 'manual' type 
    // AND NOT 'manual_image_only'
    // 1. Featured Item Mode (Split View)
    // Only show split view if we have an actual item or a manual title.
    if ((item || (settings.type === 'manual' && settings.title)) && settings.type !== 'manual_image_only') {
        const activeTheme = getTheme(item?.id || settings.id);

        // "Buy Now" opens the detail page; adding to cart is handled there
        const handleViewDetails = () => {
            if (item) navigate(`/fastfood/${item.id}`, { state: { from: location.pathname } });
        };

        // Standardized Price Calculation
        const originalPrice = Number(item?.displayPrice || 0);
        const finalPrice = Number(item?.discountPrice || originalPrice);
        const hasDiscount = Number(item?.discountPercentage || 0) > 0 && finalPrice < originalPrice;

        // Image Resolution
        const itemImage = item?.mainImage ? resolveImageUrl(item.mainImage, null, item.updatedAt) : null;
        const displayImage = itemImage || settings.image;
        return (
            <div className="relative w-full overflow-hidden group rounded-2xl sm:rounded-3xl shadow-2xl mb-8">
                <div className="flex flex-row w-full h-60 sm:h-64 md:min-h-[500px] overflow-hidden">
                    {/* Left Content Side - always visible */}
                    <div className="relative w-[55%] sm:w-3/5 h-auto sm:h-full px-2 sm:px-8 md:px-12 py-4 sm:py-8 md:py-12 flex flex-col justify-between animate-fade-in-up overflow-hidden min-h-[220px] sm:min-h-[350px] bg-[#b57be0]">
                        {/* Theme Pattern Overlay */}
                        <div
                            className="absolute inset-0 pointer-events-none mix-blend-overlay"
                            style={{
                                backgroundImage: activeTheme.pattern,
                                backgroundSize: activeTheme.backgroundSize,
                                opacity: activeTheme.opacity || '0.06'
                            }}
                        />
                        {/* Content Card */}
                        <div className="flex flex-col h-full justify-between relative z-10">
                            {/* Top Badges */}
                            <div className="flex flex-row flex-wrap gap-2 mb-2">
                                {(item || settings.title) && (
                                    <span className="inline-flex items-center px-3 py-1 bg-white/20 text-white text-xs font-bold tracking-widest uppercase rounded-full backdrop-blur-sm">
                                        {item ? 'Fast Food Feature' : 'Special Campaign'}
                                    </span>
                                )}
                                {hasDiscount && (
                                    <span className="inline-flex items-center px-3 py-1 bg-white text-[#f59e0b] text-xs font-bold rounded-full">
                                        Save {item.discountPercentage}%
                                    </span>
                                )}
                            </div>
                            {/* Title & Subtitle */}
                            <div className="flex flex-col gap-1 max-w-[95%] mt-2">
                                {settings.title && item && (
                                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">
                                        {settings.title}
                                    </span>
                                )}
                                <h2
                                    onClick={handleViewDetails}
                                    className="text-white text-2xl md:text-4xl font-extrabold leading-tight tracking-tight break-words cursor-pointer hover:text-amber-100 transition-colors mb-1"
                                >
                                    {item?.name || settings.title}
                                </h2>
                                <p className="text-white/90 text-base md:text-lg font-medium leading-snug break-words max-w-[90%]">
                                    {settings.subtitle || item?.shortDescription}
                                </p>
                            </div>
                            {/* Price, Actions, and Rating */}
                            <div className="flex flex-row items-end gap-6 mt-2 mb-2">
                                {item && (
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="bg-[#ff9f1a] text-white rounded-md px-4 py-2 shadow-lg min-w-[120px]">
                                            {hasDiscount && (
                                                <span className="block text-xs text-white/80 line-through font-bold leading-none">
                                                    {formatPrice(originalPrice).replace('KSh', 'KSH')}
                                                </span>
                                            )}
                                            <span className="block text-2xl md:text-3xl font-black leading-none tracking-tight">
                                                {formatPrice(finalPrice).replace('KSh', 'KSH')}
                                            </span>
                                        </div>
                                        {item?.rating && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/20 text-white rounded-full text-xs font-bold mt-2">
                                                <FaStar className="text-yellow-300" />
                                                <span>{item.rating}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleViewDetails}
                                        className="inline-flex items-center gap-2 px-5 py-2 bg-white text-[#111827] rounded-md font-bold text-base shadow-md hover:opacity-95 transition"
                                    >
                                        {item ? 'Buy Now' : 'Explore Menu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Right Image/Card Side */}
                    <div className="relative w-[45%] sm:w-[48%] h-full flex items-center justify-center animate-fade-in-up delay-300 overflow-hidden bg-transparent">
                        {/* On mobile, show FastFoodCard; on desktop, show image */}
                        <div className="block sm:hidden w-full h-full px-0 pt-2 pb-4 flex flex-col h-full">
                            {item && (
                                <div className="flex flex-col h-full w-full">
                                    <FastFoodCard
                                        item={item}
                                        clickable={false}
                                        renderActions={() => null}
                                        className="w-full h-full flex flex-col"
                                        hideImageBadges={true}
                                        hideTitle={true}
                                        imageHeight=""
                                        contentClassName=""
                                        style={{height: '100%', display: 'flex', flexDirection: 'column'}} // force full height
                                    />
                                </div>
                            )}
                            {/* If no item, fallback to image */}
                            {!item && (
                                <img
                                    src={displayImage}
                                    alt={settings.title || 'Banner'}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                            )}
                        </div>
                        <img
                            src={displayImage}
                            alt={settings.title || item?.name || 'Banner'}
                            className="hidden sm:block absolute left-0 top-0 w-full h-full object-cover object-center z-0 rounded-none"
                        />
                    </div>
                </div>
                <style jsx="true">{`
                    @keyframes fade-in-up {
                        0% { opacity: 0; transform: translateY(20px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-up { animation: fade-in-up 0.8s forwards ease-out; }
                    .delay-100 { animation-delay: 0.1s; }
                    .delay-200 { animation-delay: 0.2s; }
                    .delay-300 { animation-delay: 0.3s; }
                `}</style>
            </div>
        );
    }

    // Default / Image Mode
    return (
        <LiveMenuHero
            title={settings.title}
            subtitle={settings.subtitle}
            backgroundImage={settings.image}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
        />
    );
}

export default FastFoodHero;
