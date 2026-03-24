import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { FaHeart, FaMapMarkerAlt, FaLocationArrow } from 'react-icons/fa';
import { resolveImageUrl, FALLBACK_IMAGE, getResizedImageUrl } from '../utils/imageUtils';
import { useImageVersion } from '../hooks/useImageVersion';
import serviceApi from '../services/serviceApi';

export default function ServiceCard({
  service,
  isBooked = false,
  onView,
  onBook,
  user,
  navigate,
  renderActions,
  statusBadge,
  contentClassName = '',
  className // Added className prop
}) {
  const { user: authUser } = useAuth();
  const isMarketing = localStorage.getItem('marketing_mode') === 'true';
  const { toast } = useToast();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(service.id, 'service');

  // Use image versioning for consistent image updates
  let imageUrls = service.images || [];
  if (typeof imageUrls === 'string') {
    try {
      if (imageUrls.startsWith('[')) { imageUrls = JSON.parse(imageUrls); }
      else { imageUrls = [imageUrls]; }
    } catch (e) { imageUrls = []; }
  }
  const { getVersionedUrl, refreshImages } = useImageVersion(imageUrls, service.id);

  const handleBook = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!authUser) {
      navigate('/login');
      return;
    }

    try {
      if (onBook) {
        await onBook(service.id);
      } else {
        // Default booking behavior - navigate to service details
        navigate(`/service/${service.id}`);
      }
    } catch (error) {
      console.error('Booking operation failed:', error);
    }
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!authUser) {
      toast({
        title: 'Login Required',
        description: 'Please log in to save services to your favorites',
        variant: 'destructive'
      });
      // Don't redirect immediately, let user finish browsing
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      await toggleWishlist(service.id, 'service');
    } catch (error) {
      console.error('Wishlist toggle error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorites. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleView = (e) => {
    e.stopPropagation();
    if (onView) {
      onView(service);
    } else {
      navigate(`/service/${service.id}`);
    }
  };

  // Price calculation
  const originalPrice = Number(service.displayPrice || service.basePrice || service.price || 0);
  const finalPrice = Number(service.discountPrice || originalPrice);
  const hasDiscount = Number(service.discountPercentage || 0) > 0 && finalPrice < originalPrice;


  // Get availability status from real logic
  const availability = serviceApi.getAvailabilityStatus(service);
  const isOpen = availability.isAvailable;



  // If a fixed width is explicitly provided, use it (e.g. from scroll carousels).
  // Otherwise default to w-full so it fills its grid cell properly.
  const isFixedWidth = className?.includes('w-[') || className?.includes('min-w-[');
  const cardBase = isFixedWidth
    ? className
    : `w-full ${className || ''}`;

  return (
    <div className={`flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 group flex flex-col overflow-hidden ${cardBase} sm:max-w-[420px]`}>
      {/* Service Image */}
      <div className="relative h-32 sm:h-40 md:h-48 overflow-hidden bg-gray-100">
        <img
          src={getVersionedUrl(
            getResizedImageUrl(resolveImageUrl(
              service.coverImage ||
              (imageUrls && imageUrls.length > 0 ? (imageUrls[0].imageUrl || imageUrls[0].url || imageUrls[0]) : null) ||
              service.thumbnail
            ), { width: 400, quality: 80 })
          )}
          className={`w-full h-full object-cover object-center transition-transform duration-500 ${!isOpen ? 'grayscale brightness-75' : ''}`}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.src = FALLBACK_IMAGE;
          }}
        />

        {/* Closed Badge - Center of Image (only when closed) */}
        {!isOpen && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="px-4 py-2 rounded-lg text-sm font-bold bg-black/70 text-white backdrop-blur-sm shadow-lg">
              {availability.reason}
            </div>
          </div>
        )}

        {/* Status Badges - Top Right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {isMarketing && service.marketingCommission > 1 && (
            <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-lg border border-purple-500 w-fit">
              KSH {Number(service.marketingCommission).toFixed(2)}
            </span>
          )}
          {service.distance !== undefined && service.distance !== null && (
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1 bg-white/90 backdrop-blur-sm ${service.distance < 1 ? 'text-blue-600' : 'text-gray-700'}`}>
              <FaLocationArrow className={`w-2 h-2 ${service.distance < 1 ? 'animate-pulse' : ''}`} />
              {service.distance < 1 ? 'NEARBY' : `${service.distance}km`}
            </div>
          )}
        </div>

        {/* Location Badge - Bottom Left */}
        {(service.vendorLocation || service.location) && (
          <div className="absolute bottom-2 left-2 z-10">
            <div className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-black/60 text-white backdrop-blur-sm flex items-center gap-1 max-w-[180px]">
              <FaMapMarkerAlt size={8} className="flex-shrink-0" />
              <span className="truncate">{service.vendorLocation || service.location}</span>
            </div>
          </div>
        )}

        {/* Featured Badge */}
        {service.isFeatured && (
          <div className="absolute bottom-2 right-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded shadow-sm">
            ⭐ Featured
          </div>
        )}

        {!renderActions && (
          <button
            onClick={handleWishlistToggle}
            className={`absolute top-0 left-0 sm:top-2 sm:left-2 z-20 transition-colors ${isWishlisted ? 'text-green-600' : 'text-red-700 hover:text-red-600'}`}
            aria-label="Add to favorites"
            title="Add to favorites"
          >
            <FaHeart size={16} />
          </button>
        )}
      </div>

      {/* Service Details */}
      <div className={`${contentClassName} px-0 py-0 flex flex-col`}>
        <div>
          <h3
            className="px-2 sm:px-3 font-display font-bold text-gray-900 text-base sm:text-lg leading-tight mb-1.5 tracking-tight group-hover:text-blue-600 transition-colors truncate whitespace-nowrap"
            title={service.title}
          >
            {service.title}
          </h3>
        </div>

        <div className="mt-0 mb-0 relative">
          <div className="px-2 sm:px-3 flex flex-wrap gap-x-1.5 gap-y-0 items-baseline">
            <p className="font-sans text-base font-black text-gray-900">
              KES {Number(finalPrice).toLocaleString()}
            </p>
            {hasDiscount ? (
              <p className="text-xs text-gray-400 line-through decoration-gray-400">
                KES {Number(originalPrice).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-gray-400 line-through decoration-gray-400 invisible">-</p>
            )}
          </div>
        </div>

        {/* Keep only a tiny buffer between price and actions */}
        {/* Removed spacer below price */}

        {/* Action Bar */}
        <div className="flex items-center border-t border-gray-100 gap-1">
          {typeof renderActions === 'function' ? (
            renderActions({
              service,
              isBooked,
              handleBook,
              handleWishlistToggle,
              handleView
            })
          ) : (
            <>
              <button
                className={`flex-1 min-w-0 px-1 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold transition-colors truncate bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200`}
                title="Booking coming soon"
              >
                {!isOpen ? 'Closed' : 'Book Now'}
              </button>

              <button
                onClick={handleView}
                className="flex-1 min-w-0 px-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded transition-colors truncate"
              >
                View
              </button>
            </>
          )}
        </div>
      </div>
    </div >
  );
}