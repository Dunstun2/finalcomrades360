const { sequelize, Sequelize } = require('../database/database');

// Initialize all models
const User = require('../modules/users/models/User')(sequelize, Sequelize.DataTypes);
const Product = require('../modules/products/models/Product')(sequelize, Sequelize.DataTypes);
const Category = require('../modules/products/models/Category')(sequelize, Sequelize.DataTypes);
const Subcategory = require('../modules/products/models/Subcategory')(sequelize, Sequelize.DataTypes);
const RoleApplication = require('../modules/platform/models/RoleApplication')(sequelize, Sequelize.DataTypes);
const Order = require('../modules/orders/models/Order')(sequelize, Sequelize.DataTypes);
const OrderItem = require('../modules/orders/models/OrderItem')(sequelize, Sequelize.DataTypes);
const Cart = require('../modules/orders/models/Cart')(sequelize, Sequelize.DataTypes);
const CartItem = require('../modules/orders/models/CartItem')(sequelize, Sequelize.DataTypes);
const Notification = require('../modules/users/models/Notification')(sequelize, Sequelize.DataTypes);
const Commission = require('../modules/finance/models/Commission')(sequelize, Sequelize.DataTypes);
const Referral = require('../modules/marketing/models/Referral')(sequelize, Sequelize.DataTypes);
const ReferralTracking = require('../modules/marketing/models/ReferralTracking')(sequelize, Sequelize.DataTypes);
const MarketingAnalytics = require('../modules/marketing/models/MarketingAnalytics')(sequelize, Sequelize.DataTypes);
const DeliveryAgentProfile = require('../modules/delivery/models/DeliveryAgentProfile')(sequelize, Sequelize.DataTypes);
const HeroPromotion = require('../modules/marketing/models/HeroPromotion')(sequelize, Sequelize.DataTypes);
const PasswordReset = require('../modules/auth/models/PasswordReset')(sequelize, Sequelize.DataTypes);
const Wishlist = require('../modules/users/models/Wishlist')(sequelize, Sequelize.DataTypes);
const Payment = require('../modules/finance/models/Payment')(sequelize, Sequelize.DataTypes);
const ProductVariant = require('../modules/products/models/ProductVariant')(sequelize, Sequelize.DataTypes);
const Transaction = require('../modules/finance/models/Transaction')(sequelize, Sequelize.DataTypes);
const UserRole = require('../modules/users/models/UserRole')(sequelize, Sequelize.DataTypes);
const Wallet = require('../modules/finance/models/Wallet')(sequelize, Sequelize.DataTypes);
const SocialMediaAccount = require('../modules/users/models/SocialMediaAccount')(sequelize, Sequelize.DataTypes);
const Service = require('../modules/services/models/Service')(sequelize, Sequelize.DataTypes);
const ServiceImage = require('../modules/services/models/ServiceImage')(sequelize, Sequelize.DataTypes);
const ProductDeletionRequest = require('../modules/products/models/ProductDeletionRequest')(sequelize, Sequelize.DataTypes);


