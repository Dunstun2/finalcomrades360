import React, { useRef, useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function ItemCarousel({ items, CardComponent, itemsPerView = 4, gap = 24, responsive = null, cardProps = {} }) {
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [currentItemsPerView, setCurrentItemsPerView] = useState(itemsPerView);

    // Drag-to-scroll state
    const [isDragging, setIsDragging] = useState(false);
    const isMouseDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const velocity = useRef(0);
    const lastX = useRef(0);
    const lastTime = useRef(0);
    const animationFrameId = useRef(null);

    // Calculate responsive items per view
    useEffect(() => {
        if (!responsive) return;

        const updateItemsPerView = () => {
            const width = window.innerWidth;
            let newItemsPerView = itemsPerView;

            const sortedBreakpoints = Object.keys(responsive).map(Number).sort((a, b) => b - a);

            for (const breakpoint of sortedBreakpoints) {
                if (width >= breakpoint) {
                    newItemsPerView = responsive[breakpoint];
                    break;
                }
            }

            if (width < Math.min(...sortedBreakpoints)) {
                newItemsPerView = 1;
            }

            setCurrentItemsPerView(newItemsPerView);
        };

        updateItemsPerView();
        window.addEventListener('resize', updateItemsPerView);
        return () => window.removeEventListener('resize', updateItemsPerView);
    }, [responsive, itemsPerView]);

    // Wheel event handling with acceleration
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault();
            // 4x acceleration for fast scrolling
            container.scrollLeft += e.deltaY * 4;
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // Momentum scrolling animation
    useEffect(() => {
        if (!isDragging && Math.abs(velocity.current) > 0.5) {
            const container = scrollContainerRef.current;
            if (!container) return;

            const animate = () => {
                if (isDragging) return; // Stop if user starts dragging again

                container.scrollLeft += velocity.current;
                velocity.current *= 0.92; // Friction

                if (Math.abs(velocity.current) > 0.5) {
                    animationFrameId.current = requestAnimationFrame(animate);
                } else {
                    velocity.current = 0;
                }
            };

            animationFrameId.current = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrameId.current);
        }
    }, [isDragging]);

    // Drag handlers
    const handleMouseDown = (e) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Don't start drag if clicking on a button or interactive element
        if (e.target.closest('button') || e.target.closest('a')) {
            return;
        }

        isMouseDown.current = true;
        startX.current = e.pageX - container.offsetLeft;
        scrollLeft.current = container.scrollLeft;
        lastX.current = e.pageX;
        lastTime.current = Date.now();
        velocity.current = 0;

        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }

        container.style.cursor = 'grabbing';
        container.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
        if (!isMouseDown.current) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const currentX = e.pageX - container.offsetLeft;
        const distance = Math.abs(currentX - startX.current);

        // Threshold check
        if (!isDragging && distance > 5) {
            setIsDragging(true);
            // Adjust startX to prevent jump
            startX.current = e.pageX - container.offsetLeft;
            scrollLeft.current = container.scrollLeft;
        }

        if (isDragging) {
            e.preventDefault();
            const walk = (currentX - startX.current) * 1.5; // Adjusted sensitivity
            container.scrollLeft = scrollLeft.current - walk;

            // Calculate velocity for momentum
            const now = Date.now();
            const dt = now - lastTime.current;
            if (dt > 0) {
                const dx = e.pageX - lastX.current;
                // Average the velocity slightly for smoothness
                const currentVelocity = -dx / dt * 16;
                velocity.current = velocity.current * 0.2 + currentVelocity * 0.8;
            }
            lastX.current = e.pageX;
            lastTime.current = now;
        }
    };

    const handleMouseUp = () => {
        isMouseDown.current = false;
        setIsDragging(false);
        const container = scrollContainerRef.current;
        if (container) {
            container.style.cursor = 'grab';
            container.style.userSelect = '';
        }
    };

    const handleMouseLeave = () => {
        if (isMouseDown.current) {
            handleMouseUp();
        }
    };

    const checkScrollability = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
            container.scrollLeft < container.scrollWidth - container.clientWidth - 1
        );
    };

    useEffect(() => {
        checkScrollability();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollability);
            return () => container.removeEventListener('scroll', checkScrollability);
        }
    }, [items]);

    const activePerView = responsive ? currentItemsPerView : itemsPerView;

    const scroll = (direction) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = container.clientWidth * 0.8;
        const targetScroll = direction === 'left'
            ? container.scrollLeft - scrollAmount
            : container.scrollLeft + scrollAmount;

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    };

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div className="relative group">
            {/* Left Arrow */}
            {canScrollLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    aria-label="Scroll left"
                >
                    <FaChevronLeft className="text-gray-800" size={20} />
                </button>
            )}

            {/* Scrollable Container */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto scrollbar-hide"
                style={{
                    gap: `${gap}px`,
                    WebkitOverflowScrolling: 'touch',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    willChange: 'scroll-position',
                    contain: 'layout style paint'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                {items.map((item, index) => (
                    <div
                        key={item.id || index}
                        className="flex-shrink-0"
                        style={{
                            pointerEvents: isDragging ? 'none' : 'auto'
                        }}
                    >
                        <CardComponent key={item.id || index} item={item} {...cardProps} />
                    </div>
                ))}
            </div>

            {/* Right Arrow */}
            {canScrollRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    aria-label="Scroll right"
                >
                    <FaChevronRight className="text-gray-800" size={20} />
                </button>
            )}
        </div>
    );
}
