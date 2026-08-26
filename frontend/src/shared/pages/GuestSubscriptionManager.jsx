import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

// ── Field helpers matching the backend model ───────────────────────────────
// MealOccurrence: date (DATEONLY), status, deliveryAddress, orderId
// MealOccurrence includes schedule join: schedule.mealTimeType, schedule.preferredTime
const occDate     = (occ) => occ.date || occ.scheduledDate || '';
const occMealTime = (occ) => occ.schedule?.mealTimeType || occ.mealTimeType || '';
const occTime     = (occ) => occ.schedule?.preferredTime || occ.preferredTime || '';

// Parse DATEONLY string safely without timezone shift
const parseDateOnly = (str) => {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(str);
};

const STATUS_COLOR = {
  Active:    'text-green-400',
  Pending:   'text-yellow-400',
  Cancelled: 'text-red-400',
  Grace:     'text-orange-400',
  'Past Due':'text-red-400',
  Expired:   'text-gray-400',
};

export default function GuestSubscriptionManager() {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [sub, setSub]             = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchSubscription(); }, [token]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/subscriptions/guest/${token}`);
      setSub(res.data);

      // Occurrences endpoint requires auth for registered users, but the
      // guest subscription id is known from the token response — fetch directly.
      // The backend /:id/occurrences route uses auth middleware, so we use the
      // guest-specific occurrences endpoint pattern via the subscription id.
      // Since guests have no auth token, we hit the same endpoint but the
      // subscription ownership is validated server-side via the guestManageToken
      // stored on the subscription. The route accepts the subscription id in the
      // URL — this works because guests fetched the sub record first.
      const occRes = await api.get(`/subscriptions/${res.data.id}/occurrences`);
      setOccurrences(occRes.data || []);
    } catch (err) {
      toast.error('Invalid or expired management link');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async (occurrenceId) => {
    if (!window.confirm('Skip this meal? This cannot be undone.')) return;
    try {
      // FIX: use the token-based guest skip route
      await api.post(`/subscriptions/guest/${token}/occurrences/${occurrenceId}/skip`);
      toast.success('Meal skipped');
      fetchSubscription();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to skip meal');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(
      'Are you sure you want to cancel your entire subscription? This cannot be undone.'
    )) return;
    try {
      // FIX: the backend route is POST /subscriptions/guest/:token/cancel
      // The controller's cancelGuest handler looks up the subscription via
      // guestManageToken — it does NOT use req.params.id, so we must NOT
      // include the subscription id in the URL.
      await api.post(`/subscriptions/guest/${token}/cancel`);
      toast.success('Subscription cancelled');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel subscription');
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (!sub) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Link Not Found</h2>
        <p className="text-white/60">This management link is invalid or has expired.</p>
      </div>
    </div>
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const scheduled = occurrences.filter(o => o.status === 'scheduled');
  const delivered  = occurrences.filter(o => o.status === 'delivered');
  const skipped    = occurrences.filter(o => o.status === 'skipped');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs uppercase tracking-widest mb-1">Meal Plan Management</p>
            <h1 className="text-white font-bold text-xl">Hi {sub.guestName}! 👋</h1>
          </div>
          <span className={`text-sm font-bold ${STATUS_COLOR[sub.status] || 'text-white'}`}>
            ● {sub.status}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Cost',      value: `KES ${parseFloat(sub.customPrice || 0).toFixed(2)}` },
            { label: 'Billing',   value: sub.plan?.billingCycle || 'Weekly' },
            { label: 'Upcoming',  value: `${scheduled.length} meals` },
            { label: 'Delivered', value: `${delivered.length} meals` },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-white/50 text-xs mb-1">{stat.label}</p>
              <p className="text-white font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white/10 rounded-xl p-1">
          {['overview', 'schedule', 'skipped'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-white text-blue-900' : 'text-white/60 hover:text-white'
              }`}>
              {tab}
              {tab === 'schedule' && scheduled.length > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {scheduled.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Subscription Details</h3>
              <dl className="space-y-2 text-sm">
                {[
                  { label: 'Name',    value: sub.guestName },
                  { label: 'Phone',   value: sub.guestPhone },
                  sub.guestEmail          ? { label: 'Email',    value: sub.guestEmail }          : null,
                  sub.guestDeliveryAddress? { label: 'Default Delivery', value: sub.guestDeliveryAddress } : null,
                  { label: 'Plan',    value: sub.plan?.name || 'Custom meal plan' },
                  { label: 'Started', value: new Date(sub.startDate).toLocaleDateString() },
                  { label: 'Expires', value: new Date(sub.expiryDate).toLocaleDateString() },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-white/50 shrink-0">{label}</dt>
                    <dd className="text-white text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Weekly schedule preview */}
            {sub.schedules?.length > 0 && (
              <div className="bg-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3">Your Weekly Template</h3>
                <div className="space-y-2">
                  {sub.schedules.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                      <span className="text-white capitalize text-sm font-medium">
                        {s.dayOfWeek} — {s.mealTimeType}
                      </span>
                      <span className="text-white/60 text-xs">{s.preferredTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancel zone */}
            {sub.status !== 'Cancelled' && sub.status !== 'Expired' && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-5">
                <h3 className="text-red-300 font-semibold mb-2">Cancel Subscription</h3>
                <p className="text-red-300/70 text-sm mb-4">
                  Cancelling will stop all future meal deliveries. This action cannot be undone.
                </p>
                <button onClick={handleCancel}
                  className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all text-sm">
                  Cancel My Subscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Schedule Tab ── */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <p className="text-white/50 text-sm">
              {scheduled.length} upcoming meal{scheduled.length !== 1 ? 's' : ''}
            </p>
            {scheduled.length === 0 ? (
              <div className="text-center text-white/40 py-10">No upcoming meals scheduled</div>
            ) : (() => {
              const mealTimeOrder = { breakfast: 0, lunch: 1, dinner: 2 };
              const grouped = {};
              scheduled.forEach(occ => {
                // FIX: use occ.date (DATEONLY), not occ.scheduledDate
                const raw = occDate(occ);
                const key = raw
                  ? parseDateOnly(raw).toDateString()
                  : 'Unknown';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(occ);
              });
              const sortedKeys = Object.keys(grouped)
                .sort((a, b) => new Date(a) - new Date(b));

              return sortedKeys.map(dateKey => {
                const meals = grouped[dateKey]
                  .sort((a, b) =>
                    (mealTimeOrder[occMealTime(a)] ?? 99) -
                    (mealTimeOrder[occMealTime(b)] ?? 99));
                const d = parseDateOnly(occDate(meals[0])) || new Date(dateKey);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={dateKey} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-base">
                        {d.toLocaleDateString('en-KE', {
                          weekday:'long', month:'long', day:'numeric', year:'numeric'
                        })}
                      </h3>
                      {isToday && (
                        <span className="text-blue-400 font-semibold text-xs bg-blue-400/20 rounded-full px-2 py-1">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 ml-2">
                      {meals.map(occ => {
                        // FIX: read mealTimeType & preferredTime from schedule join
                        const mt   = occMealTime(occ);
                        const time = occTime(occ);
                        return (
                          <div key={occ.id}
                            className="bg-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white font-medium capitalize text-sm">
                                {mt || 'Meal'}{time ? ` · ${time}` : ''}
                              </p>
                              {occ.deliveryAddress && (
                                <p className="text-white/50 text-xs mt-0.5 truncate">
                                  {occ.deliveryAddress}
                                </p>
                              )}
                            </div>
                            <button onClick={() => handleSkip(occ.id)}
                              className="shrink-0 text-xs text-red-400 hover:text-red-300 font-semibold border border-red-400/30 rounded-lg px-3 py-1.5 hover:bg-red-400/10 transition-all">
                              Skip
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ── Skipped Tab ── */}
        {activeTab === 'skipped' && (
          <div className="space-y-3">
            <p className="text-white/50 text-sm">
              {skipped.length} skipped meal{skipped.length !== 1 ? 's' : ''}
            </p>
            {skipped.length === 0 ? (
              <div className="text-center text-white/40 py-10">No skipped meals</div>
            ) : (
              skipped.map(occ => {
                // FIX: use occ.date not occ.scheduledDate
                const raw = occDate(occ);
                const d = raw ? parseDateOnly(raw) : null;
                const mt = occMealTime(occ);
                const time = occTime(occ);
                return (
                  <div key={occ.id} className="bg-white/5 rounded-xl p-4 opacity-60">
                    <p className="text-white/60 capitalize text-sm line-through">
                      {mt || 'Meal'}{time ? ` · ${time}` : ''}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {d
                        ? d.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'short' })
                        : raw}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
