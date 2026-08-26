import React, { useState, useEffect, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight, FaShoppingCart, FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { resolveImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils';
import { useCart } from '@/contexts/CartContext';

const HeroSlider = ({ items = [], onAddToCart = null }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [videoMuted, setVideoMuted] = useState(true);
    const [videoPlaying, setVideoPlaying] = useState(true);
    const [tiktokAutoplayAttempted, setTiktokAutoplayAttempted] = useState(false);
    const videoRef = React.useRef(null);
    const iframeRef = React.useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setVideoPlaying(true);
        setTiktokAutoplayAttempted(false);
    }, [items.length]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
        setVideoPlaying(true);
        setTiktokAutoplayAttempted(false);
    }, [items.length]);

    useEffect(() => {
        if (!isAutoPlaying || items.length <= 1) return;
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, nextSlide, items.length]);

    // Video control effect
    useEffect(() => {
        if (videoRef.current) {
            if (videoPlaying) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
            }
        }
    }, [videoPlaying, currentIndex]);

    // Auto-click TikTok/Instagram play buttons after iframe loads
    useEffect(() => {
        const currentItem = items[currentIndex];
        if (!currentItem?.videoUrl) return;

        const videoEmbed = getVideoEmbedUrl(currentItem.videoUrl);
        if (!videoEmbed) return;

        // For TikTok and Instagram, attempt to simulate click after load
        if ((videoEmbed.type === 'tiktok' || videoEmbed.type === 'instagram') && !tiktokAutoplayAttempted) {
            const timer = setTimeout(() => {
                setTiktokAutoplayAttempted(true);
                // Try to programmatically click the play button in the iframe (this may not work due to cross-origin restrictions)
                if (iframeRef.current) {
                    try {
                        // This will likely be blocked by CORS, but we'll try
                        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
                        if (iframeDoc) {
                            const playButton = iframeDoc.querySelector('button[aria-label*="play"], button[class*="play"]');
                            if (playButton) playButton.click();
                        }
                    } catch (e) {
                        // Cross-origin restriction - expected
                        console.log('Auto-play attempt blocked by CORS (expected for TikTok/Instagram)');
                    }
                }
            }, 1500); // Wait for iframe to load

            return () => clearTimeout(timer);
        }
    }, [currentIndex, items, tiktokAutoplayAttempted]);

    const toggleVideoPlayPause = () => setVideoPlaying(!videoPlaying);
    const toggleVideoMute = () => {
        setVideoMuted(!videoMuted);
        if (videoRef.current) videoRef.current.muted = !videoMuted;
    };

    const getVideoEmbedUrl = (url) => {
        if (!url) return null;

        // YouTube
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const youtubeMatch = url.match(youtubeRegex);
        if (youtubeMatch && youtubeMatch[1]) {
            return {
                type: 'youtube',
                url: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${youtubeMatch[1]}&controls=1&showinfo=0&rel=0&modestbranding=1&fs=1`
            };
        }

        // TikTok
        const tiktokRegex = /tiktok\.com\/.*\/video\/(\d+)/;
        const tiktokMatch = url.match(tiktokRegex);
        if (tiktokMatch && tiktokMatch[1]) {
            return {
                type: 'tiktok',
                url: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}?autoplay=1`
            };
        }

        // Vimeo
        const vimeoRegex = /vimeo\.com\/(\d+)/;
        const vimeoMatch = url.match(vimeoRegex);
        if (vimeoMatch && vimeoMatch[1]) {
            return {
                type: 'vimeo',
                url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1&muted=1&controls=1`
            };
        }

        // Dailymotion
        const dailymotionRegex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/;
        const dailymotionMatch = url.match(dailymotionRegex);
        if (dailymotionMatch && dailymotionMatch[1]) {
            return {
                type: 'dailymotion',
                url: `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}?autoplay=1&mute=1&controls=1`
            };
        }

        // Facebook Video
        if (url.includes('facebook.com') && url.includes('/videos/')) {
            return {
                type: 'facebook',
                url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1&muted=1`
            };
        }

        // Instagram
        if (url.includes('instagram.com')) {
            return {
                type: 'instagram',
                url: `${url}embed/`
            };
        }

        // Default: treat as direct video file
        return {
            type: 'direct',
            url: url
        };
    };

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const products = currentItem.products || [];
    const firstProduct = products[0];
    const hasCustomImage = !!currentItem.customImageUrl;
    const hasVideo = !!currentItem.videoUrl;
    const videoEmbed = currentItem.videoUrl ? getVideoEmbedUrl(currentItem.videoUrl) : null;

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
            { bg: 'from-purple-600 to-indigo-800', accent: '#f59e0b', secondary: 'bg-white/20' },
            { bg: 'from-orange-500 to-red-600', accent: '#ffffff', secondary: 'bg-black/20' },
            { bg: 'from-blue-600 to-cyan-500', accent: '#fcd34d', secondary: 'bg-white/20' },
            { bg: 'from-emerald-600 to-teal-800', accent: '#ffffff', secondary: 'bg-black/10' }
        ];
        return themes[currentIndex % themes.length];
    };

    const theme = getThemeColors();

    return (
        <div
            className="relative w-full overflow-hidden group shadow-2xl"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
        >
            {/* Use custom aspect-ratio for video banners (reduced by 1/3), fixed height for image banners */}
            <div className={`relative w-full transition-all duration-700 ease-in-out overflow-hidden ${hasVideo ? 'aspect-[3/1]' : 'h-56 sm:h-64 md:h-[350px] lg:h-[380px]'}`}>

                {/* Background: Video or Gradient */}
                {hasVideo ? (
                    <>
                        {videoEmbed && videoEmbed.type !== 'direct' ? (
                            <div className="absolute inset-0 w-full h-full z-0">
                                <iframe
                                    ref={iframeRef}
                                    key={currentIndex}
                                    src={videoEmbed.url}
                                    className="absolute inset-0 w-full h-full"
                                    style={{ pointerEvents: 'auto', zIndex: 1, objectFit: 'contain' }}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                    allowFullScreen
                                    title="Video Banner"
                                />
                                {/* Overlay hint for platforms that don't support autoplay */}
                                {(videoEmbed.type === 'tiktok' || videoEmbed.type === 'instagram') && !tiktokAutoplayAttempted && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-out" style={{ zIndex: 2 }}>
                                        <div className="bg-white/90 backdrop-blur-md rounded-full p-4 sm:p-6 shadow-2xl animate-pulse">
                                            <FaPlay className="text-purple-600 text-3xl sm:text-5xl" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                key={currentIndex}
                                className="absolute inset-0 w-full h-full"
                                style={{ zIndex: 1, objectFit: 'contain' }}
                                autoPlay={currentItem.videoAutoplay !== false}
                                loop={currentItem.videoLoop !== false}
                                muted={videoMuted}
                                playsInline
                                controls
                                controlsList="nodownload"
                                onError={(e) => {
                                    console.error('Video failed to load:', e);
                                    e.target.style.display = 'none';
                                }}
                            >
                                <source src={videoEmbed ? videoEmbed.url : currentItem.videoUrl} type="video/mp4" />
                                <source src={videoEmbed ? videoEmbed.url : currentItem.videoUrl} type="video/webm" />
                                Your browser does not support the video tag.
                            </video>
                        )}
                        <div className="absolute inset-0 bg-black/40" style={{ zIndex: 3, pointerEvents: 'none' }}></div>
                    </>
                ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`}>
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-black/20 rounded-full blur-3xl"></div>
                        <div className="absolute inset-0 left-[55%] w-px bg-white/20 rotate-[15deg] origin-top scale-y-150"></div>
                    </div>
                )}

                <div className="relative w-full h-full flex flex-row items-center" style={{ zIndex: 10 }}>

                    {/* Left Side: Content */}
                    <div className="w-[55%] sm:w-[60%] h-full px-3 sm:px-8 md:px-16 flex flex-col justify-start pt-3 sm:justify-center animate-fade-in-left">

                        <div className="mb-0.5 sm:mb-2">
                            <span className="inline-block px-1.5 py-0.5 sm:px-3 sm:py-1 bg-white text-black text-[7px] sm:text-xs font-black rounded-full shadow-lg transform -rotate-2 uppercase tracking-wider">
                                🔥 Top Deal
                            </span>
                        </div>

                        <div className="relative">
                            <h1 className="text-white text-lg sm:text-3xl md:text-6xl font-black leading-tight tracking-tighter drop-shadow-2xl uppercase pointer-events-none">
                                {currentItem.title || (firstProduct ? firstProduct.name : 'Flash Sale')}
                            </h1>

                            <p className="mt-0.5 sm:mt-1 text-white/90 text-[9px] sm:text-sm md:text-xl font-bold italic leading-tight max-w-xl line-clamp-1 pointer-events-none">
                                {currentItem.subtitle || (firstProduct ? `Best price on ${firstProduct.name}!` : 'Campus favorites.')}
                            </p>

                            {(currentItem.trustPoints || [
                                { icon: '🚀', text: 'Fast Delivery' },
                                { icon: '✅', text: 'Verified' },
                                { icon: '🎓', text: 'Student Choice' }
                            ]).length > 0 && (
                                    <div className="mt-1.5 sm:mt-3 flex items-center flex-wrap gap-2 sm:gap-6 text-white/90 bg-black/10 w-fit px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-lg backdrop-blur-sm border border-white/5 pointer-events-none">
                                        {(currentItem.trustPoints || [
                                            { icon: '🚀', text: 'Fast Delivery' },
                                            { icon: '✅', text: 'Verified' },
                                            { icon: '🎓', text: 'Student Choice' }
                                        ]).map((tp, idx, arr) => (
                                            <React.Fragment key={idx}>
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <span className="text-[10px] sm:text-sm">{tp.icon}</span>
                                                    <span className="text-[7px] sm:text-xs font-black uppercase tracking-tight whitespace-nowrap">{tp.text}</span>
                                                </div>
                                                {idx < arr.length - 1 && <div className="w-px h-3 bg-white/20"></div>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                        </div>

                        <div className="mt-2 sm:mt-4 flex flex-col gap-2 sm:gap-4">
                            {(firstProduct || currentItem.productId) && (
                                <div className="flex flex-wrap items-center gap-2 sm:gap-8">
                                    <button
                                        onClick={(e) => handleAddToCartClick(e, firstProduct?.id || currentItem.productId)}
                                        className="px-4 py-2 sm:px-10 sm:py-4 bg-white text-black rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-lg md:text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group/btn border-b-2 sm:border-b-4 border-gray-200 pointer-events-auto"
                                    >
                                        <span>BUY NOW</span>
                                        <FaShoppingCart size={12} className="sm:w-6 sm:h-6 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>

                                    <div className="flex flex-col pointer-events-none">
                                        <span className="text-white/70 text-[7px] sm:text-sm font-black uppercase tracking-widest leading-none">From</span>
                                        <span className="text-yellow-400 text-sm sm:text-3xl md:text-5xl font-black leading-none mt-0.5 drop-shadow-lg">KES {firstProduct?.discountPrice || firstProduct?.basePrice || '---'}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5 sm:gap-3 bg-black/20 w-fit p-1 sm:p-2 rounded-lg sm:rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl pointer-events-none">
                                <div className="flex -space-x-1.5 sm:-space-x-3">
                                    {(() => {
                                        const imgs = [];
                                        (currentItem.products || []).forEach(p => {
                                            if (p.coverImage) imgs.push(p.coverImage);
                                        });

                                        if (imgs.length < 4 && firstProduct?.images) {
                                            (Array.isArray(firstProduct.images) ? firstProduct.images : []).forEach(img => {
                                                if (img && !imgs.includes(img)) imgs.push(img);
                                            });
                                        }

                                        while (imgs.length < 4) {
                                            imgs.push(firstProduct?.coverImage || currentItem.customImageUrl || FALLBACK_IMAGE);
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
                                        {firstProduct?.soldCount > 0 ? `${firstProduct.soldCount}+ Bought` : 'Trending Now'}
                                    </span>
                                    <span className="text-white/60 text-[5px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 hidden sm:block">Verified Sales This Week</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Visual (Image only - video now covers full banner) */}
                    <div className="w-[45%] sm:w-[40%] h-full flex items-center justify-center relative p-4 sm:p-8 animate-fade-in-right">

                        <div className="absolute inset-0 m-auto w-48 h-48 sm:w-80 sm:h-80 bg-white/20 rounded-full blur-[80px] opacity-50"></div>

                        <div className="relative w-full h-full flex items-center justify-center perspective-1000">
                            {!hasVideo && (
                                <>
                                    <img
                                        src={resolveImageUrl(hasCustomImage ? currentItem.customImageUrl : (firstProduct?.coverImage || FALLBACK_IMAGE))}
                                        alt={currentItem.title || firstProduct?.name || 'Promotion'}
                                        className="max-w-[120%] max-h-[110%] sm:max-w-[140%] sm:max-h-[120%] object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:scale-110 hover:rotate-3"
                                    />
                                    <div className="absolute bottom-[-10%] w-full h-[20%] bg-gradient-to-t from-black/20 to-transparent blur-xl scale-x-75 rounded-full"></div>
                                </>
                            )}
                        </div>

                        {firstProduct && !hasVideo && (
                            <div className="absolute top-1/4 right-4 sm:right-10 bg-[#f59e0b] text-white p-2 sm:p-4 rounded-2xl shadow-2xl transform rotate-12 scale-75 sm:scale-100 border-4 border-white/20">
                                <span className="block text-[8px] sm:text-xs font-black uppercase opacity-75">Offer</span>
                                <span className="block text-xs sm:text-xl font-black">-{firstProduct.discountPercentage || 20}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Controls */}
                {items.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-xl border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-2xl pointer-events-auto"
                            style={{ zIndex: 20 }}
                        >
                            <FaChevronLeft size={20} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-xl border border-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-2xl pointer-events-auto"
                            style={{ zIndex: 20 }}
                        >
                            <FaChevronRight size={20} />
                        </button>

                        <div className="absolute bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto" style={{ zIndex: 20 }}>
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`h-1.5 sm:h-2 transition-all duration-500 rounded-full border-0 p-0 ${idx === currentIndex ? 'w-8 sm:w-12 bg-white' : 'w-2 sm:w-3 bg-white/40'}`}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Audio Control Button - Always visible for videos */}
                {hasVideo && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleVideoMute(); }}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xl border border-white/20 transition-all shadow-2xl pointer-events-auto"
                        style={{ zIndex: 20 }}
                        title={videoMuted ? 'Unmute' : 'Mute'}
                    >
                        {videoMuted ? <FaVolumeMute size={18} className="sm:w-6 sm:h-6" /> : <FaVolumeUp size={18} className="sm:w-6 sm:h-6" />}
                    </button>
                )}

                <style jsx="true">{`
                    @keyframes fade-in-left {
                        from { opacity: 0; transform: translateX(-50px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    @keyframes fade-in-right {
                        from { opacity: 0; transform: translateX(50px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    .animate-fade-in-left {
                        animation: fade-in-left 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .animate-fade-in-right {
                        animation: fade-in-right 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .perspective-1000 {
                        perspective: 1000px;
                    }
                    .line-clamp-1 {
                        display: -webkit-box;
                        -webkit-line-clamp: 1;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    @keyframes fade-out {
                        0% { opacity: 1; }
                        80% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                    .animate-fade-out {
                        animation: fade-out 2s ease-out forwards;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default HeroSlider;
