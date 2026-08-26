import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { initPerformanceMonitoring } from './utils/performance';
import { CategoriesProvider } from './contexts/CategoriesContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import ErrorBoundary from './shared/components/ErrorBoundary';
import LoadingSpinner from './shared/components/LoadingSpinner';
import ProtectedRoute from './shared/components/ProtectedRoute';
import ReferrerBanner from './modules/marketing/components/ReferrerBanner';
import ForcePasswordChangeModal from './modules/auth/components/ForcePasswordChangeModal';
import api from './services/api';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RealtimeSync from './shared/components/RealtimeSync';
import DashboardGuard from './modules/dashboard/components/DashboardGuard';
// import VerificationRequired from './components/VerificationRequired'; // Removed as per user request
import Home from './shared/pages/Home';
const MaintenancePage = React.lazy(() => import('./shared/pages/MaintenancePage'));

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
import PageLayout from './shared/components/PageLayout';
const Navbar = lazy(() => import('./shared/components/Navbar'));
const MarketingNavbar = lazy(() => import('./modules/marketing/components/MarketingNavbar'));
import MarketingBottomNav from './modules/marketing/components/MarketingBottomNav';
const Login = lazy(() => import('./modules/auth/pages/Login'));


const DashboardLogin = lazy(() => import('./modules/auth/pages/DashboardLogin'));
const Register = lazy(() => import('./modules/auth/pages/Register'));
const ForgotPassword = lazy(() => import('./modules/auth/pages/ForgotPassword'));
const AuthModal = lazy(() => import('./modules/auth/components/AuthModal'));
const Cart = lazy(() => import('./modules/orders/pages/Cart'));
const ProductDetails = lazy(() => import('./modules/products/pages/ProductDetails'));
const Search = lazy(() => import('./shared/pages/Search'));
const Category = lazy(() => import('./modules/products/pages/Category'));
const Services = lazy(() => import('./modules/services/pages/Services'));
const ServiceDetails = lazy(() => import('./modules/services/pages/ServiceDetails'));
const FastFood = lazy(() => import('./modules/fastfood/pages/FastFood'));
const FastFoodDetails = lazy(() => import('./modules/fastfood/pages/FastFoodDetails'));
const Products = lazy(() => import('./modules/products/pages/Products'));
const ComradesMenu = lazy(() => import('./shared/pages/ComradesMenu'));
const ServicesManagement = lazy(() => import('./modules/services/pages/ServicesManagement'));

// Public Footer Pages
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const StaticContentPage = lazy(() => import('./shared/pages/StaticContentPage'));
const AppContentManager = lazy(() => import('./shared/pages/AppContentManager'));