const ProductInquiry = require('../modules/products/models/ProductInquiry')(sequelize, Sequelize.DataTypes);
const ProductInquiryReply = require('../modules/products/models/ProductInquiryReply')(sequelize, Sequelize.DataTypes);
const ProductView = require('../modules/products/models/ProductView')(sequelize, Sequelize.DataTypes);
const FastFood = require('../modules/fastfood/models/FastFood')(sequelize, Sequelize.DataTypes);
const PlatformConfig = require('../modules/platform/models/PlatformConfig')(sequelize, Sequelize.DataTypes);
const PlatformWallet = require('../modules/platform/models/PlatformWallet')(sequelize, Sequelize.DataTypes);
const PlatformTransaction = require('../modules/platform/models/PlatformTransaction')(sequelize, Sequelize.DataTypes);
const LoginHistory = require('../modules/auth/models/LoginHistory')(sequelize, Sequelize.DataTypes);
const Role = require('../modules/users/models/Role')(sequelize, Sequelize.DataTypes);
const DeliveryMessage = require('../modules/delivery/models/DeliveryMessage')(sequelize, Sequelize.DataTypes);
const JobOpening = require('../modules/platform/models/JobOpening')(sequelize, Sequelize.DataTypes);
const DeliveryTask = require('../modules/delivery/models/DeliveryTask')(sequelize, Sequelize.DataTypes);
const DeliveryCharge = require('../modules/delivery/models/DeliveryCharge')(sequelize, Sequelize.DataTypes);
const Warehouse = require('../modules/delivery/models/Warehouse')(sequelize, Sequelize.DataTypes);
const PickupStation = require('../modules/delivery/models/PickupStation')(sequelize, Sequelize.DataTypes);
const FastFoodReview = require('../modules/fastfood/models/FastFoodReview')(sequelize, Sequelize.DataTypes);
const ProductReview = require('../modules/products/models/ProductReview')(sequelize, Sequelize.DataTypes);
const StockReservation = require('../modules/products/models/StockReservation')(sequelize, Sequelize.DataTypes);
const StockAuditLog = require('../modules/products/models/StockAuditLog')(sequelize, Sequelize.DataTypes);
const WarehouseStock = require('../modules/delivery/models/WarehouseStock')(sequelize, Sequelize.DataTypes);
const PaymentRetryQueue = require('../modules/finance/models/PaymentRetryQueue')(sequelize, Sequelize.DataTypes);
const PaymentReconciliation = require('../modules/finance/models/PaymentReconciliation')(sequelize, Sequelize.DataTypes);
const Refund = require('../modules/finance/models/Refund')(sequelize, Sequelize.DataTypes);
const PaymentDispute = require('../modules/finance/models/PaymentDispute')(sequelize, Sequelize.DataTypes);
const ReturnRequest = require('../modules/products/models/ReturnRequest')(sequelize, Sequelize.DataTypes);
const Batch = require('../modules/products/models/Batch')(sequelize, Sequelize.DataTypes);
const FastFoodPickupPoint = require('../modules/fastfood/models/FastFoodPickupPoint')(sequelize, Sequelize.DataTypes);
const HandoverCode = require('../modules/orders/models/HandoverCode')(sequelize, Sequelize.DataTypes);
const Otp = require('../modules/auth/models/Otp')(sequelize, Sequelize.DataTypes);
const ContactMessage = require('../modules/supportChat/models/ContactMessage')(sequelize, Sequelize.DataTypes);
const ContactReply = require('../modules/supportChat/models/ContactReply')(sequelize, Sequelize.DataTypes);
const SupportMessage = require('../modules/supportChat/models/SupportMessage')(sequelize, Sequelize.DataTypes);
const SiteVisit = require('../modules/platform/models/SiteVisit')(sequelize, Sequelize.DataTypes);
const AdminAuditLog = require('../modules/admin/models/AdminAuditLog')(sequelize, Sequelize.DataTypes);
const BlockedIP = require('../modules/users/models/BlockedIP')(sequelize, Sequelize.DataTypes);
const VerifiedContact = require('../modules/users/models/VerifiedContact')(sequelize, Sequelize.DataTypes);
const KnownLocation = require('../modules/delivery/models/KnownLocation')(sequelize, Sequelize.DataTypes);
const PromoCode = require('../modules/marketing/models/PromoCode')(sequelize, Sequelize.DataTypes);
const AboutPage = require('../models/AboutPage')(sequelize, Sequelize.DataTypes);
const TeamMember = require('../models/TeamMember')(sequelize, Sequelize.DataTypes);
const ContactPage = require('../models/ContactPage')(sequelize, Sequelize.DataTypes);
const BlogPost = require('../models/BlogPost')(sequelize, Sequelize.DataTypes);
const BlogComment = require('../models/BlogComment')(sequelize, Sequelize.DataTypes);
const BlogLike = require('../models/BlogLike')(sequelize, Sequelize.DataTypes);
const BlogRating = require('../models/BlogRating')(sequelize, Sequelize.DataTypes);

// Subscription Module Models
const Plan = require('../modules/subscriptions/models/Plan')(sequelize, Sequelize.DataTypes);
const Feature = require('../modules/subscriptions/models/Feature')(sequelize, Sequelize.DataTypes);
const BenefitPackage = require('../modules/subscriptions/models/BenefitPackage')(sequelize, Sequelize.DataTypes);
const PackageBenefit = require('../modules/subscriptions/models/PackageBenefit')(sequelize, Sequelize.DataTypes);
const PlanBenefit = require('../modules/subscriptions/models/PlanBenefit')(sequelize, Sequelize.DataTypes);
const Subscription = require('../modules/subscriptions/models/Subscription')(sequelize, Sequelize.DataTypes);
const SubscriptionUsage = require('../modules/subscriptions/models/SubscriptionUsage')(sequelize, Sequelize.DataTypes);
const MealSchedule = require('../modules/subscriptions/models/MealSchedule')(sequelize, Sequelize.DataTypes);
const MealOccurrence = require('../modules/subscriptions/models/MealOccurrence')(sequelize, Sequelize.DataTypes);
const SubscriptionInvoice = require('../modules/subscriptions/models/SubscriptionInvoice')(sequelize, Sequelize.DataTypes);
const SubscriptionEvent = require('../modules/subscriptions/models/SubscriptionEvent')(sequelize, Sequelize.DataTypes);

