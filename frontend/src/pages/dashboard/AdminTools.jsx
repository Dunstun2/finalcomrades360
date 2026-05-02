import React, { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUserCheck, FaUserPlus, FaKey, FaUserSecret, FaCodeBranch, FaWallet,
  FaClipboardList, FaExchangeAlt, FaTruck, FaMoneyCheck, FaMoneyBillWave,
  FaSearch, FaFileAlt, FaBoxes, FaStore, FaToggleOn, FaShieldAlt,
  FaBan, FaBullhorn, FaRedo, FaRobot, FaEdit, FaBell, FaUsers,
  FaTools, FaDatabase, FaWifi, FaTrash, FaServer, FaLock, FaEye,
  FaChartBar, FaFileExcel, FaHeartbeat, FaTimes, FaExternalLinkAlt, FaChevronRight,
  FaCopy, FaEnvelopeOpenText, FaChartLine, FaCubes
} from 'react-icons/fa';
import AdminForceVerifyModal from '../UserManagementComponents/AdminForceVerifyModal';
import AdminDirectCreateUserModal from '../UserManagementComponents/AdminDirectCreateUserModal';
import AdminForceResetPasswordModal from '../UserManagementComponents/AdminForceResetPasswordModal';
import AdminMergeAccountsModal from '../UserManagementComponents/AdminMergeAccountsModal';
import AdminImpersonateUserModal from '../UserManagementComponents/AdminImpersonateUserModal';
import AdminWalletAdjustModal from '../UserManagementComponents/AdminWalletAdjustModal';
import AdminUserActivityModal from '../UserManagementComponents/AdminUserActivityModal';
import AdminForceOrderStatusModal from './OrderManagementComponents/AdminForceOrderStatusModal';
import AdminReassignAgentModal from './OrderManagementComponents/AdminReassignAgentModal';
import AdminIssueRefundModal from './OrderManagementComponents/AdminIssueRefundModal';
import AdminForceShopStatusModal from './OrderManagementComponents/AdminForceShopStatusModal';
import AdminBulkToggleModal from './OrderManagementComponents/AdminBulkToggleModal';
import AdminCloneOrderModal from './OrderManagementComponents/AdminCloneOrderModal';
import AdminResendNotificationModal from './OrderManagementComponents/AdminResendNotificationModal';
import AdminBroadcastModal from './OrderManagementComponents/AdminBroadcastModal';
import AdminDBCleanupModal from './OrderManagementComponents/AdminDBCleanupModal';
import AdminTxSearchModal from './OrderManagementComponents/AdminTxSearchModal';
import AdminIPBlocklistModal from './OrderManagementComponents/AdminIPBlocklistModal';
import AdminSessionManagerModal from './OrderManagementComponents/AdminSessionManagerModal';
import AdminAdvancedAnalyticsModal from './OrderManagementComponents/AdminAdvancedAnalyticsModal';
import AdminTemplateEditorModal from './OrderManagementComponents/AdminTemplateEditorModal';
import AdminCustomOTPModal from './OrderManagementComponents/AdminCustomOTPModal';
import AdminManualConfirmPaymentModal from './OrderManagementComponents/AdminManualConfirmPaymentModal';

