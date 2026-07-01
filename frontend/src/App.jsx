import React, { Suspense, lazy, useEffect, useState, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { initPerformanceMonitoring } from '@/utils/performance';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { PlatformProvider, usePlatform } from '@/contexts/PlatformContext';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import ReferrerBanner from '@/modules/marketing/components/ReferrerBanner';
import VerificationNotice from '@/modules/auth/components/VerificationNotice';
import ForcePasswordChangeModal from '@/modules/auth/components/ForcePasswordChangeModal';
import api from '@/shared/services/api';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RealtimeSync from '@/shared/components/RealtimeSync';
import DashboardGuard from '@/modules/dashboard/components/DashboardGuard';
import useTrafficTracker from '@/hooks/useTrafficTracker';
// import VerificationRequired from '@/modules/auth/components/VerificationRequired'; // Removed as per user request
import Home from '@/shared/pages/Home';
const MaintenancePage = React.lazy(() => import('@/shared/pages/MaintenancePage'));

// Define a loading component
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

// Use Vite's glob import for lazy loading
const pages = import.meta.glob('./pages/**/*.jsx');
const components = import.meta.glob('./components/**/*.jsx');

// PageLayout MUST be imported eagerly – it is the outermost shell used on every
// render. Lazy-loading it puts it in a separate chunk that initializes before
// React's internal dispatcher is ready, causing "Cannot read properties of null
// (reading 'useEffect')" hook crashes.
import PageLayout from '@/shared/components/PageLayout';
const Navbar = lazy(() => import('@/shared/components/Navbar'));
const MarketingNavbar = lazy(() => import('@/modules/marketing/components/MarketingNavbar'));
import MarketingBottomNav from '@/modules/marketing/components/MarketingBottomNav';
const Login = lazy(() => import('@/modules/auth/pages/Login'));


const DashboardLogin = lazy(() => import('@/modules/auth/pages/DashboardLogin'));
const Register = lazy(() => import('@/modules/auth/pages/Register'));
const ForgotPassword = lazy(() => import('@/modules/auth/pages/ForgotPassword'));
const AuthModal = lazy(() => import('@/modules/auth/components/AuthModal'));
const Cart = lazy(() => import('@/modules/orders/pages/Cart'));
const ProductDetails = lazy(() => import('@/modules/products/pages/ProductDetails'));
const Search = lazy(() => import('@/shared/pages/Search'));
const Category = lazy(() => import('@/modules/products/pages/Category'));
const Services = lazy(() => import('@/modules/services/pages/Services'));
const ServiceDetails = lazy(() => import('@/modules/services/pages/ServiceDetails'));
const FastFood = lazy(() => import('@/modules/fastfood/pages/FastFood'));
const FastFoodDetails = lazy(() => import('@/modules/fastfood/pages/FastFoodDetails'));
const Products = lazy(() => import('@/modules/products/pages/Products'));
const ComradesMenu = lazy(() => import('@/shared/pages/ComradesMenu'));
const ServicesManagement = lazy(() => import('@/modules/services/pages/ServicesManagement'));

// Public Footer Pages
const StaticContentPage = lazy(() => import('@/shared/pages/StaticContentPage'));
const AppContentManager = lazy(() => import('@/shared/pages/AppContentManager'));

// Marketing components
const MarketingDashboard = lazy(pages['./pages/marketing/MarketerDashboard.jsx']);
const MarketingOverview = lazy(pages['./pages/marketing/MarketingOverview.jsx']);
const MarketingPerformance = lazy(pages['./pages/marketing/MarketingPerformance.jsx']);
const ShareProducts = lazy(pages['./pages/marketing/ShareProducts.jsx']);
const SharedLinks = lazy(pages['./pages/marketing/SharedLinks.jsx']);
const Affiliates = lazy(pages['./pages/marketing/Affiliates.jsx']);
const Commissions = lazy(pages['./pages/marketing/Commissions.jsx']);
const MarketerWallet = lazy(pages['./pages/marketing/MarketerWallet.jsx']);
const MarketerPromoCodes = lazy(() => import('@/modules/marketing/pages/MarketerPromoCodes'));
// Lazy load account related components
const Account = lazy(pages['./pages/Account.jsx']);
const AccountVerification = lazy(pages['./pages/AccountVerification.jsx']);
const AccountPage = lazy(pages['./pages/AccountPage.jsx']);
const AccountSettings = lazy(pages['./pages/account/AccountSettings.jsx']);
const Profile = lazy(pages['./pages/Profile.jsx']);
const ProfileSettings = lazy(pages['./pages/account/ProfileSettings.jsx']);
const Addresses = lazy(pages['./pages/account/Addresses.jsx']);
const EditAccount = lazy(pages['./pages/EditAccount.jsx']);
const NationalIdUpload = lazy(pages['./pages/NationalIdUpload.jsx']);
const RequestDeletion = lazy(pages['./pages/RequestDeletion.jsx']);
const Orders = lazy(pages['./pages/Orders.jsx']);
// Lazy load seller related components
const Seller = lazy(pages['./pages/Seller.jsx']);
const SellerOverview = lazy(pages['./pages/seller/SellerOverview.jsx']);
const SellerProducts = lazy(pages['./pages/seller/SellerProducts.jsx']);
const ProductForm = lazy(pages['./pages/seller/ProductForm.jsx']);
const SellerOrders = lazy(pages['./pages/seller/SellerOrders.jsx']);
const SellerEarnings = lazy(pages['./pages/seller/SellerEarnings.jsx']);
const SellerAnalytics = lazy(pages['./pages/seller/SellerAnalytics.jsx']);
const SellerWallet = lazy(pages['./pages/seller/SellerWallet.jsx']);
const SellerReports = lazy(pages['./pages/seller/SellerReports.jsx']);
const SellerHelp = lazy(pages['./pages/seller/SellerHelp.jsx']);
const SellerHeroPromotions = lazy(pages['./pages/seller/SellerHeroPromotions.jsx']);
const SellerFastFoodPromotions = lazy(pages['./pages/seller/SellerFastFoodPromotions.jsx']);
const SellerProductView = lazy(pages['./pages/seller/SellerProductView.jsx']);
const SellerFastFoodView = lazy(pages['./pages/seller/SellerFastFoodView.jsx']);
const RecycleBin = lazy(pages['./pages/seller/RecycleBin.jsx']);
// Lazy load admin related components
const AdminMarketing = lazy(pages['./pages/admin/AdminMarketing.jsx']);
const AdminHeroPromotions = lazy(pages['./pages/admin/AdminHeroPromotions.jsx']);
const AdminFastFoodPromotions = lazy(pages['./pages/admin/AdminFastFoodPromotions.jsx']);
const AdminCreateHeroPromotion = lazy(pages['./pages/admin/AdminCreateHeroPromotion.jsx']);
const RoleApplicationsManager = lazy(pages['./pages/UserManagementComponents/RoleApplicationsManager.jsx']);
const PendingApplications = lazy(pages['./pages/UserManagementComponents/PendingApplications.jsx']);
const AdminIdVerification = lazy(pages['./pages/admin/AdminIdVerification.jsx']);
const JobOpeningManagement = lazy(pages['./pages/admin/JobOpeningManagement.jsx']);
// Lazy load marketer dashboard
const ServiceProviderWallet = lazy(pages['./pages/dashboard/ServiceProviderWallet.jsx']);
// Other components
const RoleApplication = lazy(pages['./pages/RoleApplication.jsx']);
const ProductShare = lazy(pages['./pages/ProductShare.jsx']);
const DeliveryAgent = lazy(pages['./pages/DeliveryAgent.jsx']);
const OpsManager = lazy(() => import('@/modules/admin/pages/OpsManager'));
const WorkWithUs = lazy(() => import('@/shared/pages/WorkWithUs'));
const RoleApplicationForm = lazy(() => import('@/modules/seller/pages/RoleApplicationForm'));
const LogisticsManager = lazy(() => import('@/modules/delivery/pages/LogisticsManager'));
const FinanceManager = lazy(() => import('@/modules/finance/pages/FinanceManager'));
const Dashboard = lazy(() => import('@/modules/dashboard/pages/Dashboard'));
const DeliveryFeeSettings = lazy(() => import('@/modules/delivery/pages/DeliveryFeeSettings'));
const Overview = lazy(() => import('@/shared/pages/Overview'));
const ProductManagement = lazy(() => import('@/modules/products/pages/ProductManagement'));
const DashboardProducts = lazy(() => import('@/modules/products/pages/Products'));
const StationManagerDashboard = lazy(() => import('@/modules/delivery/pages/StationManagerDashboard'));
const StationLogin = lazy(() => import('@/modules/auth/pages/StationLogin'));
const StationWallet = lazy(() => import('@/modules/delivery/pages/StationWallet'));
const ProductList = lazy(() => import('@/modules/products/pages/ProductList'));
const ComradesProducts = lazy(() => import('@/modules/products/pages/ComradesProducts'));
const ComradesProductList = lazy(() => import('@/modules/products/pages/ComradesProductList'));
const ComradesProductForm = lazy(() => import('@/modules/products/pages/ComradesProductForm'));
const ProductListingMode = lazy(() => import('@/modules/products/pages/ProductListingMode'));
import ScrollToTop from '@/shared/components/ScrollToTop';

// Subscription UI Pages
const AdminSubscriptions = lazy(() => import('@/modules/admin/pages/AdminSubscriptions'));
const SellerSubscriptions = lazy(() => import('@/modules/seller/pages/SellerSubscriptions'));
const CustomerSubscriptions = lazy(() => import('@/modules/users/pages/CustomerSubscriptions'));
const PricingPlans = lazy(() => import('@/shared/pages/PricingPlans'));
const GuestSubscriptionManager = lazy(() => import('@/shared/pages/GuestSubscriptionManager'));

const Customer = lazy(() => import('@/modules/users/pages/Customer'));
const CustomerOverview = lazy(() => import('@/modules/users/pages/CustomerOverview'));
const CustomerOrders = lazy(() => import('@/modules/orders/pages/CustomerOrders'));
const MyInquiries = lazy(() => import('@/shared/pages/MyInquiries'));
const SupportChat = lazy(() => import('@/shared/pages/SupportChat'));
const CancelOrder = lazy(() => import('@/modules/orders/pages/CancelOrder'));
const UpdateOrderAddress = lazy(() => import('@/modules/orders/pages/UpdateOrderAddress'));
const OrderTracking = lazy(() => import('@/modules/orders/pages/OrderTracking'));
const PublicTracking = lazy(() => import('@/modules/orders/pages/PublicTracking'));
const CustomerWishlist = lazy(() => import('@/modules/products/pages/CustomerWishlist'));
const CustomerAddresses = lazy(() => import('@/modules/users/pages/CustomerAddresses'));
const CustomerNotifications = lazy(() => import('@/modules/users/pages/CustomerNotifications'));
const NotificationsPage = lazy(() => import('@/shared/pages/NotificationsPage'));
const CustomerUpgrade = lazy(() => import('@/modules/users/pages/CustomerUpgrade'));
const MyApplications = lazy(() => import('@/shared/pages/MyApplications'));
const Checkout = lazy(() => import('@/modules/orders/pages/Checkout'));
const Wishlist = lazy(() => import('@/modules/products/pages/Wishlist'));

// New dashboard pages (converted to lazy loading)
const ReturnRequestPage = lazy(() => import('@/shared/pages/ReturnRequestPage'));
const UserManagement = lazy(() => import('@/modules/users/pages/UserManagement'));
const UserApplications = lazy(() => import('@/modules/users/pages/UserApplications'));
const UserManagementOverview = lazy(() => import('@/modules/users/pages/UserManagementOverview'));
const AuditLogViewer = lazy(() => import('@/shared/pages/AuditLogViewer'));
const MarketerManagement = lazy(() => import('@/shared/pages/MarketerManagement'));
const CreateService = lazy(() => import('@/modules/services/pages/CreateService'));
const MyServices = lazy(() => import('@/modules/services/pages/MyServices'));
const DeliveryAssignment = lazy(() => import('@/modules/delivery/pages/DeliveryAssignment'));
const DeliveryAgents = lazy(() => import('@/modules/delivery/pages/DeliveryAgents'));
const CommissionManagement = lazy(() => import('@/shared/pages/CommissionManagement'));
const ReferralAnalytics = lazy(() => import('@/shared/pages/ReferralAnalytics'));
const InventoryManagement = lazy(() => import('@/shared/pages/InventoryManagement'));
// removed HeroPromotionManager import
const EnhancedCategories = lazy(() => import('@/shared/pages/EnhancedCategories'));
const SystemSettings = lazy(() => import('@/shared/pages/SystemSettings'));
const SecuritySettings = lazy(() => import('@/shared/pages/SecuritySettings'));
const AdvancedReports = lazy(() => import('@/shared/pages/AdvancedReports'));
const BusinessAnalytics = lazy(() => import('@/shared/pages/BusinessAnalytics'));
const AdminOrders = lazy(() => import('@/modules/orders/pages/AdminOrders'));
const AdminReturnsList = lazy(() => import('@/modules/admin/pages/AdminReturnsList'));
const SuperAdminOrders = lazy(() => import('@/modules/orders/pages/SuperAdminOrders'));
const OrderAnalytics = lazy(() => import('@/modules/orders/pages/OrderAnalytics'));
const AdminOverview = lazy(() => import('@/modules/admin/pages/AdminOverview'));
const SuspendProduct = lazy(() => import('@/modules/products/pages/SuspendProduct'));
const AdminServicesApproval = lazy(() => import('@/modules/services/pages/AdminServicesApproval'));
const ServiceReviews = lazy(() => import('@/modules/services/pages/ServiceReviews'));
const SupportTickets = lazy(() => import('@/shared/pages/SupportTickets'));
const CustomerService = lazy(() => import('@/modules/services/pages/CustomerService'));
const FastFoodForm = lazy(() => import('@/modules/fastfood/pages/FastFoodForm'));
const FastFoodManagement = lazy(() => import('@/modules/fastfood/pages/FastFoodManagement'));
const HeroSettingsConfig = lazy(() => import('@/modules/marketing/pages/HeroSettingsConfig'));
const SmartProductForm = lazy(() => import('@/modules/products/pages/SmartProductForm'));
const TestDynamicForms = lazy(() => import('@/shared/pages/TestDynamicForms'));
const DeliveryAgentDashboard = lazy(() => import('@/modules/delivery/pages/DeliveryAgentDashboard'));
const DeliveryRequests = lazy(() => import('@/modules/delivery/pages/DeliveryRequests'));
const ServiceProviderDashboard = lazy(() => import('@/modules/services/pages/ServiceProviderDashboard'));
const OtherDashboards = lazy(() => import('@/modules/dashboard/pages/OtherDashboards'));
const SellerManagement = lazy(() => import('@/modules/seller/pages/SellerManagement'));
const ServiceProviderManagement = lazy(() => import('@/modules/services/pages/ServiceProviderManagement'));
const CustomerManagement = lazy(() => import('@/modules/users/pages/CustomerManagement'));
const WarehouseManagement = lazy(() => import('@/shared/pages/WarehouseManagement'));
const PickupStationManagement = lazy(() => import('@/modules/delivery/pages/PickupStationManagement'));
const SellerBusinessLocation = lazy(() => import('@/modules/seller/pages/SellerBusinessLocation'));
const ProductDeletionRequests = lazy(() => import('@/modules/products/pages/ProductDeletionRequests'));
const SystemRevenue = lazy(() => import('@/shared/pages/SystemRevenue'));
const PendingPayouts = lazy(() => import('@/modules/finance/pages/PendingPayouts'));
const AdminLiveMap = lazy(() => import('@/modules/admin/pages/AdminLiveMap'));
const DeliveryEarningVerification = lazy(() => import('@/modules/auth/pages/DeliveryEarningVerification'));
const BatchSystem = lazy(() => import('@/shared/pages/BatchSystem'));
const CustomerReturnsList = lazy(() => import('@/modules/users/pages/CustomerReturnsList'));
const FastFoodPickupPoints = lazy(() => import('@/modules/fastfood/pages/FastFoodPickupPoints'));
const ContactMessages = lazy(() => import('@/shared/pages/ContactMessages'));
const AdminOnBehalfCreation = lazy(() => import('@/modules/admin/pages/AdminOnBehalfCreation'));
const RoleTools = lazy(() => import('@/shared/pages/RoleTools'));
const DirectOrders = lazy(() => import('@/modules/orders/pages/DirectOrders'));
const MarketingNotifications = lazy(() => import('@/modules/marketing/pages/MarketingNotifications'));
const PromoCodes = lazy(() => import('@/modules/marketing/pages/PromoCodes'));
const AdminTools = lazy(() => import('@/modules/admin/pages/AdminTools'));
const DashboardManual = lazy(() => import('@/modules/dashboard/components/DashboardManual'));
const LogisticsInvoices = lazy(() => import('@/modules/delivery/pages/LogisticsInvoices'));

// Delivery Agent Sub-components
const DeliveryAgentOrders = lazy(() => import('@/modules/orders/pages/Orders'));
const DeliveryAgentAvailable = lazy(() => import('@/shared/pages/Available'));
const DeliveryLogistics = lazy(() => import('@/modules/delivery/pages/DeliveryLogistics'));
const DeliveryAgentAccount = lazy(() => import('@/modules/users/pages/Account'));

const DeliveryNotifications = lazy(() => import('@/shared/pages/Notifications'));
const DeliverySupport = lazy(() => import('@/shared/pages/Support'));
const DeliverySettings = lazy(() => import('@/shared/pages/Settings'));
const DeliveryLiveMap = lazy(() => import('@/shared/pages/LiveMap'));
const DeliveryWallet = lazy(() => import('@/modules/finance/pages/Wallet'));

// Main App component with providers
const AppWithProviders = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <PlatformProvider>
        <AuthProvider>
          <RealtimeSync />
          <CategoriesProvider>
            <CartProvider>
              <WishlistProvider>
                <Suspense fallback={<PageLoading />}>
                  <AppContent />
                </Suspense>
              </WishlistProvider>
            </CartProvider>
          </CategoriesProvider>
        </AuthProvider>
      </PlatformProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

const AppContent = () => {
  const { user, loading, verificationRequired } = useAuth();
  const location = useLocation();
  useTrafficTracker();
  const isStationUser = user?.role === 'station_manager' || user?.roles?.includes('station_manager') || user?.roles?.includes('warehouse_manager') || user?.roles?.includes('pickup_station_manager');
  const hideNavbar = ['/login', '/register', '/forgot-password', '/menu', '/station/login'].includes(location.pathname);
  const [isMarketingMode, setIsMarketingMode] = useState(() => {
    const isMode = localStorage.getItem('marketing_mode') === 'true' || window.location.pathname.startsWith('/marketing');
    if (isMode) localStorage.setItem('marketing_mode', 'true');
    return isMode;
  });
  const [referrerName, setReferrerName] = useState(localStorage.getItem('referrerName') || '');
  const [bannerDismissed, setBannerDismissed] = useState(localStorage.getItem('referrerBannerDismissed') === 'true');

  const { settings, loading: settingsLoading } = usePlatform();
  const isAdmin = useMemo(() => {
    const adminRoles = ['admin', 'super_admin', 'superadmin'];
    return adminRoles.includes(user?.role) || user?.roles?.some(r => adminRoles.includes(r));
  }, [user]);

  // On app load, fire one quick API call; if we get 503+maintenance redirect immediately
  useEffect(() => {
    // Never redirect away from admin, maintenance, or login paths
    const adminPaths = ['/dashboard', '/dashboard-login', '/maintenance', '/login'];
    const isAdminPath = adminPaths.some(p => window.location.pathname.startsWith(p));
    
    if (isAdminPath) return;

    if (settings.maintenance?.enabled) {
      if (!isAdmin) {
        if (settings.maintenance?.message) sessionStorage.setItem('maintenance_message', settings.maintenance.message);
        window.location.href = '/maintenance';
      }
    }
  }, [settings.maintenance, isAdmin]);

  // Handle referral links and marketing mode from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    const marketingParam = params.get('marketing');

    if (marketingParam === 'true' || location.pathname.startsWith('/marketing')) {
      console.log('[App] Ensuring Marketing Mode Persistence');
      localStorage.setItem('marketing_mode', 'true');
      if (!isMarketingMode) {
        setIsMarketingMode(true);
      }
    } else if (marketingParam === 'false') {
      console.log('[App] Explicitly Disabling Marketing Mode');
      localStorage.removeItem('marketing_mode');
      setIsMarketingMode(false);
    }
    // Note: We NO LONGER disable marketing mode just because a ref code is present.
    // This allows marketers to test their own links without losing their dashboard mode.

    if (refCode) {
      console.log('[App] Referral code detected:', refCode);
      localStorage.setItem('referrerCode', refCode);
      // When a new referral link is used, reset the dismissal flag so the banner shows again
      localStorage.removeItem('referrerBannerDismissed');
      setBannerDismissed(false);

      // Fetch marketer name
      api.get(`/marketing/ref-details/${refCode}`)
        .then(res => {
          if (res.data.name) {
            localStorage.setItem('referrerName', res.data.name);
            setReferrerName(res.data.name);
          }
        })
        .catch(err => {
          console.error('Failed to fetch marketer details:', err);
        });
    }
  }, [location.pathname, location.search]);

  // Keep marketing mode in sync with localStorage after in-app transitions.
  useEffect(() => {
    const syncMarketingMode = () => {
      setIsMarketingMode(localStorage.getItem('marketing_mode') === 'true');
    };

    const onStorage = (event) => {
      if (!event || event.key === 'marketing_mode') {
        syncMarketingMode();
      }
    };

    syncMarketingMode();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [location.pathname, location.search]);

  const handleClearReferrer = () => {
    // Only dismiss the banner UI, do NOT remove the referrerCode
    // The referrerCode must persist for checkout as long as they entered via the link
    localStorage.setItem('referrerBannerDismissed', 'true');
    setBannerDismissed(true);
  };

  // Initialize performance monitoring after initial render
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Only initialize performance monitoring in production
      initPerformanceMonitoring();
    }
  }, []);

  if (loading) {
    return <PageLoading />;
  }

  // Station accounts are restricted to station-only flows by default, 
  // but must be allowed to access dashboard management routes for warehouses and pickup stations.
  const isDashboardStationPath = location.pathname.startsWith('/dashboard/delivery/warehouses') || 
                                 location.pathname.startsWith('/dashboard/delivery/pickup-stations');

  if (isStationUser && !location.pathname.startsWith('/station') && !isDashboardStationPath && !['/dashboard-login', '/login'].includes(location.pathname)) {
    return <Navigate to="/station" replace />;
  }

  // If verification is required, show verification component
  // BUT allow access to profile and support pages so users can fix the issue
  // Global verification redirect removed per user request (unverified users can access everything except Work With Us)

  const isDashboardRoute = location.pathname.startsWith('/dashboard') ||
    ['/marketing', '/seller', '/customer', '/ops', '/logistics', '/finance', '/station'].some(path => location.pathname.startsWith(path));

  const isDetailRoute = location.pathname.startsWith('/product/') || 
                       location.pathname.startsWith('/category/') ||
                       location.pathname.startsWith('/fastfood/') || 
                       location.pathname.startsWith('/service/');

  // Simplified and robust padding logic
  let topPadding = "pt-[128px]"; // Default for home/search (Navbar + Search bar)
  if (isDetailRoute || isDashboardRoute) {
    topPadding = "pt-[50px] md:pt-16"; // Reduced from 56px to 50px to tighten mobile gaps
  }
  
  // If we have a referrer banner, we need extra space
  const hasReferrerBanner = !hideNavbar && !isMarketingMode && referrerName && !bannerDismissed;
  
  let paddingClass = hideNavbar ? "" : topPadding;
  if (isMarketingMode) {
    paddingClass += " pb-14 lg:pb-0";
  }

  return (
    <PageLayout fluid={isDashboardRoute}>
      <ScrollToTop />
      <Routes>
        {/* Verification Required Interceptor */}


        {/* Maintenance Mode Route – no auth required */}
        <Route path="/maintenance" element={<MaintenancePage />} />

        {/* Public order tracking – no login required */}
        <Route path="/track" element={<PublicTracking />} />
        <Route path="/track/:trackingNumber" element={<PublicTracking />} />

        {/* Commissions Standalone Route */}
        <Route path="/commissions" element={
          (user?.roles?.includes('marketer') || user?.roles?.includes('admin') || user?.roles?.includes('superadmin') || user?.roles?.includes('super_admin')) ? (
            <div className="min-h-screen bg-gray-50">
              {!hideNavbar && <Navbar />}
              <main className={paddingClass}>
                <Commissions />
              </main>
            </div>
          ) : <Navigate to="/" />
        } />

        {/* Catch-all route for Main App layout */}
        <Route path="*" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            {!hideNavbar && (isMarketingMode ? <MarketingNavbar /> : <Navbar />)}
            
            <VerificationNotice />
            
            {hasReferrerBanner && (
              <div className={paddingClass}>
                <ReferrerBanner referrerName={referrerName} onClear={handleClearReferrer} />
              </div>
            )}
            
            <main className={(hasReferrerBanner) ? "flex-1" : `flex-1 ${paddingClass}`}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home isMarketingMode={isMarketingMode} />} />
                <Route path="/category/:id" element={<Category />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/search" element={<Search />} />
                <Route path="/services" element={<Services />} />
                <Route path="/service/:id" element={<ServiceDetails />} />
                <Route path="/fastfood" element={<FastFood />} />
                <Route path="/fastfood/:id" element={<FastFoodDetails />} />
                <Route path="/menu" element={<ComradesMenu />} />
                <Route path="/products" element={<Products />} />
                <Route path="/pricing" element={<PricingPlans />} />
                <Route path="/guest/subscriptions/:token" element={<GuestSubscriptionManager />} />

                {/* Public Footer Pages */}
                <Route path="/about" element={<StaticContentPage pageKey="content_page_about" title="About Us" />} />
                <Route path="/contact" element={<StaticContentPage pageKey="content_page_contact" title="Contact Us" />} />
                <Route path="/terms" element={<StaticContentPage pageKey="content_page_terms" title="Terms of Service" />} />
                <Route path="/privacy" element={<StaticContentPage pageKey="content_page_privacy" title="Privacy Policy" />} />
                <Route path="/help" element={<StaticContentPage pageKey="content_page_help" title="Help Center" />} />
                <Route path="/faq" element={<StaticContentPage pageKey="content_page_faq" title="Frequently Asked Questions" />} />
                <Route path="/shipping" element={<StaticContentPage pageKey="content_page_shipping" title="Shipping & Returns" />} />
                <Route path="/payments" element={<StaticContentPage pageKey="content_page_payments" title="Payment Options" />} />
                <Route path="/size-guide" element={<StaticContentPage pageKey="content_page_size_guide" title="Size Guide" />} />

                {/* Authentication Routes */}
                {/* Authentication Routes - Now handled via Modals over Home */}
                <Route path="/login" element={!user ? <><Home /><AuthModal /></> : <Navigate to="/" />} />
                <Route path="/account" element={!user ? <Navigate to="/login" replace /> : <Navigate to="/customer" />} />
                <Route path="/register" element={!user ? <><Home /><AuthModal /></> : <Navigate to="/" />} />
                <Route path="/forgot-password" element={<><Home /><AuthModal /></>} />
                <Route path="/station/login" element={<StationLogin />} />

                {/* Cart & Checkout */}
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/dashboard-login" element={<DashboardLogin />} />

                {/* Protected Dashboard Route */}
                <Route path="/dashboard/*" element={
                  <ProtectedRoute requiredRole={['admin', 'super_admin', 'superadmin', 'logistics_manager', 'delivery_agent', 'finance_manager', 'warehouse_manager', 'pickup_station_manager']}>
                    <DashboardGuard>
                      <Dashboard />
                    </DashboardGuard>
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminOverview />} />
                  <Route path="analytics" element={<AdvancedReports />} />
                  <Route path="users" element={<UserManagementOverview />} />
                  <Route path="users/role-applications" element={<RoleApplicationsManager />} />
                  <Route path="users/role-applications/:tab" element={<RoleApplicationsManager />} />
                  <Route path="users/marketers" element={<MarketerManagement />} />
                  <Route path="users/marketers/:tab" element={<MarketerManagement />} />
                  <Route path="users/delivery-agents" element={<DeliveryAgents />} />
                  <Route path="users/delivery-agents/:tab" element={<DeliveryAgents />} />
                  <Route path="users/sellers" element={<SellerManagement />} />
                  <Route path="users/sellers/:tab" element={<SellerManagement />} />
                  <Route path="users/service-providers" element={<ServiceProviderManagement />} />
                  <Route path="users/customers" element={<CustomerManagement />} />
                  <Route path="users/verifications" element={<AdminIdVerification />} />
                  <Route path="users/job-openings" element={<JobOpeningManagement />} />

                  {/* Comprehensive User Management */}
                  <Route path="user-management" element={<UserManagement />} />
                  <Route path="user-management/:action" element={<UserManagement />} />
                  <Route path="product-management" element={<ProductManagement />} />
                  <Route path="products/recycle-bin" element={<RecycleBin />} />
                  <Route path="products" element={<DashboardProducts />} />
                  <Route path="products/suspend" element={<SuspendProduct />} />
                  <Route path="products/:view" element={<DashboardProducts />} />
                  <Route path="products/:view/:id" element={<DashboardProducts />} />
                  <Route path="products/comrades" element={<ComradesProducts />} />
                  <Route path="products/comrades/new" element={<ComradesProductForm />} />
                  <Route path="products/comrades/pending" element={<ComradesProducts status="pending" />} />
                  <Route path="products/comrades/rejected" element={<ComradesProducts status="rejected" />} />
                  <Route path="products/comrades/:id/edit" element={<ComradesProductForm mode="edit" />} />
                  <Route path="products/comrades/list/:id" element={<ComradesProductList />} />

                  <Route path="comrades-products" element={<Navigate to="products/comrades" replace />} />

                  <Route path="categories" element={<EnhancedCategories />} />

                  <Route path="services" element={<ServicesManagement />} />
                  <Route path="services/create" element={<CreateService />} />
                  <Route path="services/my" element={<MyServices />} />
                  <Route path="services/reviews" element={<ServiceReviews />} />
                  <Route path="services/:id" element={<ServiceDetails />} />
                  <Route path="services-approval" element={<AdminServicesApproval />} />

                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/returns" element={<AdminReturnsList />} />
                  <Route path="orders/my-sales" element={<SuperAdminOrders />} />
                  <Route path="orders/assignments" element={<DeliveryAssignment />} />
                  <Route path="orders/requests" element={<DeliveryRequests />} />
                  <Route path="orders/agents" element={<DeliveryAgents />} />
                  <Route path="orders/analytics" element={<OrderAnalytics />} />
                  <Route path="fastfood" element={<FastFoodManagement />} />
                  <Route path="fastfood/hero-settings" element={<HeroSettingsConfig />} />
                  <Route path="fastfood/batch-system" element={<BatchSystem />} />
                  <Route path="fastfood/new" element={<FastFoodForm />} />
                  <Route path="fastfood/edit/:id" element={<FastFoodForm mode="edit" />} />
                  <Route path="fastfood/pickup-points" element={<FastFoodPickupPoints />} />
                  <Route path="fastfood/edit/:id" element={<FastFoodForm mode="edit" />} />
                  <Route path="delivery/warehouses" element={<WarehouseManagement />} />
                  <Route path="delivery/pickup-stations" element={<PickupStationManagement />} />
                  <Route path="delivery/settings" element={<DeliveryFeeSettings />} />
                  <Route path="delivery/metrics" element={<AdvancedReports />} />
                  <Route path="analytics/business" element={<BusinessAnalytics />} />
                  <Route path="finance/dashboard" element={<FinanceManager />} />
                  <Route path="finance/commissions" element={<CommissionManagement />} />
                  <Route path="finance/referrals" element={<ReferralAnalytics />} />
                  <Route path="finance/reports" element={<AdvancedReports />} />
                  <Route path="finance/revenue" element={<SystemRevenue />} />
                  <Route path="finance/payouts" element={<PendingPayouts />} />
                  <Route path="finance/logistics-invoices" element={<LogisticsInvoices />} />
                  <Route path="marketing/hero-promotions" element={<AdminHeroPromotions />} />
                  <Route path="marketing/thank-you" element={<MarketingNotifications />} />
                  <Route path="marketing/promo-codes" element={<PromoCodes />} />
                  <Route path="marketing/hero-promotions/create" element={<AdminCreateHeroPromotion />} />
                  <Route path="marketing/fastfood-promotions" element={<AdminFastFoodPromotions />} />
                  <Route path="settings/platform" element={<SystemSettings />} />
                  <Route path="settings/app-content" element={<AppContentManager />} />
                  <Route path="settings/security" element={<SecuritySettings />} />
                  <Route path="products/deletion-requests" element={<ProductDeletionRequests />} />
                  <Route path="support" element={<SupportTickets />} />
                  <Route path="contact-messages" element={<ContactMessages />} />
                  <Route path="support/service" element={<CustomerService />} />
                  <Route path="delivery/live-map" element={<AdminLiveMap />} />
                  <Route path="delivery/auditing" element={<DeliveryEarningVerification />} />
                  <Route path="on-behalf-creation" element={<AdminOnBehalfCreation />} />
                  <Route path="direct-orders" element={<DirectOrders />} />
                  <Route path="other-dashboards" element={<OtherDashboards />} />
                  <Route path="admin-tools" element={<AdminTools />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="admin-tools/audit-log" element={<AuditLogViewer />} />
                  <Route path="manual" element={<DashboardManual role="admin" />} />
                  {/* Logistics Manager entry point */}
                  <Route path="logistics" element={<Navigate to="/dashboard/orders" replace />} />
                </Route>

                {/* Marketing Dashboard */}
                <Route path="/marketing/*" element={
                  <ProtectedRoute requiredRole={['marketer', 'admin', 'superadmin', 'super_admin']}>
                    <DashboardGuard>
                      <MarketingDashboard />
                    </DashboardGuard>
                  </ProtectedRoute>
                }>
                  <Route index element={<MarketingOverview />} />
                  <Route path="performance" element={<MarketingPerformance />} />
                  <Route path="share" element={<ShareProducts />} />
                  <Route path="links" element={<SharedLinks />} />
                  <Route path="affiliates" element={<Affiliates />} />
                  <Route path="commissions" element={<Commissions />} />
                  <Route path="wallet" element={<MarketerWallet />} />
                  <Route path="direct-orders" element={<DirectOrders />} />
                  <Route path="promo-codes" element={<MarketerPromoCodes />} />
                  <Route path="manual" element={<DashboardManual role="marketer" />} />
                </Route>

                {/* Seller Dashboard */}
                <Route path="/seller/*" element={
                  <ProtectedRoute requiredRole={['seller', 'admin', 'superadmin', 'super_admin']}>
                    <DashboardGuard>
                      <Seller />
                    </DashboardGuard>
                  </ProtectedRoute>
                }>
                  <Route index element={<SellerOverview />} />
                  <Route path="products" element={<SellerProducts />} />
                  <Route path="products/add" element={isAdmin ? <ComradesProductForm /> : <ProductForm />} />
                  <Route path="products/:id/edit" element={isAdmin ? <ComradesProductForm mode="edit" /> : <ProductForm mode="edit" />} />
                  <Route path="products/view/:id" element={<SellerProductView />} />
                  <Route path="orders" element={<SellerOrders />} />
                  <Route path="earnings" element={<SellerEarnings />} />
                  <Route path="analytics" element={<SellerAnalytics />} />
                  <Route path="subscriptions" element={<SellerSubscriptions />} />
                  <Route path="wallet" element={<SellerWallet />} />
                  <Route path="reports" element={<SellerReports />} />
                  <Route path="recycle-bin" element={<RecycleBin />} />
                  <Route path="promotions" element={<SellerHeroPromotions />} />
                  <Route path="fastfood-promotions" element={<SellerFastFoodPromotions />} />
                  <Route path="business-location" element={<SellerBusinessLocation />} />
                  <Route path="inventory" element={<InventoryManagement onBack={() => window.history.back()} />} />
                  <Route path="help" element={<SellerHelp />} />
                  <Route path="direct-orders" element={<DirectOrders />} />
                  <Route path="manual" element={<DashboardManual role="seller" />} />

                  {/* Fast Food Management Routes for Sellers */}
                  <Route path="fast-food" element={<FastFoodManagement />} />
                  <Route path="fast-food/hero-settings" element={<HeroSettingsConfig />} />
                  <Route path="fast-food/new" element={<FastFoodForm isSellerContext={true} />} />
                  <Route path="fast-food/edit/:id" element={<FastFoodForm mode="edit" isSellerContext={true} />} />
                  <Route path="fast-food/view/:id" element={<SellerFastFoodView />} />
                  <Route path="tools" element={<RoleTools role="seller" />} />
                </Route>

                {/* Operations Dashboard */}
                <Route path="/ops/*" element={
                  <ProtectedRoute requiredRole={['ops_manager', 'admin', 'superadmin', 'super_admin']}>
                    <DashboardGuard>
                      <OpsManager />
                    </DashboardGuard>
                  </ProtectedRoute>
                } />

                {/* Logistics Manager Dashboard - now redirects into /dashboard */}
                <Route path="/logistics/*" element={
                  <ProtectedRoute requiredRole={['logistics_manager', 'admin', 'superadmin', 'super_admin']}>
                    <Navigate to="/dashboard/orders" replace />
                  </ProtectedRoute>
                } />

                {/* Finance Manager Dashboard */}
                <Route path="/finance/*" element={
                  <ProtectedRoute requiredRole={['finance_manager', 'admin', 'superadmin', 'super_admin']}>
                    <DashboardGuard>
                      <FinanceManager />
                    </DashboardGuard>
                  </ProtectedRoute>
                } />

                <Route path="/station" element={
                  <ProtectedRoute requiredRole={['station_manager', 'warehouse_manager', 'pickup_station_manager']}>
                    <StationManagerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/station/manual" element={
                  <ProtectedRoute requiredRole={['station_manager', 'warehouse_manager', 'pickup_station_manager']}>
                    <DashboardManual role="station" />
                  </ProtectedRoute>
                } />
                <Route path="/station/wallet" element={
                  <ProtectedRoute requiredRole={['station_manager', 'warehouse_manager', 'pickup_station_manager']}>
                    <StationWallet />
                  </ProtectedRoute>
                } />

                {/* Customer Routes */}
                <Route path="/customer/*" element={<Customer />}>
                  <Route index element={<CustomerOverview />} />
                  <Route path="inquiries" element={<MyInquiries />} />
                  <Route path="support" element={<SupportChat />} />
                  <Route path="orders" element={<CustomerOrders />} />
                  <Route path="orders/:orderId/track" element={<OrderTracking />} />
                  <Route path="orders/:orderId/cancel" element={<CancelOrder />} />
                  <Route path="orders/:orderId/update-address" element={<UpdateOrderAddress />} />
                  <Route path="orders/:orderId/return" element={<ReturnRequestPage />} />
                  <Route path="returns" element={<CustomerReturnsList />} />
                  <Route path="wishlist" element={<Wishlist />} />
                  <Route path="wallet" element={<div>Wallet</div>} />
                  <Route path="subscriptions" element={<CustomerSubscriptions />} />
                  <Route path="address" element={<CustomerAddresses />} />
                  <Route path="settings" element={<AccountSettings />} />
                  <Route path="account-page" element={<AccountPage />} />
                  <Route path="account-verification" element={<AccountVerification />} />
                  <Route path="id-upload" element={<NationalIdUpload />} />
                  <Route path="applications" element={<MyApplications />} />
                  <Route path="work-with-us" element={<WorkWithUs />} />
                  <Route path="apply/:role" element={<RoleApplicationForm />} />
                  <Route path="manual" element={<DashboardManual role="customer" />} />
                </Route>

                {/* Redirects for legacy /work-with-us and /apply/:role links */}
                <Route path="/work-with-us" element={<Navigate to="/customer/work-with-us" replace />} />
                <Route path="/apply/:role" element={<Navigate to="/customer/work-with-us" replace />} />


                {/* Delivery Agent Dashboard */}
                <Route path="/delivery/*" element={
                  <ProtectedRoute requiredRole={['delivery_agent', 'admin', 'superadmin', 'super_admin']}>
                    <DashboardGuard>
                      <DeliveryAgentDashboard />
                    </DashboardGuard>
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="orders" replace />} />
                  <Route path="orders" element={<DeliveryAgentOrders />} />
                  <Route path="available" element={<DeliveryAgentAvailable />} />
                  <Route path="logistics" element={<DeliveryLogistics />} />
                  <Route path="completed" element={<Navigate to="../logistics" replace />} />
                  <Route path="history" element={<Navigate to="../logistics" replace />} />
                  <Route path="earnings" element={<Navigate to="../logistics" replace />} />
                  <Route path="account" element={<DeliveryAgentAccount />} />

                  <Route path="wallet" element={<DeliveryWallet />} />
                  <Route path="notifications" element={<DeliveryNotifications />} />
                  <Route path="support" element={<DeliverySupport />} />
                   <Route path="settings" element={<DeliverySettings />} />
                  <Route path="map" element={<DeliveryLiveMap />} />
                  <Route path="tools" element={<RoleTools role="delivery" />} />
                  <Route path="manual" element={<DashboardManual role="delivery" />} />
                </Route>

                {/* Service Provider Dashboard - Standalone route outside main dashboard */}
                <Route
                  path="/dashboard/service-provider/*"
                  element={
                    <ProtectedRoute requiredRole={['service_provider', 'admin', 'superadmin', 'super_admin']}>
                      <DashboardGuard>
                        <div className="min-h-screen bg-gray-50">
                          {!hideNavbar && <Navbar />}
                          <main className="pt-16">
                            <ServiceProviderDashboard />
                          </main>
                        </div>
                      </DashboardGuard>
                    </ProtectedRoute>
                  }
                >
                  <Route path="create-service" element={<CreateService />} />
                  <Route path="my-services" element={<MyServices />} />
                  <Route path="booking-list" element={<div>Booking List Page</div>} />
                  <Route path="messages" element={<div>Messages Page</div>} />
                  <Route path="reviews" element={<div>Reviews Page</div>} />
                  <Route path="revenue" element={<div>Revenue Page</div>} />
                  <Route path="wallet" element={<ServiceProviderWallet />} />
                  <Route path="manual" element={<DashboardManual role="service_provider" />} />
                </Route>
              </Routes>
            </main>
          </div>
        } />
      </Routes>
      
      {/* Force Password Change Modal */}
      {user?.mustChangePassword && (
        <ForcePasswordChangeModal isOpen={true} user={user} />
      )}

        {/* Global Marketing Mode Bottom Nav (Mobile Only inside component) */}
        {isMarketingMode && <MarketingBottomNav />}
        
        {/* Global Toast Notifications */}
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </PageLayout>

  );
};

export default AppWithProviders;
