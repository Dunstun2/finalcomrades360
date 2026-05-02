export const manuals = {
  admin: {
    title: "🛡️ Admin Command Center Manual",
    sections: [
      {
        title: "User & Role Management",
        content: "As an Admin, you have total control over user roles. Use the 'Applications' tab to review requests for Seller, Marketer, or Delivery Agent roles. You can verify IDs, approve, or reject applications with feedback."
      },
      {
        title: "Audit Logs & Security",
        content: "Every sensitive action is logged. Access 'Audit Logs' to see who changed an order status, merged accounts, or adjusted a wallet balance. Use 'User Impersonation' only for troubleshooting customer issues."
      },
      {
        title: "Order & Logistics Oversight",
        content: "You can override any order status if a delivery agent or seller makes a mistake. Use the 'Live Map' to track active deliveries in real-time and ensure assignments are being handled efficiently."
      },
      {
        title: "Financial Control",
        content: "Manage the platform's health via the 'Revenue' and 'Payouts' tabs. You are responsible for approving withdrawal requests from Sellers and Marketers after verifying their transaction history."
      }
    ]
  },
  seller: {
    title: "🚀 Seller Success Guide",
    sections: [
      {
        title: "Product Listing",
        content: "Ensure your products have high-quality images and clear descriptions. Products must be approved by an Admin before they appear on the storefront."
      },
      {
        title: "Order Fulfillment",
        content: "When an order is placed, prepare it for pickup immediately. A delivery agent will be notified to collect it from your registered business location."
      },
      {
        title: "Wallet & Earnings",
        content: "Your earnings are credited to your wallet once the customer confirms receipt. You can withdraw to M-Pesa at any time once the minimum threshold is met."
      }
    ]
  },
  marketer: {
    title: "📈 Marketer's Growth Manual",
    sections: [
      {
        title: "Trackable Links",
        content: "Generate deep links for any product or service. Use the 'Share Poster' feature to get a professional image with a QR code for your WhatsApp status."
      },
      {
        title: "Marketing Mode",
        content: "Use 'New Order' to shop for clients directly. Enter their details at checkout, and the system will attribute the sale to you automatically."
      },
      {
        title: "Customer Base",
        content: "Register customers using your referral code. You earn a secondary commission (passive income) on every future purchase they make, forever."
      }
    ]
  },
  delivery: {
    title: "🚚 Delivery Agent Manual",
    sections: [
      {
        title: "Availability",
        content: "Set your working hours and active status in the 'Account' tab. You will only receive auto-assignments when you are marked as 'Active'."
      },
      {
        title: "The Delivery Flow",
        content: "1. Accept assignment. 2. Pick up from Seller. 3. Navigate to Customer using the integrated map. 4. Complete delivery and collect payment if it's COD."
      },
      {
        title: "Earnings",
        content: "Delivery fees are credited to your wallet instantly upon completion. Track your daily targets and withdrawal history in the 'Wallet' tab."
      }
    ]
  },
  service_provider: {
    title: "🛠️ Service Provider Manual",
    sections: [
      {
        title: "Service Listings",
        content: "List your services (Laundry, Tutoring, etc.) with clear pricing models. You can set fixed prices or 'starting from' rates."
      },
      {
        title: "Managing Bookings",
        content: "Track new service requests in your dashboard. Communicate with customers directly to finalize timing and requirements."
      }
    ]
  },
  customer: {
    title: "👤 User Guide",
    sections: [
      {
        title: "Account Verification",
        content: "Upload your ID to unlock premium features like 'Pay on Delivery' and the ability to apply for professional roles."
      },
      {
        title: "Order Tracking",
        content: "Monitor your orders in real-time from the 'My Orders' section. You'll receive notifications at every stage of the delivery."
      },
      {
        title: "Work With Us",
        content: "Want to earn on campus? Use the 'Work With Us' tab to apply for Marketer, Seller, or Delivery roles."
      }
    ]
  },
  station: {
    title: "🏢 Station Manager Manual",
    sections: [
      {
        title: "Inventory Receiving",
        content: "When packages arrive at your station/warehouse, scan or mark them as 'Received'. This notifies the customer that their item is ready."
      },
      {
        title: "Collection & Dispatch",
        content: "Verify customer IDs before handing over packages. Mark as 'Collected' in the dashboard to finalize the order lifecycle."
      }
    ]
  }
};