// Marketing components
const MarketingDashboard = lazy(() => import('./modules/dashboard/pages/MarketerDashboard'));
const MarketingOverview = lazy(() => import('./modules/marketing/pages/MarketingOverview'));
const MarketingPerformance = lazy(() => import('./modules/marketing/pages/MarketingPerformance'));
const ShareProducts = lazy(() => import('./modules/products/pages/ShareProducts'));
const SharedLinks = lazy(() => import('./shared/pages/SharedLinks'));
const Affiliates = lazy(() => import('./shared/pages/Affiliates'));
const Commissions = lazy(() => import('./shared/pages/Commissions'));
const MarketerWallet = lazy(() => import('./modules/finance/pages/MarketerWallet'));
// Lazy load account related components
const Account = lazy(() => import('./modules/users/pages/Account'));
const AccountVerification = lazy(() => import('./modules/auth/pages/AccountVerification'));
const AccountPage = lazy(() => import('./modules/users/pages/AccountPage'));
const DeliveryAgentAccount = Account;
const AccountSettings = lazy(() => import('./modules/users/pages/AccountSettings'));
const Profile = lazy(() => import('./modules/users/pages/Profile'));
const ProfileSettings = lazy(() => import('./modules/users/pages/ProfileSettings'));
const Addresses = lazy(() => import('./shared/pages/Addresses'));
const EditAccount = lazy(() => import('./modules/users/pages/EditAccount'));
const NationalIdUpload = lazy(() => import('./modules/users/pages/NationalIdUpload'));
const RequestDeletion = lazy(() => import('./shared/pages/RequestDeletion'));
const Orders = lazy(() => import('./modules/orders/pages/Orders'));
// Lazy load seller related components
const Seller = lazy(() => import('./modules/seller/pages/Seller'));
const SellerOverview = lazy(() => import('./modules/seller/pages/SellerOverview'));
const SellerProducts = lazy(() => import('./modules/products/pages/SellerProducts'));
const ProductForm = lazy(() => import('./modules/products/pages/ProductForm'));
const SellerOrders = lazy(() => import('./modules/orders/pages/SellerOrders'));
const SellerEarnings = lazy(() => import('./modules/finance/pages/SellerEarnings'));
const SellerAnalytics = lazy(() => import('./modules/seller/pages/SellerAnalytics'));
const SellerWallet = lazy(() => import('./modules/finance/pages/SellerWallet'));
const SellerReports = lazy(() => import('./modules/seller/pages/SellerReports'));
const SellerHelp = lazy(() => import('./modules/seller/pages/SellerHelp'));
const SellerHeroPromotions = lazy(() => import('./modules/seller/pages/SellerHeroPromotions'));
const SellerFastFoodPromotions = lazy(() => import('./modules/fastfood/pages/SellerFastFoodPromotions'));
const SellerProductView = lazy(() => import('./modules/products/pages/SellerProductView'));
const SellerFastFoodView = lazy(() => import('./modules/fastfood/pages/SellerFastFoodView'));
const RecycleBin = lazy(() => import('./shared/pages/RecycleBin'));
// Lazy load admin related components
const AdminMarketing = lazy(() => import('./modules/admin/pages/AdminMarketing'));
const AdminHeroPromotions = lazy(() => import('./modules/admin/pages/AdminHeroPromotions'));
const AdminVideoBanners = lazy(() => import('./modules/admin/pages/AdminVideoBanners'));
const AdminFastFoodPromotions = lazy(() => import('./modules/fastfood/pages/AdminFastFoodPromotions'));
const AdminCreateHeroPromotion = lazy(() => import('./modules/admin/pages/AdminCreateHeroPromotion'));
const AdminCreateVideoBanner = lazy(() => import('./modules/admin/pages/AdminCreateVideoBanner'));
const AdminOnBehalfCreation = lazy(() => import('./modules/admin/pages/AdminOnBehalfCreation'));
const AdminTools = lazy(() => import('./modules/admin/pages/AdminTools'));
const AdminSubscriptions = lazy(() => import('./modules/admin/pages/AdminSubscriptions'));
const PromoCodes = lazy(() => import('./modules/marketing/pages/PromoCodes'));
const MarketingNotifications = lazy(() => import('./modules/marketing/pages/MarketingNotifications'));
const DirectOrders = lazy(() => import('./modules/orders/pages/DirectOrders'));
const RoleEarningVerification = lazy(() => import('./modules/auth/pages/RoleEarningVerification'));
const DeliveryEarningVerification = lazy(() => import('./modules/auth/pages/DeliveryEarningVerification'));
const RoleApplicationsManager = lazy(() => import('./modules/admin/components/UserManagementComponents/RoleApplicationsManager'));
const PendingApplications = lazy(() => import('./modules/admin/components/UserManagementComponents/PendingApplications'));
const AdminIdVerification = lazy(() => import('./modules/auth/pages/AdminIdVerification'));
const JobOpeningManagement = lazy(() => import('./shared/pages/JobOpeningManagement'));
// Lazy load marketer dashboard
const ServiceProviderWallet = lazy(() => import('./modules/services/pages/ServiceProviderWallet'));
// Other components
const RoleApplication = lazy(() => import('./modules/seller/pages/RoleApplication'));
const ProductShare = lazy(() => import('./modules/products/pages/ProductShare'));
const DeliveryAgent = lazy(() => import('./modules/delivery/pages/DeliveryAgent'));
const OpsManager = lazy(() => import('./modules/admin/pages/OpsManager'));
const WorkWithUs = lazy(() => import('./shared/pages/WorkWithUs'));
const RoleApplicationForm = lazy(() => import('./modules/seller/pages/RoleApplicationForm'));
const LogisticsManager = lazy(() => import('./modules/delivery/pages/LogisticsManager'));
const FinanceManager = lazy(() => import('./modules/finance/pages/FinanceManager'));
const Dashboard = lazy(() => import('./modules/dashboard/pages/Dashboard'));
const DeliveryFeeSettings = lazy(() => import('./modules/delivery/pages/DeliveryFeeSettings'));
const Overview = lazy(() => import('./shared/pages/Overview'));
const ProductManagement = lazy(() => import('./modules/products/pages/ProductManagement'));
const ProductHub = lazy(() => import('./modules/products/pages/ProductManagement')); // Product Hub for /dashboard/products (fallback to ProductManagement)
const ProductHubFull = lazy(() => import('./modules/products/pages/ProductHubFull')); // Full Product Hub with all action cards
const StationManagerDashboard = lazy(() => import('./modules/delivery/pages/StationManagerDashboard'));
const StationLogin = lazy(() => import('./modules/auth/pages/StationLogin'));
const ProductList = lazy(() => import('./modules/products/pages/ProductList'));
const ComradesProducts = lazy(() => import('./modules/products/pages/ComradesProducts'));
const ComradesProductList = lazy(() => import('./modules/products/pages/ComradesProductList'));
const ComradesProductForm = lazy(() => import('./modules/products/pages/ComradesProductForm'));
const ProductListingMode = lazy(() => import('./modules/products/pages/ProductListingMode'));
const ProductListingView = lazy(() => import('./modules/products/pages/ProductListingView'));
const ProductAnalytics = lazy(() => import('./modules/products/pages/ProductAnalytics'));
const ProductIDDemo = lazy(() => import('./modules/products/pages/ProductIDDemo'));
const SellerSubscriptions = lazy(() => import('./modules/seller/pages/SellerSubscriptions'));
const CustomerMealPlans = lazy(() => import('./modules/users/pages/CustomerMealPlans'));
const CreatePersonalMealPlan = lazy(() => import('./modules/users/pages/CreatePersonalMealPlan'));
const EditPersonalMealPlan = lazy(() => import('./modules/users/pages/EditPersonalMealPlan'));
const CustomerSubscriptions = lazy(() => import('./modules/users/pages/CustomerSubscriptions'));
const SubscriptionBenefits = lazy(() => import('./modules/users/pages/SubscriptionBenefits'));
const FastFoodFormTest = lazy(() => import('./modules/fastfood/pages/FastFoodFormTest'));
const LogisticsInvoices = lazy(() => import('./modules/delivery/pages/LogisticsInvoices'));
const StationWallet = lazy(() => import('./modules/delivery/pages/StationWallet'));
const AdminConfig = lazy(() => import('./modules/admin/pages/AdminConfig'));
const PricingPromotions = lazy(() => import('./modules/marketing/pages/PricingPromotions'));
const LearningResources = lazy(() => import('./modules/finance/pages/LearningResources'));
const CustomerWallet = lazy(() => import('./modules/finance/pages/CustomerWallet'));
import ScrollToTop from './shared/components/ScrollToTop';

