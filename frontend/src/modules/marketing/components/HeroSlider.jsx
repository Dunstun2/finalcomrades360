import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaShoppingCart, FaPlay, FaVolumeUp, FaVolumeMute, FaFire, FaArrowRight } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { resolveImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils';
import { useCart } from '@/contexts/CartContext';

const HeroSlider = ({ items = [], onAddToCart = null }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [videoMuted, setVideoMuted] = useState(true);
    const [videoPlaying, setVideoPlaying] = useState(true);
    const [tiktokAutoplayAttempted, setTiktokAutoplayAttempted] = useState(false);

    // Touch & Swipe gesture state
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const touchStartY = useRef(0);
    const touchEndY = useRef(0);
    const mouseStartX = useRef(0);
    const isMouseDown = useRef(false);

    const videoRef = useRef(null);
    const iframeRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();

    const nextSlide = useCallback(() => {
        if (!items || items.length <= 1) return;
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setVideoPlaying(true);
        setTiktokAutoplayAttempted(false);
    }, [items]);

    const prevSlide = useCallback(() => {
        if (!items || items.length <= 1) return;
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
        setVideoPlaying(true);
        setTiktokAutoplayAttempted(false);
    }, [items]);

    // Touch Gesture Handlers
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
        touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const diffX = touchStartX.current - touchEndX.current;
        const diffY = touchStartY.current - touchEndY.current;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
            if (diffX > 0) nextSlide();
            else prevSlide();
        }
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    // Mouse Drag Handlers
    const handleMouseDown = (e) => {
        isMouseDown.current = true;
        mouseStartX.current = e.clientX;
    };

    const handleMouseUp = (e) => {
        if (!isMouseDown.current) return;
        isMouseDown.current = false;
        const diffX = mouseStartX.current - e.clientX;
        if (Math.abs(diffX) > 60) {
            if (diffX > 0) nextSlide();
            else prevSlide();
        }
    };

    useEffect(() => {
        if (!isAutoPlaying || items.length <= 1) return;
        const interval = setInterval(nextSlide, 6000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, nextSlide, items.length]);

    // Video control effect
    useEffect(() => {
        if (videoRef.current) {
            if (videoPlaying) {
                videoRef.current.play().catch(() => {});
            } else {
                videoRef.current.pause();
            }
        }
    }, [videoPlaying, currentIndex]);

    // Embed URL helper
    const getVideoEmbedUrl = (url) => {
        if (!url || url === 'null' || url === 'undefined') return null;

        const cleanUrl = typeof url === 'string' ? url.trim() : String(url);

        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const youtubeMatch = cleanUrl.match(youtubeRegex);
        if (youtubeMatch && youtubeMatch[1]) {
            return {
                type: 'youtube',
                url: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=${videoMuted ? 1 : 0}&loop=1&playlist=${youtubeMatch[1]}&controls=1&showinfo=0&rel=0&modestbranding=1`
            };
        }

        const tiktokRegex = /tiktok\.com\/.*\/video\/(\d+)/;
        const tiktokMatch = cleanUrl.match(tiktokRegex);
        if (tiktokMatch && tiktokMatch[1]) {
            return {
                type: 'tiktok',
                url: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}?autoplay=1`
            };
        }

        const vimeoRegex = /vimeo\.com\/(\d+)/;
        const vimeoMatch = cleanUrl.match(vimeoRegex);
        if (vimeoMatch && vimeoMatch[1]) {
            return {
                type: 'vimeo',
                url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1&muted=${videoMuted ? 1 : 0}&controls=1`
            };
        }

        if (cleanUrl.includes('facebook.com') && cleanUrl.includes('/videos/')) {
            return {
                type: 'facebook',
                url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=0&autoplay=1&muted=${videoMuted ? 1 : 0}`
            };
        }

        if (cleanUrl.includes('instagram.com')) {
            return {
                type: 'instagram',
                url: `${cleanUrl}embed/`
            };
        }

        // Direct video (e.g. MP4, WebM) - keep clean URL without image query cache params
        let directUrl = cleanUrl;
        if (!directUrl.startsWith('http://') && !directUrl.startsWith('https://')) {
            directUrl = directUrl.startsWith('/') ? directUrl : `/${directUrl}`;
        }

        return {
            type: 'direct',
            url: directUrl
        };
    };

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const products = currentItem.products || [];
    const firstProduct = products[0];
    const hasCustomImage = !!currentItem.customImageUrl;
    const rawVideoUrl = currentItem.videoUrl && currentItem.videoUrl !== 'null' && currentItem.videoUrl !== 'undefined' ? currentItem.videoUrl.trim() : null;
    const hasVideo = !!rawVideoUrl;
    const videoEmbed = rawVideoUrl ? getVideoEmbedUrl(rawVideoUrl) : null;

    const toggleVideoMute = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const nextState = !videoMuted;
        setVideoMuted(nextState);
        if (videoRef.current) {
            videoRef.current.muted = nextState;
            if (!nextState) videoRef.current.play().catch(() => {});
        }
    };

    const handleAddToCartClick = async (e, productId) => {
        e.preventDefault();
        e.stopPropagation();

        const isFastFood = currentItem.type === 'fastfood' || currentItem.fastFoodId;
        try {
            if (isFastFood && firstProduct) {
                await addToCart(productId, 1, { type: 'fastfood', fastFood: firstProduct });
            } else {
                await addToCart(productId, 1);
            }
        } catch (error) {
            console.error('HeroSlider cart operation failed:', error);
        }

        const productType = isFastFood ? 'fastfood' : 'products';
        navigate(`/${productType}/${productId}`, { state: { from: location.pathname } });

        if (onAddToCart) onAddToCart(productId);
    };

    const getThemeColors = () => {
        const themes = [
            { bg: 'from-slate-950 via-slate-900 to-indigo-950', highlight: 'from-[#FF6600] via-amber-400 to-yellow-300' },
            { bg: 'from-slate-950 via-blue-950 to-slate-900', highlight: 'from-blue-400 via-cyan-300 to-white' },
            { bg: 'from-slate-950 via-purple-950 to-slate-900', highlight: 'from-purple-300 via-pink-400 to-white' },
            { bg: 'from-slate-950 via-emerald-950 to-slate-900', highlight: 'from-emerald-300 via-teal-200 to-white' }
        ];
        return themes[currentIndex % themes.length];
    };

    const formatHeadline = (title) => {
        if (!title) return 'FLASH SALE';
        return title;
    };

    const theme = getThemeColors();

    return (
        <div
            className="relative w-full overflow-hidden select-none shadow-2xl rounded-2xl bg-slate-950 my-2"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            {/* Main Outer Container */}
            <div className="relative w-full min-h-[420px] sm:min-h-[450px] lg:h-[420px] lg:min-h-0 flex items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2 lg:pl-6 lg:pr-2 lg:py-2 overflow-hidden">
                
                {/* Background Overlay Pattern */}
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`}></div>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#FF6600]/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Floating Top Right Promo Badge */}
                {currentItem.promoBadge || currentItem.badge ? (
                    <div className="absolute top-2.5 right-3.5 sm:top-3 sm:right-5 z-30 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xl border border-white/20 animate-pulse">
                            <span>🚀</span> {currentItem.promoBadge || currentItem.badge}
                        </span>
                    </div>
                ) : null}

                {/* Inner 2-Column Grid Layout (5 Cols Left | 7 Cols Right for Media) */}
                <div className="relative z-20 w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 items-stretch min-h-0">
                    
                    {/* LEFT COLUMN: Content & CTAs (5 Columns) */}
                    <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-center text-left space-y-2.5 sm:space-y-3.5 animate-fade-in-left py-2 px-1 sm:px-2 min-w-0">
                        
                        {/* Eyebrow Pill with Pulsing Live Indicator */}
                        {(currentItem.eyebrow || currentItem.promoBadge || currentItem.badge) ? (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-2 px-3.5 py-1 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 backdrop-blur-md text-amber-300 text-[11px] sm:text-xs font-black rounded-full border border-amber-400/30 uppercase tracking-widest shadow-lg shadow-amber-500/10">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                                    </span>
                                    <span>{currentItem.eyebrow || currentItem.promoBadge || currentItem.badge}</span>
                                </span>
                            </div>
                        ) : null}

                        {/* Main Title */}
                        {currentItem.title ? (
                            <h1 className="text-white text-xl sm:text-3xl lg:text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] uppercase line-clamp-2">
                                <span className={`bg-gradient-to-r ${theme.highlight || 'from-white via-slate-100 to-amber-200'} bg-clip-text text-transparent`}>
                                    {currentItem.title}
                                </span>
                            </h1>
                        ) : null}

                        {/* Subtitle / Description Card */}
                        {currentItem.subtitle ? (
                            <div className="bg-black/30 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/10 shadow-inner max-w-xl">
                                <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed line-clamp-2">
                                    {currentItem.subtitle}
                                </p>
                            </div>
                        ) : null}

                        {/* CTA Buttons Row (Only if product or CTA text/link explicitly provided) */}
                        {(firstProduct || currentItem.productId || currentItem.ctaText || currentItem.buttonText || currentItem.link || currentItem.targetUrl) ? (
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 pt-1">
                                {(firstProduct || currentItem.productId) ? (
                                    <button
                                        onClick={(e) => handleAddToCartClick(e, firstProduct?.id || currentItem.productId)}
                                        className="group px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2.5 border border-blue-400/40 pointer-events-auto"
                                    >
                                        <span>{currentItem.ctaText || currentItem.buttonText || 'BUY NOW'}</span>
                                        <FaShoppingCart size={14} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                ) : null}

                                {(currentItem.ctaText || currentItem.buttonText || currentItem.link || currentItem.targetUrl) && !firstProduct ? (
                                    <button
                                        onClick={() => {
                                            const destination = currentItem.link || currentItem.targetUrl || currentItem.ctaLink;
                                            if (destination) {
                                                if (destination.startsWith('http://') || destination.startsWith('https://')) {
                                                    window.open(destination, '_blank');
                                                } else {
                                                    navigate(destination);
                                                }
                                            }
                                        }}
                                        className="group relative px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2.5 border border-white/20 pointer-events-auto"
                                    >
                                        <span>{currentItem.ctaText || currentItem.buttonText || 'Explore Options'}</span>
                                        <FaArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : null}

                                {/* Price Tag if Product exists */}
                                {firstProduct && (
                                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-2xl border border-white/15 backdrop-blur-md shadow-lg">
                                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Price</span>
                                        <span className="text-amber-400 text-sm sm:text-base font-black">
                                            KES {firstProduct.discountPrice || firstProduct.basePrice}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Trust Indicators Row (Only if explicitly provided) */}
                        {Array.isArray(currentItem.trustPoints) && currentItem.trustPoints.length > 0 ? (
                            <div className="pt-1 flex flex-wrap items-center gap-2 text-white/90 text-[11px] sm:text-xs font-bold">
                                {currentItem.trustPoints.map((tp, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 shadow-sm hover:scale-105 transition-all duration-200">
                                        {tp.icon && <span className="text-sm">{tp.icon}</span>}
                                        <span className="truncate max-w-[140px] sm:max-w-none">{typeof tp === 'string' ? tp : tp.text}</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {/* Left-Aligned Slide Indicator Dots Capsule */}
                        {items.length > 1 && (
                            <div className="pt-1 flex items-center gap-2 pointer-events-auto">
                                <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center gap-1.5">
                                    {items.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`h-1.5 transition-all duration-300 rounded-full border-0 p-0 ${idx === currentIndex ? 'w-6 bg-blue-500 shadow-md' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                                            aria-label={`Go to slide ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Media Box with auto-fitting aspect ratio */}
                    <div className="order-1 lg:order-2 lg:col-span-7 flex justify-center items-center w-full h-full min-h-[200px] sm:min-h-[240px] lg:min-h-0 animate-fade-in-right p-0 sm:p-0.5 min-w-0">
                        
                        <div className="relative w-full h-full rounded-2xl border border-white/15 bg-slate-950/80 shadow-2xl overflow-hidden group/card flex items-center justify-center">
                            
                            {hasVideo ? (
                                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
                                    {videoEmbed && videoEmbed.type !== 'direct' ? (
                                        /* Iframe embed: fill entire container edge-to-edge */
                                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                            <iframe
                                                ref={iframeRef}
                                                key={currentIndex}
                                                src={videoEmbed.url}
                                                className="w-full h-full object-cover"
                                                style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                                title="Banner Video"
                                            />
                                        </div>
                                    ) : (
                                        /* Native video: object-cover fills full container edge to edge without side bars */
                                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                            <video
                                                ref={videoRef}
                                                key={currentIndex}
                                                src={videoEmbed ? videoEmbed.url : resolveImageUrl(currentItem.videoUrl)}
                                                className="w-full h-full object-cover"
                                                controls
                                                autoPlay={currentItem.videoAutoplay !== false}
                                                muted={videoMuted}
                                                playsInline
                                                onEnded={() => { if (items.length > 1) nextSlide(); }}
                                            />
                                        </div>
                                    )}

                                    {/* Floating Sound Toggle Pill */}
                                    <button
                                        onClick={toggleVideoMute}
                                        className="absolute top-3 right-3 z-30 px-3 py-1 flex items-center gap-1.5 rounded-full bg-slate-950/90 hover:bg-blue-600 text-white backdrop-blur-md border border-white/20 text-xs font-bold shadow-2xl transition-all hover:scale-105 active:scale-95 pointer-events-auto"
                                        aria-label={videoMuted ? 'Unmute video' : 'Mute video'}
                                    >
                                        {videoMuted ? (
                                            <>
                                                <FaVolumeMute className="text-red-400" />
                                                <span>Sound Off</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaVolumeUp className="text-emerald-400" />
                                                <span>Sound On</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                /* Product Image Showcase Card */
                                <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-white/5 to-white/0">
                                    <img
                                        src={resolveImageUrl(hasCustomImage ? currentItem.customImageUrl : (firstProduct?.coverImage || FALLBACK_IMAGE))}
                                        alt={currentItem.title || firstProduct?.name || 'Banner Promotion'}
                                        className="max-h-full max-w-full object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.8)] transition-all duration-500 hover:scale-105"
                                    />
                                    {firstProduct?.discountPercentage && (
                                        <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-1 rounded-xl shadow-2xl font-black text-xs border border-white/25">
                                            -{firstProduct.discountPercentage}% OFF
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                </div>

                {/* Left Floating Arrow */}
                {items.length > 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-2xl z-30 pointer-events-auto"
                        aria-label="Previous slide"
                    >
                        <FaChevronLeft size={16} />
                    </button>
                )}

                {/* Right Floating Arrow */}
                {items.length > 1 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                        className="absolute right-2 sm:left-auto sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-2xl z-30 pointer-events-auto"
                        aria-label="Next slide"
                    >
                        <FaChevronRight size={16} />
                    </button>
                )}

            </div>
        </div>
    );
};

export default HeroSlider;
