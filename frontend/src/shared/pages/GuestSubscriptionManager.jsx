import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/shared/services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

export default function GuestSubscriptionManager() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSubscription();
  }, [token]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/subscriptions/guest/${token}`);
      setSub(res.data);

      // Also fetch occurrences
      const occRes = await api.get(`/subscriptions/${res.data.id}/occurrences`);
      setOccurrences(occRes.data || []);
    } catch (err) {
      toast.error('Invalid or expired management link');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async (occurrenceId) => {
    if (!window.confirm('Are you sure you want to skip this meal?')) return;
    try {
      // Guest skip uses token-based route
      await api.post(`/subscriptions/guest/${token}/occurrences/${occurrenceId}/skip`);
      toast.success('Meal skipped successfully');
      fetchSubscription();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to skip meal');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your entire subscription? This cannot be undone.')) return;
    try {
      await api.post(`/subscriptions/guest/${token}/cancel`);
      toast.success('Subscription cancelled');
      navigate('/');
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

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

  const scheduled = occurrences.filter(o => o.status === 'scheduled');
  const delivered = occurrences.filter(o => o.status === 'delivered');
  const skipped = occurrences.filter(o => o.status === 'skipped');

  const statusColor = {
    Active: 'text-green-400', Pending: 'text-yellow-400', Cancelled: 'text-red-400',
    Grace: 'text-orange-400', 'Past Due': 'text-red-400'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-xs uppercase tracking-widest mb-1">Meal Plan Management</p>
            <h1 className="text-white font-bold text-xl">Hi {sub.guestName}! 👋</h1>
          </div>
          <span className={`text-sm font-bold ${statusColor[sub.status] || 'text-white'}`}>
            ● {sub.status}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Plan info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Weekly Cost', value: `KES ${parseFloat(sub.customPrice || 0).toFixed(2)}` },
            { label: 'Billing', value: sub.billingCycle || 'Weekly' },
            { label: 'Upcoming', value: `${scheduled.length} meals` },
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
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white text-blue-900' : 'text-white/60 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Subscription Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-white/50">Name</dt>
                  <dd className="text-white">{sub.guestName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Phone</dt>
                  <dd className="text-white">{sub.guestPhone}</dd>
                </div>
                {sub.guestEmail && (
                  <div className="flex justify-between">
                    <dt className="text-white/50">Email</dt>
                    <dd className="text-white">{sub.guestEmail}</dd>
                  </div>
                )}
                {sub.guestDeliveryAddress && (
                  <div className="flex justify-between">
                    <dt className="text-white/50">Delivery Address</dt>
                    <dd className="text-white">{sub.guestDeliveryAddress}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-white/50">Started</dt>
                  <dd className="text-white">{new Date(sub.startDate).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Expires</dt>
                  <dd className="text-white">{new Date(sub.expiryDate).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* Weekly schedule preview */}
            {sub.schedules?.length > 0 && (
              <div className="bg-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3">Your Weekly Template</h3>
                <div className="space-y-2">
                  {sub.schedules.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                      <span className="text-white capitalize text-sm font-medium">{s.dayOfWeek} — {s.mealTimeType}</span>
                      <span className="text-white/60 text-xs">{s.preferredTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancel button */}
            {sub.status !== 'Cancelled' && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-5">
                <h3 className="text-red-300 font-semibold mb-2">Cancel Subscription</h3>
                <p className="text-red-300/70 text-sm mb-4">Cancelling will stop all future meal deliveries. This action cannot be undone.</p>
                <button onClick={handleCancel}
                  className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all text-sm">
                  Cancel My Subscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            <p className="text-white/50 text-sm">{scheduled.length} upcoming meal{scheduled.length !== 1 ? 's' : ''}</p>
            {scheduled.length === 0 ? (
              <div className="text-center text-white/40 py-10">No upcoming meals scheduled</div>
            ) : (
              scheduled.map(occ => {
                const d = new Date(occ.scheduledDate);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={occ.id} className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium capitalize text-sm">{occ.mealTimeType}</p>
                      <p className="text-white/60 text-xs mt-0.5">
                        {d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })} · {occ.scheduledTime}
                        {isToday && <span className="ml-2 text-blue-400 font-semibold">Today</span>}
                      </p>
                    </div>
                    <button onClick={() => handleSkip(occ.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold border border-red-400/30 rounded-lg px-3 py-1.5 hover:bg-red-400/10 transition-all">
                      Skip
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Skipped Tab */}
        {activeTab === 'skipped' && (
          <div className="space-y-3">
            <p className="text-white/50 text-sm">{skipped.length} skipped meal{skipped.length !== 1 ? 's' : ''}</p>
            {skipped.length === 0 ? (
              <div className="text-center text-white/40 py-10">No skipped meals</div>
            ) : (
              skipped.map(occ => {
                const d = new Date(occ.scheduledDate);
                return (
                  <div key={occ.id} className="bg-white/5 rounded-xl p-4 opacity-60">
                    <p className="text-white/60 capitalize text-sm line-through">{occ.mealTimeType}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })} · {occ.scheduledTime}
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
