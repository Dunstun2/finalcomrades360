import React, { useState, useEffect } from 'react';
import LiveMenuHero from '@/modules/fastfood/components/LiveMenuHero';
import { resolveImageUrl } from '@/utils/imageUtils';
import { FaShoppingCart, FaStar, FaBolt, FaCheckCircle, FaUserGraduate } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatPrice } from '@/utils/currency';
import api from '@/shared/services/api';

const FastFoodHero = ({ settings, item, searchTerm, setSearchTerm, onOrder, loading }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [trendingItems, setTrendingItems] = useState([]);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                // Use the public fastfood endpoint directly, matching what FastFood.jsx does
                // The correct database column for performance is 'orderCount', not 'soldCount'
                const response = await api.get('/fastfood?limit=4&sortBy=orderCount&view=public');
                
                let items = [];
                if (response?.data?.success && Array.isArray(response?.data?.data)) {
                    items = response.data.data;
                }
                
                const topItems = items.slice(0, 4);
                if (topItems.length > 0) {
                    setTrendingItems(topItems);
                }
            } catch (error) {
                console.error("Failed to fetch trending items:", error);
            }
        };
        fetchTrending();
    }, []);

    if (loading) {
        return (
            <div className="w-full h-56 sm:h-64 md:h-[350px] lg:h-[380px] bg-gradient-to-br from-orange-100 to-orange-200 animate-pulse rounded-2xl sm:rounded-3xl mb-8" />
        );
    }

    const backgroundThemes = [
        { pattern: "radial-gradient(circle, #f59e0b 1.5px, transparent 1.5px)", backgroundSize: "24px 24px", opacity: "0.15" },
        { pattern: "linear-gradient(45deg, #059669 0.5px, transparent 0.5px), linear-gradient(-45deg, #059669 0.5px, transparent 0.5px)", backgroundSize: "30px 30px", opacity: "0.1" },
        { pattern: "linear-gradient(90deg, #dc2626 1px, transparent 1px), linear-gradient(#dc2626 1px, transparent 1px)", backgroundSize: "45px 45px", opacity: "0.08" },
        { pattern: "repeating-linear-gradient(45deg, #475569 0, #475569 1px, transparent 0, transparent 20px)", backgroundSize: "20px 20px", opacity: "0.05" },
        { pattern: "radial-gradient(circle at center, #d97706 1px, transparent 1px)", backgroundSize: "16px 16px", opacity: "0.12" },
        { pattern: "linear-gradient(135deg, #7c3aed 1px, transparent 1px)", backgroundSize: "25px 25px", opacity: "0.1" },
    ];

    const getTheme = (id) => {
        if (!id) return backgroundThemes[0];
        const idStr = String(id);
        const numericPart = idStr.includes('_') ? idStr.split('_').pop() : idStr;
        const index = isNaN(Number(numericPart)) ? 0 : Number(numericPart) % backgroundThemes.length;
        return backgroundThemes[index] || backgroundThemes[0];
    };

    // Split layout: item linked OR manual campaign with title
    if ((item || (settings.type === 'manual' && settings.title)) && settings.type !== 'manual_image_only') {
        const activeTheme = getTheme(item?.id || settings.id);

        const handleViewDetails = () => {
            if (item) navigate(`/fastfood/${item.id}`, { state: { from: location.pathname } });
        };

        const originalPrice = Number(item?.displayPrice || 0);
        const finalPrice = Number(item?.discountPrice || originalPrice);
        const hasDiscount = Number(item?.discountPercentage || 0) > 0 && finalPrice < originalPrice;

        const itemImage = item?.mainImage ? resolveImageUrl(item.mainImage, null, item.updatedAt) : null;
        const displayImage = itemImage || settings.image;

        return (
            <div className="relative w-full overflow-hidden group rounded-2xl sm:rounded-3xl shadow-2xl mb-8">
                {/* Fixed height matching HeroSlider */}
                <div className="flex flex-row w-full h-56 sm:h-64 md:h-[350px] lg:h-[380px]">

                    {/* ── LEFT: Content ── */}
                    <div className="relative w-[55%] sm:w-3/5 h-full flex flex-col justify-between px-3 sm:px-7 md:px-12 py-1.5 sm:py-4 md:py-6 overflow-hidden bg-gradient-to-br from-[#6d28d9] via-[#b57be0] to-[#7c3aed]">
                        {/* Pattern overlay */}
                        <div
                            className="absolute inset-0 pointer-events-none mix-blend-overlay"
                            style={{
                                backgroundImage: activeTheme.pattern,
                                backgroundSize: activeTheme.backgroundSize,
                                opacity: activeTheme.opacity || '0.06',
                            }}
                        />

                        {/* TOP: Badges + title + subtitle */}
                        <div className="relative z-10 flex flex-col gap-0.5 sm:gap-2">
                            {/* Badges */}
                            <div className="flex flex-row flex-wrap gap-1 mb-0 sm:mb-0.5">
                                {(item || settings.title) && (
                                    <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 bg-white/20 text-white text-[9px] sm:text-[11px] font-bold tracking-widest uppercase rounded-full backdrop-blur-sm border border-white/10">
                                        {item ? 'Fast Food Feature' : 'Special Campaign'}
                                    </span>
                                )}
                                <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 bg-amber-400 text-black text-[9px] sm:text-[11px] font-black tracking-tighter uppercase rounded-full shadow-lg transform rotate-2">
                                    🔥 Fresh & Hot
                                </span>
                                {hasDiscount && (
                                    <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 bg-white text-[#f59e0b] text-[9px] sm:text-[11px] font-bold rounded-full">
                                        Save {item.discountPercentage}%
                                    </span>
                                )}
                            </div>

                            {/* Campaign label above item name - only show if distinct from item name */}
                            {settings.title && item && 
                             !settings.title.toLowerCase().includes(item.name.toLowerCase()) && 
                             !item.name.toLowerCase().includes(settings.title.toLowerCase().split(' ')[0]) && (
                                <span className="text-white/75 text-[9px] sm:text-[11px] font-bold uppercase tracking-widest leading-none flex-shrink-0">
                                    {settings.title}
                                </span>
                            )}

                            {/* Main title */}
                            <h2
                                onClick={handleViewDetails}
                                className="text-white text-sm sm:text-xl md:text-3xl font-extrabold leading-snug tracking-tight cursor-pointer hover:text-amber-100 transition-colors flex-shrink-0"
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                                {item?.name || settings.title}
                            </h2>

                            {/* Subtitle */}
                            <p
                                className="text-white/95 text-[10px] sm:text-base md:text-lg font-bold leading-tight mt-0 sm:mt-1 max-w-[90%] drop-shadow-sm flex-shrink-0"
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                                {settings.subtitle || item?.shortDescription || "Deliciously prepared for you."}
                            </p>

                            {/* Trust & Speed Bar */}
                            {(settings.trustPoints || [
                                { icon: '🚀', text: 'Fast Delivery' },
                                { icon: '✅', text: 'Verified' },
                                { icon: '🎓', text: 'Student Choice' }
                            ]).length > 0 && (
                                <div className="mt-0.5 sm:mt-1 flex items-center flex-nowrap gap-0.5 sm:gap-4 text-white/90 bg-white/10 w-fit px-0.5 sm:px-3 py-0.5 sm:py-1 rounded-lg backdrop-blur-sm border border-white/10">
                                    {(settings.trustPoints || [
                                        { icon: '🚀', text: 'Fast Delivery' },
                                        { icon: '✅', text: 'Verified' },
                                        { icon: '🎓', text: 'Student Choice' }
                                    ]).map((tp, idx, arr) => (
                                        <React.Fragment key={idx}>
                                            <div className="flex items-center gap-[1px] sm:gap-1.5 flex-shrink-0">
                                                <span className="text-[7px] sm:text-xs">{tp.icon}</span>
                                                <span className="text-[5px] sm:text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{tp.text}</span>
                                            </div>
                                    {idx < arr.length - 1 && <div className="w-px h-2 sm:h-3 bg-white/30"></div>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}

                            {/* Social Proof Indicator */}
                            <div className="flex mt-0 sm:mt-2 items-center gap-1 sm:gap-4 bg-black/20 w-fit p-1 sm:p-2.5 rounded-lg sm:rounded-2xl backdrop-blur-md border border-white/10 shadow-xl flex-shrink-0">
                                <div className="flex -space-x-1.5 sm:-space-x-3">
                                    {(() => {
                                        let displayItems = trendingItems.length > 0 ? [...trendingItems] : [];
                                        
                                        // Fallback if no trending items are found yet
                                        if (displayItems.length === 0) {
                                            const fallbackImgs = [];
                                            if (item?.mainImage) fallbackImgs.push(item.mainImage);
                                            if (Array.isArray(item?.images)) {
                                                item.images.forEach(img => {
                                                    if (img && !fallbackImgs.includes(img)) fallbackImgs.push(img);
                                                });
                                            }
                                            while (fallbackImgs.length < 4) {
                                                fallbackImgs.push(item?.mainImage || settings.image || '/logo192.png');
                                            }
                                            displayItems = fallbackImgs.map(img => ({ mainImage: img, name: item?.name || '' }));
                                        }
                                        
                                        // Ensure exactly 4 items for the UI by looping if needed
                                        while (displayItems.length > 0 && displayItems.length < 4) {
                                            displayItems.push(displayItems[displayItems.length - 1]);
                                        }
                                        
                                        return displayItems.slice(0, 4).map((tItem, i) => (
                                            <div 
                                                key={i} 
                                                title={tItem.name || 'Trending Item'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (tItem.name && setSearchTerm) {
                                                        setSearchTerm(tItem.name);
                                                        // Scroll to results slightly down the page
                                                        window.scrollTo({ top: window.innerHeight * 0.5, behavior: 'smooth' });
                                                    }
                                                }}
                                                className="w-3 h-3 sm:w-10 sm:h-10 rounded-full border sm:border-4 border-white shadow-xl overflow-hidden bg-white flex-shrink-0 cursor-pointer hover:scale-110 hover:border-amber-400 transition-all z-20 relative"
                                            >
                                                <img src={resolveImageUrl(tItem.mainImage)} alt={tItem.name || 'trending'} className="w-full h-full object-cover" />
                                            </div>
                                        ));
                                    })()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white text-[7px] sm:text-lg font-black leading-none tracking-tight whitespace-nowrap">
                                        {item?.soldCount > 0 ? `${item.soldCount}+ Orders` : 'Trending Now'}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── RIGHT: Image + Price + Buy Now ── */}
                    <div className="relative w-[45%] sm:w-2/5 h-full flex flex-col overflow-hidden">
                        {/* Image fills the top */}
                        <div className="relative flex-1 overflow-hidden">
                            <img
                                src={displayImage}
                                alt={item?.name || settings.title || 'Campaign'}
                                className="absolute inset-0 w-full h-full object-cover object-center"
                            />
                            {/* Discount badge over image */}
                            {hasDiscount && (
                                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 bg-[#f59e0b] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black shadow-lg rotate-6">
                                    -{item.discountPercentage}%
                                </div>
                            )}
                        </div>

                        {/* Price + Buy Now pinned below image */}
                        {item && (
                            <div className="w-full flex flex-col items-center gap-1 sm:gap-1.5 py-1 sm:py-2 px-2 sm:px-3 bg-[#9b59cc]/90 backdrop-blur-sm">
                                {/* Price row */}
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-xs sm:text-lg font-black">
                                        {formatPrice(finalPrice)}
                                    </span>
                                    {hasDiscount && (
                                        <span className="text-white/50 text-[10px] sm:text-xs line-through">
                                            {formatPrice(originalPrice)}
                                        </span>
                                    )}
                                </div>

                                {/* Buy Now button */}
                                <button
                                    onClick={handleViewDetails}
                                    className="w-full flex items-center justify-center gap-2 py-2 sm:py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg sm:rounded-xl font-black text-[10px] sm:text-base shadow-[0_8px_20px_rgba(245,158,11,0.4)] hover:from-amber-500 hover:to-orange-600 hover:scale-[1.02] active:scale-95 transition-all border-b-2 sm:border-b-4 border-orange-700"
                                >
                                    <FaShoppingCart className="text-[10px] sm:text-lg" />
                                    BUY NOW
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <style jsx="true">{`
                    @keyframes fade-in-up {
                        0% { opacity: 0; transform: translateY(20px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-up { animation: fade-in-up 0.8s forwards ease-out; }
                `}</style>
            </div>
        );
    }

    // Default / image-only mode
    return (
        <LiveMenuHero
            title={settings.title}
            subtitle={settings.subtitle}
            backgroundImage={settings.image}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
        />
    );
};

export default FastFoodHero;
