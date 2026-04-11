import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { uploadFile } from '../../services/upload'
import Modal from '../../components/ui/Modal'
import { FaStore, FaBox, FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaCalendarAlt, FaMoneyBillWave, FaStopCircle, FaCog, FaImage, FaLink } from 'react-icons/fa'
import { resolveImageUrl } from '../../utils/imageUtils'
import { formatPrice } from '../../utils/currency'

export default function AdminFastFoodPromotions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingId, setUploadingId] = useState(null)
  const [me, setMe] = useState(null)
  const [usersMap, setUsersMap] = useState(new Map())
  const [fastfoodsMap, setFastfoodsMap] = useState(new Map())
  const [rates, setRates] = useState({ perDay: 500, perProduct: 100, instructions: '' })
  const [editingRates, setEditingRates] = useState(false)
  const [savingRates, setSavingRates] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [modalAction, setModalAction] = useState(null) // 'approve' | 'status' | 'refund'
  const [newStatus, setNewStatus] = useState('')
  const [startAt, setStartAt] = useState('')
  const [notes, setNotes] = useState('')
  const [promoTitle, setPromoTitle] = useState('')
  const [promoSubtitle, setPromoSubtitle] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Resolve backend file URLs (e.g., /uploads/...) to absolute using API base
  const fileBase = useMemo(() => {
    const base = api.defaults.baseURL || ''
    return base.replace(/\/?api\/?$/, '')
  }, [])
  const resolveFileUrl = (url) => {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    return `${fileBase}/${String(url).replace(/^\/+/, '')}`
  }
  const openRefundModal = (app) => {
    setSelectedApp(app)
    setModalAction('refund')
    setNotes('')
  }

  const load = () => {
    setLoading(true)
    api.get('/admin/hero-promotions/applications?promoType=fastfood')
      .then(r => {
        const { items: newItems = [], users: newUsers = [], fastfoods: newFastfoods = [] } = r.data
        setItems(newItems)

        // Merge enriched data into maps
        setUsersMap(prev => {
          const next = new Map(prev)
          newUsers.forEach(u => next.set(u.id, u))
          return next
        })
        setFastfoodsMap(prev => {
          const next = new Map(prev)
          newFastfoods.forEach(f => next.set(f.id, f))
          return next
        })
      })
      .catch(e => setError(e?.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  // Super admin: edit / delete
  const editPromotion = async (x) => {
    try {
      const fastFoodIdsStr = prompt('Fast Food IDs (comma-separated):', (x.fastFoodIds || []).join(','))
      const fastFoodIds = (fastFoodIdsStr || '').split(',').map(y => Number(y.trim())).filter(Boolean)
      const durationDays = Number(prompt('Duration days:', String(x.durationDays || 7))) || x.durationDays
      const slotsCount = Number(prompt('Slots count:', String(x.slotsCount || 1))) || x.slotsCount
      const startAtStr = prompt('Start date/time (YYYY-MM-DD HH:mm) or blank to keep:', x.startAt ? new Date(x.startAt).toISOString().slice(0, 16).replace('T', ' ') : '')
      const payload = {}
      if (fastFoodIds.length) payload.fastFoodIds = fastFoodIds
      if (durationDays != null) payload.durationDays = durationDays
      if (slotsCount != null) payload.slotsCount = slotsCount
      if (startAtStr !== null && startAtStr !== '') payload.startAt = new Date(startAtStr)
      await api.patch(`/admin/hero-promotions/manage/${x.id}`, payload)
      load()
    } catch (e) { alert(e?.response?.data?.error || e.message) }
  }

  const deletePromotion = async (id) => {
    if (!window.confirm('Delete this hero promotion?')) return
    try {
      await api.delete(`/admin/hero-promotions/manage/${id}`)
      load()
    } catch (e) { alert(e?.response?.data?.error || e.message) }
  }

  useEffect(() => {
    load()
    api.get('/auth/me').then(r => setMe(r.data)).catch(() => { })
    // Fetch users mapping
    api.get('/admin/users')
      .then(r => {
        const m = new Map()
        const usersArray = Array.isArray(r.data) ? r.data : (r.data?.users || [])
        usersArray.forEach(u => m.set(u.id, u))
        setUsersMap(prev => new Map([...prev, ...m]))
      })
      .catch(() => { })
    api.get('/hero-promotions/rates').then(r => {
      if (r.data) setRates(r.data)
    }).catch(() => { })
  }, [])

  const markPaid = async (id, paymentProofUrl) => {
    try {
      await api.post(`/admin/hero-promotions/applications/${id}/payment`, paymentProofUrl ? { paymentProofUrl } : {})
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp({ ...selectedApp, paymentStatus: 'paid' })
      }
      load()
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to mark as paid')
    }
  }

  const openApproveModal = (app) => {
    setSelectedApp(app)
    setModalAction('approve')
    setStartAt(new Date().toISOString().slice(0, 16))
    setNotes('')
    setPromoTitle(app.title || '')
    setPromoSubtitle(app.subtitle || '')
  }

  const openStatusModal = (app) => {
    setSelectedApp(app)
    setModalAction('status')
    setNewStatus(app.status)
    setNotes('')
  }

  const handleModalAction = async () => {
    if (!selectedApp || !modalAction) return
    try {
      setActionLoading(true)
      if (modalAction === 'approve') {
        const body = { title: promoTitle, subtitle: promoSubtitle }
        if (startAt) body.startAt = new Date(startAt)
        await api.post(`/admin/hero-promotions/applications/${selectedApp.id}/approve`, body)
      } else if (modalAction === 'status') {
        await api.patch(`/admin/hero-promotions/applications/${selectedApp.id}/status`, { status: newStatus, notes })
      } else if (modalAction === 'refund') {
        await api.post(`/admin/hero-promotions/applications/${selectedApp.id}/refund`, notes ? { reason: notes } : {})
      }
      setSelectedApp(null)
      setModalAction(null)
      load()
    } catch (e) {
      alert(e?.response?.data?.error || e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSavingRates(true)
      const payload = {
        perDay: Number(rates.perDay),
        perProduct: Number(rates.perProduct),
        instructions: rates.instructions
      }
      await api.patch('/admin/hero-promotions/settings', payload)
      setEditingRates(false)
      alert('Settings updated successfully')
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to save settings')
    } finally {
      setSavingRates(false)
    }
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button className="px-3 py-1 bg-gray-200 rounded flex-shrink-0" onClick={() => window.history.back()}>← Back</button>
          <h2 className="text-base sm:text-lg font-semibold truncate text-orange-900">FastFood Banner Promotions</h2>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-3 text-orange-600 font-medium">Loading fastfood promotion data...</span>
        </div>
      ) : (
        <>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          <div className="mb-6 p-3 sm:p-4 border border-orange-200 rounded-lg shadow-sm bg-orange-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-orange-900">Promotion Settings (Shared)</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                <div>Daily Rate: <span className="font-semibold text-gray-900">KES {rates.perDay}</span></div>
                <div>Per Item/Day: <span className="font-semibold text-gray-900">KES {rates.perProduct}</span></div>
              </div>
              <div className="text-xs text-orange-800 italic opacity-80">Edit these rates in the Product Hero Promotions settings page.</div>
            </div>
          </div>

          {(() => {
            const isHistory = (x) => x.paymentStatus === 'refunded' || ['expired', 'cancelled', 'rejected'].includes(x.status)
            const isCurrent = (x) => !isHistory(x) || x.paymentStatus === 'refund_requested'
            const currentItems = (items || []).filter(isCurrent)
            const historyItems = (items || []).filter(isHistory)
            return (
              <>
                <h3 className="text-base font-semibold mb-2 text-orange-900">Current Requests ({currentItems.length})</h3>
                <div className="grid gap-4 mb-6">
                  {currentItems.map(x => <div key={x.id} className="rounded-xl border-2 transition-all shadow-sm bg-white overflow-hidden border-orange-100">
                      <div className="flex flex-wrap gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 md:hidden">
                        <button className="flex-1 min-w-[90px] px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-black shadow-sm active:scale-95" onClick={() => openApproveModal(x)}>Manage</button>
                        <button className="flex-1 min-w-[70px] px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold" onClick={() => openStatusModal(x)}>Status</button>
                        {x.status === 'active' && (
                          <button className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-black flex items-center gap-1" onClick={() => {
                            if (window.confirm('Pause this promotion?')) {
                              api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'paused', notes: 'Manually paused by admin' }).then(() => load())
                            }
                          }}><FaStopCircle /> Pause</button>
                        )}
                        {me?.role === 'super_admin' && (
                          <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-black" onClick={() => deletePromotion(x.id)}>Delete</button>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Visual Preview */}
                          <div className="w-full md:w-32 h-28 sm:h-32 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border">
                            {x.customImageUrl ? (
                              <img src={resolveImageUrl(x.customImageUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (x.fastFoodIds || []).length > 0 && fastfoodsMap.get(x.fastFoodIds[0]) ? (
                              <img src={resolveImageUrl(fastfoodsMap.get(x.fastFoodIds[0])?.mainImage)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><FaImage size={32} /></div>
                            )}
                          </div>

                          <div className="flex-grow space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded tracking-widest uppercase">ID: {x.id}</span>
                            </div>

                            <div className="text-sm">
                              <span className="font-bold text-gray-500 mr-1 uppercase text-[10px] tracking-wider">Seller:</span>
                              <span className="font-bold text-gray-900 text-xs">
                                {usersMap.has(x.sellerId) ? (
                                  <a href="/superadmin" className="text-blue-700 underline">
                                    {usersMap.get(x.sellerId)?.name || 'Unknown'}
                                  </a>
                                ) : `#${x.sellerId}`}
                              </span>
                            </div>

                            <div className="text-xs flex flex-wrap gap-x-2 gap-y-0.5">
                              <span><span className="font-bold text-gray-400 uppercase text-[9px]">Status: </span><span className="font-black text-gray-900 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{x.status}</span></span>
                              <span><span className="font-bold text-gray-400 uppercase text-[9px]">Payment: </span><span className={`font-bold ${x.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>{x.paymentStatus}</span></span>
                            </div>

                            <div className="text-xs">
                              <span className="font-bold text-gray-400 uppercase text-[9px] mr-1">Content:</span>
                              {(x.fastFoodIds || []).length ? (
                                (x.fastFoodIds || []).map(pid => (
                                  <span key={pid} className="font-bold text-orange-700 mr-2">
                                    {fastfoodsMap.get(pid)?.name || `#${pid}`}
                                  </span>
                                ))
                              ) : (
                                <span className="text-red-500 font-bold italic">No Items</span>
                              )}
                            </div>

                            <div className="text-[10px] font-bold text-gray-400">
                              {x.durationDays}d • KES {x.amount}
                              {x.startAt && <span className="ml-1">• {new Date(x.startAt).toLocaleDateString()}</span>}
                            </div>
                          </div>

                          <div className="hidden md:flex flex-col gap-2 w-44 flex-shrink-0">
                            <button className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-black shadow-sm transition-all active:scale-95" onClick={() => openApproveModal(x)}>Manage / Review</button>
                            <button className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all" onClick={() => openStatusModal(x)}>Set Status</button>
                            {me?.role === 'super_admin' && (
                              <button className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition-all" onClick={() => deletePromotion(x.id)}>Delete Permanently</button>
                            )}
                          </div>
                        </div>

                        {x.paymentProofUrl && (
                          <div className="mt-3 pt-2 border-t border-dashed flex items-center justify-between">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Proof</div>
                            <a href={resolveFileUrl(x.paymentProofUrl)} target="_blank" rel="noreferrer" className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1">
                              <FaImage /> View
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!loading && currentItems.length === 0 && <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">No current fastfood promotion applications.</div>}
                </div>

                <h3 className="text-base font-semibold mb-2">History</h3>
                <div className="grid gap-3 opacity-75">
                  {historyItems.map(x => (
                    <div key={x.id} className="card p-3">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-sm">ID: {x.id}</div>
                          <div className="text-sm">Seller: {usersMap.get(x.sellerId)?.name || x.sellerId}</div>
                          <div className="text-sm">Status: <span className="font-medium">{x.status}</span> | Payment: {x.paymentStatus}</div>
                          <div className="text-sm text-gray-500">Items: {(x.fastFoodIds || []).join(', ')}</div>
                          <div className="text-sm font-medium">Amount: KES {x.amount}</div>
                          {x.endAt && <div className="text-sm text-gray-400">Ended: {new Date(x.endAt).toLocaleString()}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loading && historyItems.length === 0 && <div className="text-sm text-gray-500">No history yet.</div>}
                </div>
              </>
            )
          })()}
        </>
      )}

      {(() => {
        if (!selectedApp || !modalAction) return null
        const seller = usersMap.get(selectedApp.sellerId) || { name: 'Unknown', email: '-' }
        const pids = selectedApp.fastFoodIds || []

        return (
          <Modal
            isOpen={!!selectedApp}
            onClose={() => setSelectedApp(null)}
            title={
              modalAction === 'approve' ? 'Review & Approve Promotion' :
                modalAction === 'refund' ? 'Review Refund Request' :
                  'Update Application Status'
            }
            maxWidth="max-w-2xl"
          >
            <div className="space-y-6">
              {/* Seller Info */}
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 text-orange-800 font-black uppercase text-xs tracking-widest mb-4">
                  <FaStore /> Seller Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Full Name</div>
                    <div className="text-sm font-bold text-gray-900">{seller.name}</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Contact Email</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{seller.email}</div>
                  </div>
                </div>
              </div>

              {/* Items Info */}
              <div>
                <div className="flex items-center gap-2 text-orange-800 font-bold mb-4">
                  <FaBox /> Promotional Items ({pids.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pids.map(pid => {
                    const p = fastfoodsMap.get(pid)
                    if (!p) return <div key={pid} className="p-4 border rounded-xl text-xs text-gray-400 bg-gray-50">Loading Item #{pid}...</div>

                    const image = resolveImageUrl(p?.mainImage)
                    return (
                      <div key={pid} className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="relative h-32 bg-gray-50 overflow-hidden">
                          <img
                            src={image}
                            alt={p?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="text-sm font-bold text-gray-900 truncate mb-1">{p?.name || `Item #${pid}`}</h4>
                          <span className="text-sm font-black text-orange-800">{formatPrice(p?.discountPrice || p?.displayPrice || p?.basePrice || 0)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Payment Proof */}
              {selectedApp.paymentProofUrl && (
                <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-xl">
                  <div className="text-sm font-black text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FaMoneyBillWave /> Payment Proof Submitted
                  </div>
                  <img
                    src={resolveFileUrl(selectedApp.paymentProofUrl)}
                    alt="Proof"
                    className="max-h-48 w-full object-contain p-2 bg-white rounded border border-orange-100"
                  />
                </div>
              )}

              {/* Application Details */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-bold mb-2">
                    <FaClock /> Schedule Details
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Duration: <span className="font-medium">{selectedApp.durationDays} days</span></div>
                    <div>Status: <span className="font-medium uppercase text-xs">{selectedApp.status}</span></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-bold mb-2">
                    <FaMoneyBillWave /> Financials
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Total Amount: <span className="font-bold text-lg text-orange-600">KES {selectedApp.amount}</span></div>
                    <div>Payment: <span className="font-medium underline">{selectedApp.paymentStatus}</span></div>
                  </div>
                  {selectedApp.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => markPaid(selectedApp.id)}
                      className="mt-3 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black shadow-sm"
                    >
                      Receive Payment (Manual)
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t">
                {modalAction === 'approve' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Banner Heading</label>
                        <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold" value={promoTitle} onChange={e => setPromoTitle(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Featured Statement</label>
                        <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold" value={promoSubtitle} onChange={e => setPromoSubtitle(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Live Start Date & Time</label>
                      <input type="datetime-local" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" value={startAt} onChange={e => setStartAt(e.target.value)} />
                    </div>
                    <button disabled={actionLoading} onClick={handleModalAction} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                      {actionLoading ? 'Processing...' : 'Approve & Go Live'}
                    </button>
                  </div>
                )}
                {modalAction === 'status' && (
                  <div className="space-y-4">
                    <select className="w-full p-2 border rounded-lg" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      <option value="pending_payment">Pending Payment</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="expired">Expired</option>
                      <option value="rejected">Rejected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <textarea className="w-full p-2 border rounded-lg h-24" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason / Notes..." />
                    <button disabled={actionLoading} onClick={handleModalAction} className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold">Update status</button>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