const Customer = lazy(() => import('./modules/users/pages/Customer'));
const CustomerOverview = lazy(() => import('./modules/users/pages/CustomerOverview'));
const CustomerOrders = lazy(() => import('./modules/orders/pages/CustomerOrders'));
const MyInquiries = lazy(() => import('./shared/pages/MyInquiries'));
const CancelOrder = lazy(() => import('./modules/orders/pages/CancelOrder'));
const UpdateOrderAddress = lazy(() => import('./modules/orders/pages/UpdateOrderAddress'));
const OrderTracking = lazy(() => import('./modules/orders/pages/OrderTracking'));
const PublicTracking = lazy(() => import('./modules/orders/pages/PublicTracking'));
const CustomerWishlist = lazy(() => import('./modules/products/pages/CustomerWishlist'));
const CustomerAddresses = lazy(() => import('./modules/users/pages/CustomerAddresses'));
const CustomerNotifications = lazy(() => import('./modules/users/pages/CustomerNotifications'));
const NotificationsPage = lazy(() => import('./shared/pages/NotificationsPage'));
const CustomerUpgrade = lazy(() => import('./modules/users/pages/CustomerUpgrade'));
const MyApplications = lazy(() => import('./shared/pages/MyApplications'));
const Checkout = lazy(() => import('./modules/orders/pages/Checkout'));
const Wishlist = lazy(() => import('./modules/products/pages/Wishlist'));

