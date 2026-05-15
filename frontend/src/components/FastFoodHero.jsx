import React from 'react';
import LiveMenuHero from './LiveMenuHero';
import { resolveImageUrl } from '../utils/imageUtils';
import { FaShoppingCart, FaStar, FaBolt, FaCheckCircle, FaUserGraduate } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../utils/currency';

const FastFoodHero = ({ settings, item, searchTerm, setSearchTerm, onOrder, loading }) => {
    const navigate = useNavigate();
    const location = useLocation();

    if (loading) {
        return (
            <div className="w-full h-60 sm:h-64 md:h-[400px] lg:h-[440px] bg-gradient-to-br from-orange-100 to-orange-200 animate-pulse rounded-2xl sm:rounded-3xl mb-8" />
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
                <div className="flex flex-row w-full h-60 sm:h-64 md:h-[400px] lg:h-[440px]">

                    {/* ── LEFT: Content ── */}
                    <div className="relative w-[55%] sm:w-3/5 h-full flex flex-col justify-between px-3 sm:px-7 md:px-12 py-3 sm:py-5 md:py-9 overflow-hidden bg-gradient-to-br from-[#6d28d9] via-[#b57be0] to-[#7c3aed]">
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
                        <div className="relative z-10 flex flex-col gap-1 overflow-hidden">
                            {/* Badges */}
                            <div className="flex flex-row flex-wrap gap-1 mb-0.5">
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
                                <span className="text-white/75 text-[9px] sm:text-[11px] font-bold uppercase tracking-widest leading-none">
                                    {settings.title}
                                </span>
                            )}

                            {/* Main title */}
                            <h2
                                onClick={handleViewDetails}
                                className="text-white text-base sm:text-2xl md:text-4xl font-extrabold leading-tight tracking-tight cursor-pointer hover:text-amber-100 transition-colors"
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                                {item?.name || settings.title}
                            </h2>

                            {/* Subtitle */}
                            <p
                                className="text-white/95 text-[10px] sm:text-base md:text-lg font-bold leading-tight mt-1 max-w-[90%] drop-shadow-sm"
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
                                <div className="mt-2 sm:mt-4 flex items-center flex-wrap gap-2 sm:gap-4 text-white/90 bg-white/10 w-fit px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                                    {(settings.trustPoints || [
                                        { icon: '🚀', text: 'Fast Delivery' },
                                        { icon: '✅', text: 'Verified' },
                                        { icon: '🎓', text: 'Student Choice' }
                                    ]).map((tp, idx, arr) => (
                                        <React.Fragment key={idx}>
                                            <div className="flex items-center gap-1 sm:gap-1.5">
                                                <span className="text-[10px] sm:text-xs">{tp.icon}</span>
                                                <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight whitespace-nowrap">{tp.text}</span>
                                            </div>
                                    {idx < arr.length - 1 && <div className="w-px h-3 bg-white/20"></div>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}

                            {/* Social Proof Indicator */}
                            <div className="mt-3 sm:mt-5 flex items-center gap-1.5 sm:gap-4 bg-black/20 w-fit p-1 sm:p-2.5 rounded-lg sm:rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl">
                                <div className="flex -space-x-1.5 sm:-space-x-3">
                                    {(() => {
                                        const imgs = [];
                                        if (item?.mainImage) imgs.push(item.mainImage);
                                        if (Array.isArray(item?.images)) {
                                            item.images.forEach(img => {
                                                if (img && !imgs.includes(img)) imgs.push(img);
                                            });
                                        }
                                        while (imgs.length < 4) {
                                            imgs.push(item?.mainImage || settings.image || '/logo192.png');
                                        }
                                        return imgs.slice(0, 4).map((img, i) => (
                                            <div key={i} className="w-4 h-4 sm:w-10 sm:h-10 rounded-full border sm:border-4 border-white shadow-xl overflow-hidden transform hover:scale-110 transition-transform bg-white">
                                                <img src={resolveImageUrl(img)} alt="item" className="w-full h-full object-cover" />
                                            </div>
                                        ));
                                    })()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white text-[7px] sm:text-lg font-black leading-none tracking-tight">
                                        {item?.soldCount > 0 ? `${item.soldCount}+ Orders` : 'Trending Now'}
                                    </span>
                                    <span className="text-white/60 text-[5px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 hidden sm:block">Verified Orders This Week</span>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM: Price + rating + button */}
                        <div className="relative z-10 flex flex-row items-end gap-2 sm:gap-4 mt-auto">
                            {item && (
                                <>
                                    {/* Price block */}
                                    {/* Price block removed */}

                                    {/* Rating badge */}
                                    {item?.rating && (
                                        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/20 text-white rounded-full text-xs font-bold">
                                            <FaStar className="text-yellow-300" />
                                            <span>{item.rating}</span>
                                        </div>
                                    )}

                                    {/* Order Now button (desktop left panel) */}
                                    <button
                                        onClick={handleViewDetails}
                                        className="hidden sm:inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-white text-[#111827] rounded-md font-bold text-sm shadow-md hover:opacity-95 transition ml-auto"
                                    >
                                        Order Now
                                    </button>
                                </>
                            )}

                            {/* No-item: explore CTA */}
                            {!item && settings.title && (
                                <button
                                    onClick={handleViewDetails}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#111827] rounded-md font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition"
                                >
                                    Explore Menu
                                </button>
                            )}
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
                            <div className="w-full flex flex-col items-center gap-1 sm:gap-1.5 py-1.5 sm:py-2.5 px-2 sm:px-3 bg-[#9b59cc]/90 backdrop-blur-sm">
                                {/* Price row removed */}

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
