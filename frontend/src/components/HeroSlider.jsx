import React, { useState, useEffect, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight, FaShoppingCart } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { resolveImageUrl, FALLBACK_IMAGE } from '../utils/imageUtils';

import { useCart } from '../contexts/CartContext';

const HeroSlider = ({ items = [], onAddToCart = null }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    }, [items.length]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }, [items.length]);

    useEffect(() => {
        if (!isAutoPlaying || items.length <= 1) return;

        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, nextSlide, items.length]);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const products = currentItem.products || [];
    const firstProduct = products[0];
    const hasCustomImage = !!currentItem.customImageUrl;

    const handleAddToCartClick = async (e, productId) => {
        e.preventDefault();
        e.stopPropagation();

        const isFastFood = currentItem.type === 'fastfood' || currentItem.fastFoodId;
        if (isFastFood && firstProduct) {
            try {
                await addToCart(productId, 1, { type: 'fastfood', fastFood: firstProduct });
            } catch (error) {
                // Optionally show a toast here if desired
            }
        }
        const productType = isFastFood ? 'fastfood' : 'products';
        navigate(`/${productType}/${productId}`, { state: { from: location.pathname } });

        if (onAddToCart) onAddToCart(productId);
    };

    return (
        <div
            className="relative w-full overflow-hidden group rounded-2xl sm:rounded-3xl"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
        >
            <div className="relative w-full h-60 sm:h-64 md:min-h-[500px] transition-all duration-700 ease-in-out overflow-hidden">
                {/* Split background like Jumia-style promo banners */}
                <div className="absolute inset-0 flex">
                    <div className="w-3/5 bg-[#a172d5]"></div>
                    <div className="w-2/5 bg-[#f59e0b]"></div>
                </div>
                <div className="absolute inset-0 left-[58%] w-1 bg-white/25 rotate-[10deg] origin-top"></div>

                <div className="relative z-10 w-full h-full flex">
                    <div className="w-3/5 h-full px-3 sm:px-5 md:px-10 pt-6 pb-3 sm:py-4 md:py-10 flex flex-col justify-start animate-fade-in-up">
                        <h1 className="text-white text-[14px] sm:text-xl md:text-5xl font-black leading-tight tracking-tight line-clamp-2 md:line-clamp-none">
                            {currentItem.title || (firstProduct ? firstProduct.name : '')}
                        </h1>
                        <p className="mt-1 text-white/95 text-[11px] sm:text-sm md:text-xl font-semibold line-clamp-2 md:line-clamp-none max-w-[95%]">
                            {currentItem.subtitle || (firstProduct ? `Experience the best of ${firstProduct.name}.` : '')}
                        </p>

                        {firstProduct && (
                            <div className="mt-2 sm:mt-3 flex flex-col items-start">
                                <p className="text-white text-[12px] sm:text-sm md:text-lg font-extrabold tracking-tight line-clamp-1 max-w-[95%]">
                                    {firstProduct.name}
                                </p>
                                <button
                                    onClick={(e) => handleAddToCartClick(e, firstProduct.id)}
                                    className="mt-1.5 inline-flex w-fit items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-[#f59e0b] rounded-md sm:rounded-lg font-black text-[11px] sm:text-sm shadow-md hover:opacity-95 transition"
                                >
                                    <span>BUY NOW</span>
                                    <FaShoppingCart />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-2/5 h-full flex items-end justify-center pr-1 sm:pr-2 md:pr-6 animate-fade-in-up delay-200">
                        <div className="w-full h-full flex items-end justify-center">
                            <img
                                src={resolveImageUrl(hasCustomImage ? currentItem.customImageUrl : (firstProduct?.coverImage || FALLBACK_IMAGE))}
                                alt={currentItem.title || firstProduct?.name || 'Promotion'}
                                className="w-full h-full object-contain object-bottom drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]"
                            />
                        </div>
                    </div>
                </div>

                {/* Navigation Controls */}
                {items.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/10 hover:bg-black/20 text-white backdrop-blur-md transition-all z-20 opacity-0 group-hover:opacity-100 hidden md:block"
                        >
                            <FaChevronLeft size={24} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/10 hover:bg-black/20 text-white backdrop-blur-md transition-all z-20 opacity-0 group-hover:opacity-100 hidden md:block"
                        >
                            <FaChevronRight size={24} />
                        </button>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-[2px] z-20">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`rounded-full transition-all duration-300 p-0 m-0 border-0 min-w-0 min-h-0 ${idx === currentIndex ? 'bg-amber-300 shadow-[0_0_3px_rgba(252,211,77,0.4)]' : 'bg-white/55'}`}
                                    style={{ width: idx === currentIndex ? '6px' : '2px', height: '2px' }}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}

            </div>

            <style jsx="true">{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }
                .delay-200 {
                    animation-delay: 0.2s;
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
                .rotate-y-12 {
                    transform: rotateY(12deg);
                }
            `}</style>
        </div>
    );
};

export default HeroSlider;