// New dashboard pages (converted to lazy loading)
const ReturnRequestPage = lazy(() => import('./shared/pages/ReturnRequestPage'));
const UserManagement = lazy(() => import('./modules/users/pages/UserManagement'));
const UserApplications = lazy(() => import('./modules/users/pages/UserApplications'));
const UserManagementOverview = lazy(() => import('./modules/users/pages/UserManagementOverview'));
const MarketerManagement = lazy(() => import('./shared/pages/MarketerManagement'));
const CreateService = lazy(() => import('./modules/services/pages/CreateService'));
const MyServices = lazy(() => import('./modules/services/pages/MyServices'));
const DeliveryAssignment = lazy(() => import('./modules/delivery/pages/DeliveryAssignment'));
const DeliveryAgents = lazy(() => import('./modules/delivery/pages/DeliveryAgents'));
const CommissionManagement = lazy(() => import('./shared/pages/CommissionManagement'));
const ReferralAnalytics = lazy(() => import('./shared/pages/ReferralAnalytics'));
const InventoryManagement = lazy(() => import('./shared/pages/InventoryManagement'));
// removed HeroPromotionManager import
const EnhancedCategories = lazy(() => import('./shared/pages/EnhancedCategories'));
const SystemSettings = lazy(() => import('./shared/pages/SystemSettings'));
const SecuritySettings = lazy(() => import('./shared/pages/SecuritySettings'));
const AdvancedReports = lazy(() => import('./shared/pages/AdvancedReports'));
const AdminOrders = lazy(() => import('./modules/orders/pages/AdminOrders'));
const AdminReturnsList = lazy(() => import('./modules/admin/pages/AdminReturnsList'));
const SuperAdminOrders = lazy(() => import('./modules/orders/pages/SuperAdminOrders'));
const OrderAnalytics = lazy(() => import('./modules/orders/pages/OrderAnalytics'));
const AdminOverview = lazy(() => import('./modules/admin/pages/AdminOverview'));
const SuspendProduct = lazy(() => import('./modules/products/pages/SuspendProduct'));
const AdminServicesApproval = lazy(() => import('./modules/services/pages/AdminServicesApproval'));
const ServiceReviews = lazy(() => import('./modules/services/pages/ServiceReviews'));
const SupportTickets = lazy(() => import('./shared/pages/SupportTickets'));
const CustomerService = lazy(() => import('./modules/services/pages/CustomerService'));
const FastFoodForm = lazy(() => import('./modules/fastfood/pages/FastFoodForm'));
const FastFoodManagement = lazy(() => import('./modules/fastfood/pages/FastFoodManagement'));
const HeroSettingsConfig = lazy(() => import('./modules/marketing/pages/HeroSettingsConfig'));
const SmartProductForm = lazy(() => import('./modules/products/pages/SmartProductForm'));
const TestDynamicForms = lazy(() => import('./shared/pages/TestDynamicForms'));
const DeliveryAgentDashboard = lazy(() => import('./modules/delivery/pages/DeliveryAgentDashboard'));
const DeliveryRequests = lazy(() => import('./modules/delivery/pages/DeliveryRequests'));
const DeliveryAuditing = lazy(() => import('./modules/auth/pages/RoleEarningVerification'));
const ServiceProviderDashboard = lazy(() => import('./modules/services/pages/ServiceProviderDashboard'));
const OtherDashboards = lazy(() => import('./modules/dashboard/pages/OtherDashboards'));
const SellerManagement = lazy(() => import('./modules/seller/pages/SellerManagement'));
const ServiceProviderManagement = lazy(() => import('./modules/services/pages/ServiceProviderManagement'));
const CustomerManagement = lazy(() => import('./modules/users/pages/CustomerManagement'));
const WarehouseManagement = lazy(() => import('./shared/pages/WarehouseManagement'));
const PickupStationManagement = lazy(() => import('./modules/delivery/pages/PickupStationManagement'));
const SellerBusinessLocation = lazy(() => import('./modules/seller/pages/SellerBusinessLocation'));
const ProductDeletionRequests = lazy(() => import('./modules/products/pages/ProductDeletionRequests'));
const SystemRevenue = lazy(() => import('./shared/pages/SystemRevenue'));
const PendingPayouts = lazy(() => import('./modules/finance/pages/PendingPayouts'));
const AdminLiveMap = lazy(() => import('./modules/admin/pages/AdminLiveMap'));
const BatchSystem = lazy(() => import('./shared/pages/BatchSystem'));
const CMSManagement = lazy(() => import('./pages/dashboard/CMSManagement'));
const AboutPageManagement = lazy(() => import('./pages/dashboard/cms/AboutPageManagement'));
const AboutPageForm = lazy(() => import('./pages/dashboard/cms/AboutPageForm'));
const ContactPageManagement = lazy(() => import('./pages/dashboard/cms/ContactPageManagement'));
const TeamMemberForm = lazy(() => import('./pages/dashboard/cms/TeamMemberForm'));
const CustomerReturnsList = lazy(() => import('./modules/users/pages/CustomerReturnsList'));
const FastFoodPickupPoints = lazy(() => import('./modules/fastfood/pages/FastFoodPickupPoints'));
const ContactMessages = lazy(() => import('./shared/pages/ContactMessages'));
const MyContactMessages = lazy(() => import('./modules/users/pages/MyContactMessages'));
const BlogManagement = lazy(() => import('./pages/dashboard/cms/BlogManagement'));
const BlogForm = lazy(() => import('./pages/dashboard/cms/BlogForm'));
const BlogComments = lazy(() => import('./pages/dashboard/cms/BlogComments'));
const PublicBlog = lazy(() => import('./pages/public/Blog'));
const PublicBlogPost = lazy(() => import('./pages/public/BlogPost'));