const models = {
  User,
  PromoCode,
  AboutPage,
  TeamMember,
  ContactPage,
  BlogPost,
  BlogComment,
  BlogLike,
  BlogRating,
  AdminAuditLog,
  Product,
  Category,
  Subcategory,
  ProductDeletionRequest,


  ProductInquiry,
  RoleApplication,
  Order,
  OrderItem,
  Cart,
  CartItem,
  Notification,
  Commission,
  Referral,
  ReferralTracking,
  MarketingAnalytics,
  DeliveryAgentProfile,
  HeroPromotion,
  PasswordReset,
  Wishlist,
  Payment,
  ProductVariant,
  ProductView,
  Transaction,
  UserRole,
  Wallet,
  SocialMediaAccount,
  Service,
  ServiceImage,
  FastFood,
  PlatformConfig,
  PlatformWallet,
  PlatformTransaction,
  LoginHistory,
  Role,
  JobOpening,
  DeliveryTask,
  DeliveryCharge,
  Warehouse,
  PickupStation,
  DeliveryMessage,
  FastFoodReview,
  ProductReview,
  StockReservation,
  StockAuditLog,
  WarehouseStock,
  PaymentRetryQueue,
  PaymentReconciliation,
  Refund,
  PaymentDispute,
  ReturnRequest,
  Batch,
  FastFoodPickupPoint,
  HandoverCode,
  Otp,
  ContactMessage,
  ContactReply,
  ProductInquiryReply,
  SupportMessage,
  SiteVisit,
  BlockedIP,
  VerifiedContact,
  KnownLocation,
  BenefitPackage,
  PackageBenefit,
  Plan,
  Feature,
  PlanBenefit,
  Subscription,
  SubscriptionUsage,
  MealSchedule,
  MealOccurrence,
  SubscriptionInvoice,
  SubscriptionEvent
};

// Set up associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

// Re-export all models for easy access
module.exports = {
  User,
  PromoCode,
  AboutPage,
  TeamMember,
  ContactPage,
  BlogPost,
  BlogComment,
  BlogLike,
  BlogRating,
  Product,
  Category,
  Subcategory,
  ProductDeletionRequest,


  ProductInquiry,
  ProductInquiryReply,
  RoleApplication,
  Order,
  OrderItem,
  Cart,
  CartItem,
  Notification,
  Commission,
  Referral,
  ReferralTracking,
  MarketingAnalytics,
  DeliveryAgentProfile,
  HeroPromotion,
  PasswordReset,
  Wishlist,
  Payment,
  ProductVariant,
  ProductView,
  Transaction,
  UserRole,
  Wallet,
  SocialMediaAccount,
  Service,
  ServiceImage,
  FastFood,
  PlatformConfig,
  PlatformWallet,
  PlatformTransaction,
  LoginHistory,
  Role,
  JobOpening,
  DeliveryTask,
  DeliveryCharge,
  Warehouse,
  PickupStation,
  DeliveryMessage,
  FastFoodReview,
  ProductReview,
  StockReservation,
  StockAuditLog,
  WarehouseStock,
  PaymentRetryQueue,
  PaymentReconciliation,
  Refund,
  PaymentDispute,
  ReturnRequest,
  Batch,
  FastFoodPickupPoint,
  HandoverCode,
  Otp,
  ContactMessage,
  ContactReply,
  SupportMessage,
  SiteVisit,
  AdminAuditLog,
  BlockedIP,
  VerifiedContact,
  BenefitPackage,
  PackageBenefit,
  Plan,
  Feature,
  PlanBenefit,
  Subscription,
  SubscriptionUsage,
  MealSchedule,
  MealOccurrence,
  SubscriptionInvoice,
  SubscriptionEvent,
  sequelize,
  Sequelize,
  Op: Sequelize.Op
};