// ── TOOL DEFINITIONS ───────────────────────────────────────────────────────────
// status: 'live' = existing page/feature | 'modal' = opens a modal | 'coming' = not yet built
const TOOL_CATEGORIES = [
  {
    id: 'user',
    label: 'User Management',
    icon: <FaUsers />,
    color: 'indigo',
    tools: [
      {
        id: 'force-verify', label: 'Force Verify User', status: 'modal', modal: 'forceVerify',
        icon: <FaUserCheck />, desc: 'Manually verify a user\'s email or phone number.',
      },
      {
        id: 'create-user', label: 'Create User Account', status: 'modal', modal: 'createUser',
        icon: <FaUserPlus />, desc: 'Directly create a new user account and send credentials.',
      },
      {
        id: 'user-management', label: 'All Users', status: 'live', path: '/dashboard/user-management',
        icon: <FaUsers />, desc: 'Browse, edit, freeze, and manage all user accounts.',
      },
      {
        id: 'id-verifications', label: 'ID Verifications', status: 'live', path: '/dashboard/users/verifications',
        icon: <FaShieldAlt />, desc: 'Review and approve national ID verification requests.',
      },
      {
        id: 'role-apps', label: 'Role Applications', status: 'live', path: '/dashboard/users/role-applications',
        icon: <FaFileAlt />, desc: 'Approve or reject seller, delivery, and other role applications.',
      },
      {
        id: 'force-reset-pw', label: 'Force Reset Password', status: 'modal', modal: 'forceResetPw',
        icon: <FaKey />, desc: 'Generate a temporary password and send it to the user via email/WhatsApp.',
      },
      {
        id: 'impersonate', label: 'Impersonate User', status: 'modal', modal: 'impersonate',
        icon: <FaUserSecret />, desc: 'Log in as any user to see their exact view and diagnose issues.',
      },
      {
        id: 'assume-role', label: 'Assume Specialized Role', status: 'live', path: '/dashboard/other-dashboards',
        icon: <FaCubes />, desc: 'Access Seller, Marketer, or Service Provider dashboards with admin bypass active.',
      },
      {
        id: 'merge-accounts', label: 'Merge Duplicate Accounts', status: 'modal', modal: 'mergeAccounts',
        icon: <FaCodeBranch />, desc: 'Combine two accounts for the same person — transfer orders, wallet, roles.',
      },
      {
        id: 'wallet-adjust', label: 'Manual Wallet Adjustment', status: 'modal', modal: 'walletAdjust',
        icon: <FaWallet />, desc: 'Credit or debit a user\'s wallet balance with a reason log.',
      },
      {
        id: 'activity-log', label: 'Account Activity Log', status: 'modal', modal: 'userActivity',
        icon: <FaClipboardList />, desc: 'Full audit trail of logins, orders, and profile changes per user.',
      },
    ],
  },
  {
    id: 'order',
    label: 'Order Management',
    icon: <FaBoxes />,
    color: 'amber',
    tools: [
      {
        id: 'all-orders', label: 'All Orders', status: 'live', path: '/dashboard/orders',
        icon: <FaBoxes />, desc: 'View and manage all platform orders.',
      },
      {
        id: 'direct-orders', label: 'Direct Orders', status: 'live', path: '/dashboard/direct-orders',
        icon: <FaStore />, desc: 'FastFood and direct placement orders.',
      },
      {
        id: 'returns', label: 'Return Requests', status: 'live', path: '/dashboard/orders/returns',
        icon: <FaRedo />, desc: 'Manage order return and refund requests.',
      },
      {
        id: 'force-status', label: 'Force Order Status', status: 'modal', modal: 'forceOrderStatus',
        icon: <FaExchangeAlt />, desc: 'Manually move an order to any status (e.g., stuck in processing).',
      },
      {
        id: 'reassign-agent', label: 'Reassign Delivery Agent', status: 'modal', modal: 'reassignAgent',
        icon: <FaTruck />, desc: 'Switch the delivery agent on a live order if one drops out.',
      },
      {
        id: 'issue-refund', label: 'Issue Refund', status: 'modal', modal: 'issueRefund',
        icon: <FaMoneyCheck />, desc: 'Trigger a manual refund to wallet or M-Pesa for any order.',
      },
      {
        id: 'clone-order', label: 'Clone / Re-create Order', status: 'modal', modal: 'cloneOrder',
        icon: <FaCopy />, desc: 'Quickly duplicate an existing order (e.g., for reprocessing).',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Payments & Finance',
    icon: <FaMoneyBillWave />,
    color: 'green',
    tools: [
      {
        id: 'payouts', label: 'Earning Verifications', status: 'live', path: '/dashboard/finance/payouts?tab=audit',
        icon: <FaMoneyBillWave />, desc: 'Verify and move user earnings to withdrawable balances.',
      },
      {
        id: 'withdrawals', label: 'Withdrawal Disbursements', status: 'live', path: '/dashboard/finance/payouts?tab=payouts',
        icon: <FaMoneyCheck />, desc: 'Process actual cash release for pending withdrawal requests.',
      },
      {
        id: 'revenue', label: 'System Revenue', status: 'live', path: '/dashboard/finance/revenue',
        icon: <FaChartBar />, desc: 'View platform GMV, commissions, and revenue breakdowns.',
      },
      {
        id: 'commissions', label: 'Commissions', status: 'live', path: '/dashboard/finance/commissions',
        icon: <FaMoneyBillWave />, desc: 'Manage seller and delivery commission settings.',
      },
      {
        id: 'manual-payment', label: 'Manual Payment Confirmation', status: 'modal', modal: 'manualPayment',
        icon: <FaMoneyCheck />, desc: 'Mark a payment as paid when M-Pesa STK push fails but money was received.',
      },
      {
        id: 'tx-search', label: 'Transaction Search', status: 'modal', modal: 'txSearch',
        icon: <FaSearch />, desc: 'Search all M-Pesa transactions by phone, amount, date, or reference.',
      },
      {
        id: 'commission-override', label: 'Commission Override', status: 'coming',
        icon: <FaEdit />, desc: 'Manually set or adjust commission on a specific order.',
      },
    ],
  },
  {
    id: 'product',
    label: 'Seller & Product Tools',
    icon: <FaStore />,
    color: 'orange',
    tools: [
      {
        id: 'product-dir', label: 'Product Directory', status: 'live', path: '/dashboard/products',
        icon: <FaBoxes />, desc: 'Browse, edit, suspend, and manage all products.',
      },
      {
        id: 'product-mgmt', label: 'Product Management', status: 'live', path: '/dashboard/product-management',
        icon: <FaTools />, desc: 'Overview dashboard for all product management tasks.',
      },
      {
        id: 'on-behalf', label: 'On-Behalf Creation', status: 'live', path: '/dashboard/on-behalf-creation',
        icon: <FaUserPlus />, desc: 'Create products on behalf of a seller.',
      },
      {
        id: 'deletion-reqs', label: 'Deletion Requests', status: 'live', path: '/dashboard/products/deletion-requests',
        icon: <FaTrash />, desc: 'Process seller product deletion requests.',
      },
      {
        id: 'bulk-toggle', label: 'Bulk Product Toggle', status: 'modal', modal: 'bulkToggle',
        icon: <FaToggleOn />, desc: 'Enable or disable multiple products at once (e.g., suspended seller).',
      },
      {
        id: 'force-shop', label: 'Force Shop Open/Closed', status: 'modal', modal: 'forceShop',
        icon: <FaStore />, desc: 'Override a seller\'s schedule for emergencies.',
      },
      {
        id: 'transfer-seller', label: 'Transfer Seller Account', status: 'coming',
        icon: <FaExchangeAlt />, desc: 'Move a shop to a new owner account.',
      },
    ],
  },
  {
    id: 'comms',
    label: 'Communication & Notifications',
    icon: <FaBullhorn />,
    color: 'purple',
    tools: [
      {
        id: 'marketing-notifs', label: 'Marketing Notifications', status: 'live', path: '/dashboard/marketing/thank-you',
        icon: <FaBell />, desc: 'Send daily thank-you and marketing messages to users.',
      },
      {
        id: 'broadcast', label: 'Broadcast Message', status: 'modal', modal: 'broadcast',
        icon: <FaBullhorn />, desc: 'Send email/SMS/WhatsApp to a filtered group (all sellers, all customers, etc.).',
      },
      {
        id: 'resend-notification', label: 'Resend Order Notification', status: 'modal', modal: 'resendNotif',
        icon: <FaRedo />, desc: 'Re-send any failed notification: order confirmation, OTP, verification.',
      },
      {
        id: 'custom-otp', label: 'Custom OTP Generator', status: 'modal', modal: 'customOtp',
        icon: <FaLock />, desc: 'Manually generate and send a one-time code to any user.',
      },
      {
        id: 'template-editor', label: 'Notification Template Editor', status: 'modal', modal: 'templateEditor',
        icon: <FaEnvelopeOpenText />, desc: 'Edit email/SMS templates directly in the dashboard.',
      },
    ],
  },
  {
    id: 'security',
    label: 'Security & System',
    icon: <FaShieldAlt />,
    color: 'red',
    tools: [
      {
        id: 'security-settings', label: 'Security Settings', status: 'live', path: '/dashboard/settings/security',
        icon: <FaShieldAlt />, desc: 'Platform-wide security configuration and access rules.',
      },
      {
        id: 'session-manager', label: 'Session Manager', status: 'modal', modal: 'sessionManager',
        icon: <FaLock />, desc: 'View active sessions and force-logout any user or device.',
      },
      {
        id: 'ip-blocklist', label: 'IP Blocklist', status: 'modal', modal: 'ipBlocklist',
        icon: <FaBan />, desc: 'Block an IP address for fraud, spam, or abuse.',
      },
      {
        id: 'audit-log', label: 'Audit Log Viewer', status: 'live', path: '/dashboard/admin-tools/audit-log',
        icon: <FaEye />, desc: 'System-wide log of all admin actions — who did what and when.',
      },
      {
        id: 'failed-logins', label: 'Failed Login Monitor', status: 'coming',
        icon: <FaUsers />, desc: 'Flag accounts with too many failed attempts, set auto-lock thresholds.',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: <FaChartBar />,
    color: 'teal',
    tools: [
      {
        id: 'platform-analytics', label: 'Platform Analytics', status: 'live', path: '/dashboard/analytics',
        icon: <FaChartBar />, desc: 'Traffic, orders, users — full platform overview.',
      },
      {
        id: 'advanced-reports', label: 'Advanced Reports', status: 'live', path: '/dashboard/analytics/advanced',
        icon: <FaFileAlt />, desc: 'Detailed customizable business reports.',
      },
      {
        id: 'order-analytics', label: 'Order Analytics', status: 'live', path: '/dashboard/orders/analytics',
        icon: <FaChartBar />, desc: 'Order trends, fulfillment rates, and performance metrics.',
      },
      {
        id: 'export-data', label: 'Export Data as CSV', status: 'coming',
        icon: <FaFileExcel />, desc: 'Export users, orders, or transactions filtered and downloadable.',
      },
      {
        id: 'churn-report', label: 'Churn & Performance', status: 'modal', modal: 'advAnalytics',
        icon: <FaChartLine />, desc: 'Users who registered but never ordered, or ordered once and left.',
      },
      {
        id: 'delivery-perf', label: 'Delivery Performance', status: 'modal', modal: 'advAnalytics',
        icon: <FaTruck />, desc: 'Average delivery time per agent, late orders %, SLA tracking.',
      },
    ],
  },
  {
    id: 'system',
    label: 'System Health',
    icon: <FaServer />,
    color: 'slate',
    tools: [
      {
        id: 'platform-settings', label: 'Platform Settings', status: 'live', path: '/dashboard/settings/platform',
        icon: <FaTools />, desc: 'Configure platform-wide settings, features, and toggles.',
      },
      {
        id: 'whatsapp-status', label: 'WhatsApp Manager', status: 'live', path: '/dashboard/settings/platform',
        icon: <FaWifi />, desc: 'Monitor WhatsApp engine, scan QR code, restart connection.',
      },
      {
        id: 'queue-monitor', label: 'Queue Monitor', status: 'coming',
        icon: <FaServer />, desc: 'See pending jobs (emails, SMS, WhatsApp) and retry failed ones.',
      },
      {
        id: 'cache-flush', label: 'Cache Flush', status: 'coming',
        icon: <FaHeartbeat />, desc: 'Clear specific cache keys without restarting the server.',
      },
      {
        id: 'db-cleanup', label: 'Database Cleanup', status: 'modal', modal: 'dbCleanup',
        icon: <FaDatabase />, desc: 'Archive old OTPs, expired sessions, and soft-deleted records.',
      },
    ],
  },
];

// ── COLOR MAP ──────────────────────────────────────────────────────────────────
const COLOR = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', badge: 'bg-indigo-600', head: 'bg-indigo-600', light: 'bg-indigo-100' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'text-amber-600',  badge: 'bg-amber-600',  head: 'bg-amber-600',  light: 'bg-amber-100'  },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badge: 'bg-green-600',  head: 'bg-green-600',  light: 'bg-green-100'  },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-600', head: 'bg-orange-600', light: 'bg-orange-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-600', head: 'bg-purple-600', light: 'bg-purple-100' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-600',    badge: 'bg-red-600',    head: 'bg-red-600',    light: 'bg-red-100'    },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   icon: 'text-teal-600',   badge: 'bg-teal-600',   head: 'bg-teal-600',   light: 'bg-teal-100'   },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  icon: 'text-slate-600',  badge: 'bg-slate-600',  head: 'bg-slate-600',  light: 'bg-slate-100'  },
};

export default function AdminTools() {
  const [openModal, setOpenModal] = useState(null);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg || 'Done!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const filteredCategories = TOOL_CATEGORIES.map(cat => ({
    ...cat,
    tools: cat.tools.filter(t =>
      !search ||
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.tools.length > 0);

  const totalLive    = TOOL_CATEGORIES.flatMap(c => c.tools).filter(t => t.status === 'live').length;
  const totalModal   = TOOL_CATEGORIES.flatMap(c => c.tools).filter(t => t.status === 'modal').length;
  const totalComing  = TOOL_CATEGORIES.flatMap(c => c.tools).filter(t => t.status === 'coming').length;
  const totalTools   = TOOL_CATEGORIES.flatMap(c => c.tools).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Back to Dashboard">
                <FaChevronRight className="rotate-180" />
              </Link>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <FaTools className="text-indigo-600" /> Admin Toolbox
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1 ml-9">
              Centralised hub for all administrative tools — existing features, quick-launch modals, and upcoming tools.
            </p>
          </div>
          {/* Stats pills */}
          <div className="flex gap-2 flex-wrap text-xs font-semibold">
            <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">{totalTools} Total</span>
            <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">{totalLive} Live Pages</span>
            <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700">{totalModal} Quick-Launch</span>
            <span className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700">{totalComing} Coming Soon</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
          ✅ {successMsg}
        </div>
      )}

      {/* ── Categories ── */}
      {filteredCategories.map(cat => {
        const c = COLOR[cat.color];
        return (
          <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Category Header */}
            <div className={`${c.head} px-5 py-3 flex items-center gap-2`}>
              <span className="text-white text-sm">{cat.icon}</span>
              <h2 className="text-white font-bold text-sm tracking-wide uppercase">{cat.label}</h2>
              <span className="ml-auto text-white/80 text-xs">{cat.tools.length} tools</span>
            </div>

            {/* Tools Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {cat.tools.map(tool => (
                <ToolCard key={tool.id} tool={tool} c={c} onModalOpen={setOpenModal} />
              ))}
            </div>
          </div>
        );
      })}

      {filteredCategories.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <FaSearch className="text-4xl mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tools match "{search}"</p>
          <button onClick={() => setSearch('')} className="mt-2 text-indigo-600 text-sm hover:underline">Clear search</button>
        </div>
      )}

      {/* ── Modals ── */}
      <AdminForceVerifyModal
        isOpen={openModal === 'forceVerify'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => { showSuccess(msg || 'User verified successfully!'); }}
      />
      <AdminDirectCreateUserModal
        isOpen={openModal === 'createUser'}
        onClose={() => setOpenModal(null)}
        onSuccess={() => showSuccess('User account created and credentials sent!')}
      />
      <AdminForceResetPasswordModal
        isOpen={openModal === 'forceResetPw'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminMergeAccountsModal
        isOpen={openModal === 'mergeAccounts'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminImpersonateUserModal
        isOpen={openModal === 'impersonate'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminWalletAdjustModal
        isOpen={openModal === 'walletAdjust'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminForceOrderStatusModal
        isOpen={openModal === 'forceOrderStatus'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminReassignAgentModal
        isOpen={openModal === 'reassignAgent'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminIssueRefundModal
        isOpen={openModal === 'issueRefund'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminForceShopStatusModal
        isOpen={openModal === 'forceShop'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminBulkToggleModal
        isOpen={openModal === 'bulkToggle'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminCloneOrderModal
        isOpen={openModal === 'cloneOrder'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminResendNotificationModal
        isOpen={openModal === 'resendNotif'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminBroadcastModal
        isOpen={openModal === 'broadcast'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminDBCleanupModal
        isOpen={openModal === 'dbCleanup'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminTxSearchModal
        isOpen={openModal === 'txSearch'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminIPBlocklistModal
        isOpen={openModal === 'ipBlocklist'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminSessionManagerModal
        isOpen={openModal === 'sessionManager'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminAdvancedAnalyticsModal
        isOpen={openModal === 'advAnalytics'}
        onClose={() => setOpenModal(null)}
      />
      <AdminTemplateEditorModal
        isOpen={openModal === 'templateEditor'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminCustomOTPModal
        isOpen={openModal === 'customOtp'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminManualConfirmPaymentModal
        isOpen={openModal === 'manualPayment'}
        onClose={() => setOpenModal(null)}
        onSuccess={(msg) => {
           showSuccess(msg);
           setOpenModal(null);
        }}
      />
      <AdminUserActivityModal
        isOpen={openModal === 'userActivity'}
        onClose={() => setOpenModal(null)}
      />
    </div>
  );
}

// ── Tool Card Component ────────────────────────────────────────────────────────
function ToolCard({ tool, c, onModalOpen }) {
  const statusConfig = {
    live:    { label: 'Live', classes: 'bg-blue-100 text-blue-700' },
    modal:   { label: 'Quick Launch', classes: 'bg-green-100 text-green-700' },
    coming:  { label: 'Coming Soon', classes: 'bg-yellow-100 text-yellow-700' },
  };
  const status = statusConfig[tool.status];

  const cardBase = `group relative flex flex-col gap-2 p-4 rounded-xl border transition-all duration-200 ${c.bg} ${c.border}`;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xl ${c.icon}`}>{tool.icon}</span>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.classes}`}>
          {status.label}
        </span>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800 leading-tight">{tool.label}</p>
        <p className="text-xs text-gray-500 mt-1 leading-snug">{tool.desc}</p>
      </div>
      {tool.status !== 'coming' && (
        <div className={`mt-auto flex items-center gap-1 text-xs font-semibold ${c.icon} opacity-0 group-hover:opacity-100 transition-opacity`}>
          {tool.status === 'live' ? <><FaExternalLinkAlt className="text-[10px]" /> Open Page</> : <><FaChevronRight className="text-[10px]" /> Launch Tool</>}
        </div>
      )}
      {tool.status === 'coming' && (
        <div className="mt-auto text-xs text-gray-400 italic">Not yet implemented</div>
      )}
    </>
  );

  if (tool.status === 'coming') {
    return <div className={`${cardBase} opacity-60 cursor-not-allowed`}>{content}</div>;
  }

  if (tool.status === 'modal') {
    return (
      <button
        onClick={() => onModalOpen(tool.modal)}
        className={`${cardBase} text-left hover:shadow-md hover:scale-[1.02] cursor-pointer`}
      >
        {content}
      </button>
    );
  }

  // live → Link
  return (
    <Link to={tool.path} className={`${cardBase} hover:shadow-md hover:scale-[1.02]`}>
      {content}
    </Link>
  );
}