// Delivery Agent Sub-components
const DeliveryAgentOrders = lazy(() => import('./modules/orders/pages/Orders'));
const DeliveryAgentAvailable = lazy(() => import('./shared/pages/Available'));
const DeliveryLogistics = lazy(() => import('./modules/delivery/pages/DeliveryLogistics'));

const DeliveryNotifications = lazy(() => import('./shared/pages/Notifications'));
const DeliverySupport = lazy(() => import('./shared/pages/Support'));
const DeliverySettings = lazy(() => import('./shared/pages/Settings'));
const DeliveryLiveMap = lazy(() => import('./shared/pages/LiveMap'));
const DeliveryWallet = lazy(() => import('./modules/finance/pages/Wallet'));

// Main App component with providers
const AppWithProviders = () => (
  <ErrorBoundary>
    <HelmetProvider>
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
    </HelmetProvider>
  </ErrorBoundary>
);

// Main content component with auth context
const AppContent = () => {
  const { user, loading, verificationRequired } = useAuth();
  const location = useLocation();
  const isStationUser = user?.role === 'station_manager' || user?.roles?.includes('station_manager') || user?.roles?.includes('warehouse_manager') || user?.roles?.includes('pickup_station_manager');
  const hideNavbar = ['/login', '/register', '/forgot-password', '/menu', '/station/login'].includes(location.pathname);
  const [isMarketingMode, setIsMarketingMode] = useState(localStorage.getItem('marketing_mode') === 'true');
  const [referrerName, setReferrerName] = useState(localStorage.getItem('referrerName') || '');

  // On app load, fire one quick API call; if we get 503+maintenance redirect immediately
  useEffect(() => {
    // Never redirect away from admin, maintenance, or login paths
    const adminRoles = ['admin', 'super_admin', 'superadmin'];
    const adminPaths = ['/dashboard', '/dashboard-login', '/maintenance', '/login'];
    const isAdminPath = adminPaths.some(p => window.location.pathname.startsWith(p));
    if (isAdminPath) return;
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (adminRoles.includes(u?.role) || u?.roles?.some(r => adminRoles.includes(r))) return;
      }
    } catch (_) { }

    const fetchPlatformStatus = () => {
      api.get('/platform/status').then(res => {
        if (res.data.success) {
          localStorage.setItem('maintenance_settings', JSON.stringify({
            dashboards: res.data.dashboards || {},
            sections: res.data.sections || {}
          }));
        }
      }).catch(err => {
        if (err.response?.status === 503 && err.response?.data?.maintenance) {
          const msg = err.response.data?.message;
          if (msg) sessionStorage.setItem('maintenance_message', msg);
          window.location.href = '/maintenance';
        }
      });
    };

    fetchPlatformStatus();

    // Listen for real-time maintenance updates to re-sync global state
    window.addEventListener('maintenance-settings-updated', fetchPlatformStatus);
    return () => window.removeEventListener('maintenance-settings-updated', fetchPlatformStatus);
  }, []);

  // Handle referral links and marketing mode from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    const marketingParam = params.get('marketing');

    if (marketingParam === 'true' || location.pathname.startsWith('/marketing')) {
      localStorage.setItem('marketing_mode', 'true');
      setIsMarketingMode(true);
    } else if (refCode && marketingParam !== 'true') {

      // If we have a referral code but NO marketing tag, ensure we are NOT in marketing mode
      localStorage.removeItem('marketing_mode');
      setIsMarketingMode(false);
    }

    if (refCode) {
      localStorage.setItem('referrerCode', refCode);
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
  }, [location.search]);

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
    localStorage.removeItem('referrerCode');
    localStorage.removeItem('referrerName');
    setReferrerName('');
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

  // Station accounts are restricted to station-only flows, but must be allowed to log in and verify dashboard access.
  if (isStationUser && !location.pathname.startsWith('/station') && !['/dashboard-login', '/login'].includes(location.pathname)) {
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

  let topPadding = "pt-[128px]"; // Default for home/search (Navbar + Search bar)
  if (isDetailRoute) {
    topPadding = "pt-14"; // 56px to clear Navbar (no search bar)
  } else if (isDashboardRoute) {
    topPadding = "pt-14"; // 56px to clear Navbar (no search bar)
  }
  let paddingClass = hideNavbar ? "" : `${topPadding} lg:pt-16`;
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
          <div className="min-h-screen bg-gray-50">
            {!hideNavbar && (isMarketingMode ? <MarketingNavbar /> : <Navbar />)}
            {!hideNavbar && !isMarketingMode && referrerName && (
              <div className={paddingClass}>
                <ReferrerBanner referrerName={referrerName} onClear={handleClearReferrer} />
              </div>
            )}
            <main className={!isMarketingMode && referrerName ? "" : paddingClass}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/category/:id" element={<Category />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/search" element={<Search />} />
                <Route path="/services" element={<Services />} />
                <Route path="/service/:id" element={<ServiceDetails />} />
                <Route path="/fastfood" element={<FastFood />} />
                <Route path="/fastfood/:id" element={<FastFoodDetails />} />
                <Route path="/menu" element={<ComradesMenu />} />
                <Route path="/products" element={<Products />} />

                {/* Public Footer Pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/blog" element={<PublicBlog />} />
                <Route path="/blog/:slug" element={<PublicBlogPost />} />
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
                  <ProtectedRoute requiredRole={['admin', 'super_admin', 'superadmin', 'logistics_manager', 'delivery_agent', 'finance_manager']}>
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
                  <Route path="users/delivery-agents" element={<DeliveryAgents />} />
                  <Route path="users/sellers" element={<SellerManagement />} />
                  <Route path="users/service-providers" element={<ServiceProviderManagement />} />
                  <Route path="users/customers" element={<CustomerManagement />} />
                  <Route path="users/verifications" element={<AdminIdVerification />} />
                  <Route path="users/job-openings" element={<JobOpeningManagement />} />

                  {/* Comprehensive User Management */}
                  <Route path="user-management" element={<UserManagement />} />
                  <Route path="user-management/:action" element={<UserManagement />} />
                  <Route path="product-management" element={<ProductManagement />} />
                  <Route path="on-behalf-creation" element={<AdminOnBehalfCreation />} />
                  <Route path="products/recycle-bin" element={<RecycleBin />} />
                  <Route path="products" element={<ProductHubFull />} />
                  <Route path="products/:view" element={<ProductHubFull />} />
                  <Route path="products/:view/:id" element={<ProductHubFull />} />
                  <Route path="products/list" element={<ProductList />} />
                  <Route path="products/smart-create" element={<SmartProductForm />} />
                  <Route path="products/add" element={<ProductForm />} />
                  <Route path="products/:id/edit" element={<ProductForm mode="edit" />} />
                  <Route path="products/pending" element={<ProductList status="pending" />} />
                  <Route path="products/rejected" element={<ProductList status="rejected" />} />
                  <Route path="products/comrades" element={<ComradesProducts />} />
                  <Route path="products/comrades/new" element={<ComradesProductForm strictMode={true} taxonomyType="comrades" />} />
                  <Route path="products/comrades/pending" element={<ComradesProducts status="pending" />} />
                  <Route path="products/comrades/rejected" element={<ComradesProducts status="rejected" />} />
                  <Route path="products/comrades/:id/edit" element={<ComradesProductForm mode="edit" strictMode={true} taxonomyType="comrades" />} />
                  <Route path="products/comrades/list/:id" element={<ComradesProductList />} />
                  <Route path="products/product-listing" element={<ProductListingView />} />
                  <Route path="products/analytics" element={<ProductAnalytics />} />
                  <Route path="products/id-demo" element={<ProductIDDemo />} />

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
                  <Route path="fastfood/form-test" element={<FastFoodFormTest />} />
                  <Route path="delivery/warehouses" element={<WarehouseManagement />} />
                  <Route path="delivery/pickup-stations" element={<PickupStationManagement />} />
                  <Route path="delivery/settings" element={<DeliveryFeeSettings />} />
                  <Route path="delivery/metrics" element={<AdvancedReports />} />
                  <Route path="delivery/logistics-invoices" element={<LogisticsInvoices />} />
                  <Route path="finance/dashboard" element={<FinanceManager />} />
                  <Route path="finance/commissions" element={<CommissionManagement />} />
                  <Route path="finance/referrals" element={<ReferralAnalytics />} />
                  <Route path="finance/reports" element={<AdvancedReports />} />
                  <Route path="finance/revenue" element={<SystemRevenue />} />
                  <Route path="finance/payouts" element={<PendingPayouts />} />
                  <Route path="finance/learning" element={<LearningResources />} />
                  <Route path="marketing/hero-promotions" element={<AdminHeroPromotions />} />
                  <Route path="marketing/hero-promotions/create" element={<AdminCreateHeroPromotion />} />
                  <Route path="marketing/video-banners" element={<AdminVideoBanners />} />
                  <Route path="marketing/video-banners/create" element={<AdminCreateVideoBanner />} />
                  <Route path="marketing/video-banners/edit/:id" element={<AdminCreateVideoBanner />} />
                  <Route path="marketing/fastfood-promotions" element={<AdminFastFoodPromotions />} />
                  <Route path="marketing/promo-codes" element={<PromoCodes />} />
                  <Route path="marketing/thank-you" element={<MarketingNotifications />} />
                  <Route path="marketing/pricing-promotions" element={<PricingPromotions />} />
                  <Route path="direct-orders" element={<DirectOrders />} />
                  <Route path="users/sellers/earning-verification" element={<RoleEarningVerification userType="seller" />} />
                  <Route path="users/marketers/earning-verification" element={<RoleEarningVerification userType="marketer" />} />
                  <Route path="users/delivery-agents/earning-verification" element={<DeliveryEarningVerification />} />
                  <Route path="delivery/earning-verification" element={<DeliveryEarningVerification />} />
                  <Route path="admin-tools" element={<AdminTools />} />
                  <Route path="admin/config" element={<AdminConfig />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="test/dynamic-forms" element={<TestDynamicForms />} />
                  <Route path="settings/platform" element={<SystemSettings />} />
                  <Route path="settings/app-content" element={<AppContentManager />} />
                  <Route path="settings/security" element={<SecuritySettings />} />
                  <Route path="products/deletion-requests" element={<ProductDeletionRequests />} />
                  <Route path="support" element={<SupportTickets />} />
                  <Route path="contact-messages" element={<ContactMessages />} />
                  <Route path="support/service" element={<CustomerService />} />
                  <Route path="delivery/live-map" element={<AdminLiveMap />} />
                  <Route path="delivery/auditing" element={<DeliveryAuditing />} />
                  <Route path="other-dashboards" element={<OtherDashboards />} />
                  <Route path="cms" element={<CMSManagement />} />
                  <Route path="cms/about" element={<AboutPageManagement />} />
                  <Route path="cms/about/form" element={<AboutPageForm />} />
                  <Route path="cms/about/team/new" element={<TeamMemberForm />} />
                  <Route path="cms/about/team/:memberId" element={<TeamMemberForm />} />
                  <Route path="cms/contact" element={<ContactPageManagement />} />
                  <Route path="cms/blog" element={<BlogManagement />} />
                  <Route path="cms/blog/new" element={<BlogForm />} />
                  <Route path="cms/blog/:id/edit" element={<BlogForm />} />
                  <Route path="cms/blog/:slug/comments" element={<BlogComments />} />
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
                  <Route path="products/add" element={<ProductForm />} />
                  <Route path="products/:id/edit" element={<ProductForm mode="edit" />} />
                  <Route path="products/view/:id" element={<SellerProductView />} />
                  <Route path="orders" element={<SellerOrders />} />
                  <Route path="earnings" element={<SellerEarnings />} />
                  <Route path="analytics" element={<SellerAnalytics />} />
                  <Route path="wallet" element={<SellerWallet />} />
                  <Route path="reports" element={<SellerReports />} />
                  <Route path="recycle-bin" element={<RecycleBin />} />
                  <Route path="promotions" element={<SellerHeroPromotions />} />
                  <Route path="fastfood-promotions" element={<SellerFastFoodPromotions />} />
                  <Route path="business-location" element={<SellerBusinessLocation />} />
                  <Route path="inventory" element={<InventoryManagement onBack={() => window.history.back()} />} />
                  <Route path="subscriptions" element={<SellerSubscriptions />} />
                  <Route path="help" element={<SellerHelp />} />

                  {/* Fast Food Management Routes for Sellers */}
                  <Route path="fast-food" element={<FastFoodManagement />} />
                  <Route path="fast-food/hero-settings" element={<HeroSettingsConfig />} />
                  <Route path="fast-food/new" element={<FastFoodForm isSellerContext={true} />} />
                  <Route path="fast-food/edit/:id" element={<FastFoodForm mode="edit" isSellerContext={true} />} />
                  <Route path="fast-food/view/:id" element={<SellerFastFoodView />} />
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

                {/* Station Manager Dashboard */}
                <Route path="/station" element={
                  <ProtectedRoute requiredRole={['station_manager', 'warehouse_manager', 'pickup_station_manager']}>
                    <StationManagerDashboard />
                  </ProtectedRoute>
                } />

                {/* Customer Routes */}
                <Route path="/customer/*" element={<Customer />}>
                  <Route index element={<CustomerOverview />} />
                  <Route path="inquiries" element={<MyInquiries />} />
                  <Route path="messages" element={<MyContactMessages />} />
                  <Route path="orders" element={<CustomerOrders />} />
                  <Route path="orders/:orderId/track" element={<OrderTracking />} />
                  <Route path="orders/:orderId/cancel" element={<CancelOrder />} />
                  <Route path="orders/:orderId/update-address" element={<UpdateOrderAddress />} />
                  <Route path="orders/:orderId/return" element={<ReturnRequestPage />} />
                  <Route path="returns" element={<CustomerReturnsList />} />
                  <Route path="wishlist" element={<Wishlist />} />
                  <Route path="wallet" element={<CustomerWallet />} />
                  <Route path="meal-plans" element={<CustomerMealPlans />} />
                  <Route path="meal-plans/create" element={<CreatePersonalMealPlan />} />
                  <Route path="meal-plans/edit/:id" element={<EditPersonalMealPlan />} />
                  <Route path="subscriptions" element={<CustomerSubscriptions />} />
                  <Route path="subscription-benefits" element={<SubscriptionBenefits />} />
                  <Route path="address" element={<CustomerAddresses />} />
                  <Route path="settings" element={<AccountSettings />} />
                  <Route path="account-page" element={<AccountPage />} />
                  <Route path="account-verification" element={<AccountVerification />} />
                  <Route path="id-upload" element={<NationalIdUpload />} />
                  <Route path="applications" element={<MyApplications />} />
                  <Route path="work-with-us" element={<WorkWithUs />} />
                  <Route path="apply/:role" element={<RoleApplicationForm />} />
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
                  <Route index element={<Navigate to="available" replace />} />
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
      {(isMarketingMode || ['/about', '/contact'].includes(location.pathname)) && <MarketingBottomNav />}

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
