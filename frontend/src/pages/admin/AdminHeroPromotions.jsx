import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { uploadFile } from '../../services/upload'
import Modal from '../../components/ui/Modal'
import { FaStore, FaBox, FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaCalendarAlt, FaMoneyBillWave, FaStopCircle, FaCog, FaImage, FaLink } from 'react-icons/fa'
import { resolveImageUrl } from '../../utils/imageUtils'
import { formatPrice } from '../../utils/currency'

export default function AdminHeroPromotions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingId, setUploadingId] = useState(null)
  const [me, setMe] = useState(null)
  const [usersMap, setUsersMap] = useState(new Map())
  const [productsMap, setProductsMap] = useState(new Map())
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
    api.get('/admin/hero-promotions/applications')
      .then(r => {
        const { items: newItems = [], users: newUsers = [], products: newProducts = [] } = r.data
        setItems(newItems)

        // Merge enriched data into maps
        setUsersMap(prev => {
          const next = new Map(prev)
          newUsers.forEach(u => next.set(u.id, u))
          return next
        })
        setProductsMap(prev => {
          const next = new Map(prev)
          newProducts.forEach(p => next.set(p.id, p))
          return next
        })
      })
      .catch(e => setError(e?.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  // Super admin: edit / delete

  const editPromotion = async (x) => {
    try {
      const productIdsStr = prompt('Product IDs (comma-separated):', (x.productIds || []).join(','))
      const productIds = (productIdsStr || '').split(',').map(y => Number(y.trim())).filter(Boolean)
      const durationDays = Number(prompt('Duration days:', String(x.durationDays || 7))) || x.durationDays
      const slotsCount = Number(prompt('Slots count:', String(x.slotsCount || 1))) || x.slotsCount
      const startAtStr = prompt('Start date/time (YYYY-MM-DD HH:mm) or blank to keep:', x.startAt ? new Date(x.startAt).toISOString().slice(0, 16).replace('T', ' ') : '')
      const payload = {}
      if (productIds.length) payload.productIds = productIds
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
    // Fetch users and products to map IDs -> names
    api.get('/admin/users')
      .then(r => {
        const m = new Map()
        const usersArray = Array.isArray(r.data) ? r.data : (r.data?.users || [])
        usersArray.forEach(u => m.set(u.id, u))
        setUsersMap(prev => new Map([...prev, ...m]))
      })
      .catch(() => { })
    api.get('/admin/products')
      .then(r => {
        const m = new Map()
        const productsArray = Array.isArray(r.data) ? r.data : (r.data?.products || [])
        productsArray.forEach(p => m.set(p.id, p))
        setProductsMap(prev => new Map([...prev, ...m]))
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
        const body = {
          title: promoTitle,
          subtitle: promoSubtitle
        }
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
  const uploadAndMarkPaid = async (id, file) => {
    if (!file) return
    try {
      setUploadingId(id)
      const url = await uploadFile(file)
      await markPaid(id, url)
    } finally {
      setUploadingId(null)
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
          <h2 className="text-base sm:text-lg font-semibold truncate">Hero Banner Promotions</h2>
        </div>
        {(me?.role === 'super_admin' || me?.role === 'admin') && (
          <Link to="/dashboard/marketing/hero-promotions/create" className="px-3 py-1 bg-emerald-700 text-white rounded text-sm flex-shrink-0">+ Create</Link>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading promotion data...</span>
        </div>
      ) : (
        <>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          <div className="mb-6 p-3 sm:p-4 border rounded shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-semibold">Promotion Settings</h3>
              {!editingRates ? (
                <button onClick={() => setEditingRates(true)} className="text-sm text-blue-600 font-medium">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button disabled={savingRates} onClick={() => setEditingRates(false)} className="text-sm text-gray-500">Cancel</button>
                  <button disabled={savingRates} onClick={saveSettings} className="text-sm text-blue-600 font-bold">{savingRates ? 'Saving...' : 'Save'}</button>
                </div>
              )}
            </div>
            {!editingRates ? (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <div>Daily Rate: <span className="font-semibold text-gray-900">KES {rates.perDay}</span></div>
                  <div>Per Product/Day: <span className="font-semibold text-gray-900">KES {rates.perProduct}</span></div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-1">M-Pesa Instructions:</div>
                  <div className="p-2 bg-gray-50 rounded italic text-xs">{rates.instructions || 'No instructions set.'}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Base Daily Rate (KES)</label>
                    <input type="number" value={rates.perDay} onChange={e => setRates({ ...rates, perDay: e.target.value })} className="w-full p-2 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Per Product Per Day (KES)</label>
                    <input type="number" value={rates.perProduct} onChange={e => setRates({ ...rates, perProduct: e.target.value })} className="w-full p-2 border rounded text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">M-Pesa Payment Instructions</label>
                  <textarea value={rates.instructions} onChange={e => setRates({ ...rates, instructions: e.target.value })} className="w-full p-2 border rounded h-16 text-sm" placeholder="e.g. Pay via M-Pesa Till: 123456..."></textarea>
                </div>
              </div>
            )}
          </div>

          {/* Group into Current vs History */}
          {(() => {
            const isHistory = (x) => x.paymentStatus === 'refunded' || ['expired', 'cancelled', 'rejected'].includes(x.status)  // 'paused' stays in Current
            const isCurrent = (x) => !isHistory(x) || x.paymentStatus === 'refund_requested'
            const currentItems = (items || []).filter(isCurrent)
            const historyItems = (items || []).filter(isHistory)
            return (
              <>
                <h3 className="text-base font-semibold mb-2">Current</h3>
                <div className="grid gap-4 mb-6">
                  {currentItems.map(x => <div key={x.id} className={`rounded-xl border-2 transition-all shadow-sm bg-white overflow-hidden ${x.isSystem ? 'border-emerald-100 ring-4 ring-emerald-50/50' : 'border-gray-100'}`}>
                      {/* Mobile action strip — always visible at the very top on small screens */}
                      <div className="flex flex-wrap gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 md:hidden">
                        <button className="flex-1 min-w-[90px] px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-sm active:scale-95" onClick={() => openApproveModal(x)}>Manage</button>
                        <button className="flex-1 min-w-[70px] px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold" onClick={() => openStatusModal(x)}>Status</button>
                        {x.status === 'active' && (
                          <button className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-black flex items-center gap-1" onClick={() => {
                            if (window.confirm('Pause this promotion?')) {
                              api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'paused', notes: 'Manually paused by admin' }).then(() => load())
                            }
                          }}><FaStopCircle /> Pause</button>
                        )}
                        {x.status === 'paused' && (
                          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black flex items-center gap-1" onClick={() => {
                            api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'active', notes: 'Reactivated by admin' }).then(() => load())
                          }}><FaCheckCircle /> Activate</button>
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
                            ) : (x.productIds || []).length > 0 && productsMap.get(x.productIds[0]) ? (
                              <img src={resolveImageUrl(productsMap.get(x.productIds[0])?.coverImage)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><FaImage size={32} /></div>
                            )}
                          </div>

                          <div className="flex-grow space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded tracking-widest uppercase">ID: {x.id}</span>
                              {x.isSystem && <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded uppercase flex items-center gap-1"><FaCog /> System</span>}
                              {x.isDefault && <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase flex items-center gap-1"><FaInfoCircle /> Default</span>}
                            </div>

                            <div className="text-sm">
                              <span className="font-bold text-gray-500 mr-1 uppercase text-[10px] tracking-wider">Context:</span>
                              {x.isSystem ? (
                                <span className="font-bold text-emerald-700 italic">Platform-Wide Banner</span>
                              ) : (
                                <span className="font-bold text-gray-900 text-xs">
                                  Seller: {usersMap.has(x.sellerId) ? (
                                    <a href="/superadmin" className="text-blue-700 underline">
                                      {usersMap.get(x.sellerId)?.name || 'Unknown'}
                                    </a>
                                  ) : `#${x.sellerId}`}
                                </span>
                              )}
                            </div>

                            <div className="text-xs flex flex-wrap gap-x-2 gap-y-0.5">
                              <span><span className="font-bold text-gray-400 uppercase text-[9px]">Status: </span><span className="font-black text-gray-900 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{x.status}</span></span>
                              <span><span className="font-bold text-gray-400 uppercase text-[9px]">Payment: </span><span className="font-bold text-emerald-600">{x.paymentStatus}</span></span>
                            </div>

                            <div className="text-xs">
                              <span className="font-bold text-gray-400 uppercase text-[9px] mr-1">Content:</span>
                              {x.customImageUrl ? (
                                <span className="text-gray-700 italic">Custom Image</span>
                              ) : (x.productIds || []).length ? (
                                (x.productIds || []).map(pid => (
                                  <a key={pid} href={`/product/${pid}`} className="text-blue-700 underline mr-1 font-bold">
                                    {productsMap.get(pid)?.name || `#${pid}`}
                                  </a>
                                ))
                              ) : (
                                <span className="text-red-500 font-bold italic">No Content</span>
                              )}
                            </div>

                            <div className="text-[10px] font-bold text-gray-400">
                              {x.durationDays}d • {x.slotsCount} slots • KES {x.amount}
                              {x.startAt && <span className="ml-1">• {new Date(x.startAt).toLocaleDateString()}</span>}
                            </div>
                          </div>

                          {/* Desktop-only action column */}
                          <div className="hidden md:flex flex-col gap-2 w-44 flex-shrink-0">
                            <button className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-sm transition-all active:scale-95" onClick={() => openApproveModal(x)}>Manage / Review</button>
                            <button className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all" onClick={() => openStatusModal(x)}>Set Status</button>
                            {x.status === 'active' && (
                              <button className="w-full px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-black flex items-center justify-center gap-1" onClick={() => {
                                if (window.confirm('Pause this promotion?')) {
                                  api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'paused', notes: 'Manually paused by admin' }).then(() => load())
                                }
                              }}><FaStopCircle /> Pause</button>
                            )}
                            {x.status === 'paused' && (
                              <button className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1 shadow-sm" onClick={() => {
                                api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'active', notes: 'Reactivated by admin' }).then(() => load())
                              }}><FaCheckCircle /> Activate</button>
                            )}
                            {me?.role === 'super_admin' && (
                              <button className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition-all" onClick={() => deletePromotion(x.id)}>Delete Permanently</button>
                            )}
                          </div>
                        </div>

                        {x.paymentProofUrl && (
                          <div className="mt-3 pt-2 border-t border-dashed flex items-center justify-between">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Proof</div>
                            <a href={resolveFileUrl(x.paymentProofUrl)} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                              <FaImage /> View
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!loading && currentItems.length === 0 && <div className="text-sm text-gray-500">No current applications.</div>}
                </div>

                <h3 className="text-base font-semibold mb-2">History</h3>
                <div className="grid gap-3">
                  {historyItems.map(x => (
                    <div key={x.id} className="card p-3">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-sm">ID: {x.id}</div>
                          <div className="text-sm">Seller: {usersMap.get(x.sellerId)?.name || x.sellerId}</div>
                          <div className="text-sm">Status: <span className="font-medium">{x.status}</span> | Payment: {x.paymentStatus}</div>
                          <div className="text-sm">Products: {(x.productIds || []).join(', ')}</div>
                          <div className="text-sm">Amount: KES {x.amount}</div>
                          {x.endAt && <div className="text-sm">Ended: {new Date(x.endAt).toLocaleString()}</div>}
                        </div>
                        <div className="flex flex-col gap-2">
                          {me?.role === 'super_admin' && (
                            <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => deletePromotion(x.id)}>Delete</button>
                          )}
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
        const pids = selectedApp.productIds || []

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
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-black uppercase text-xs tracking-widest">
                    <FaStore /> Seller Information
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border">UID: {selectedApp.sellerId}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-lg">
                      {seller.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Full Name</div>
                      <div className="text-sm font-bold text-gray-900 leading-tight">{seller.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                      <FaInfoCircle />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Contact Email</div>
                      <div className="text-sm font-bold text-gray-900 truncate leading-tight">{seller.email}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed flex justify-end">
                  <a href={`/superadmin?search=${seller.email}`} className="text-[10px] font-black text-emerald-600 hover:underline uppercase">View Full Profile In SuperAdmin →</a>
                </div>
              </div>

              {/* Product Info */}
              <div>
                <div className="flex items-center gap-2 text-indigo-800 font-bold mb-4">
                  <FaBox /> Promotional Products ({pids.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pids.map(pid => {
                    const p = productsMap.get(pid)
                    if (!p) return <div key={pid} className="p-4 border rounded-xl text-xs text-gray-400 bg-gray-50 flex items-center justify-center">Loading Product #{pid}...</div>

                    const image = resolveImageUrl(p?.coverImage || p?.image)
                    return (
                      <div key={pid} className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                        <div className="relative h-40 bg-gray-50 overflow-hidden">
                          <img
                            src={image}
                            alt={p?.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow z-10">
                            #{pid}
                          </div>
                          {p?.discountPercentage > 0 && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow z-10">
                              -{p.discountPercentage}%
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="text-sm font-bold text-gray-900 truncate mb-1">{p?.name || `Product #${pid}`}</h4>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-blue-800">{formatPrice(p?.discountPrice || p?.displayPrice || p?.price || 0)}</span>
                              {(p?.discountPrice || (p.discountPercentage > 0)) && (
                                <span className="text-[10px] text-gray-400 line-through">{formatPrice(p?.displayPrice || p?.price || 0)}</span>
                              )}
                            </div>
                            <a href={`/product/${pid}`} target="_blank" rel="noreferrer" className="px-2 py-1 bg-gray-50 rounded text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors uppercase tracking-tighter">Details →</a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Payment Proof Preview if available */}
              {selectedApp.paymentProofUrl && (
                <div className="p-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl">
                  <div className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FaMoneyBillWave /> Payment Proof Submitted
                  </div>
                  <a href={resolveFileUrl(selectedApp.paymentProofUrl)} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-emerald-100 shadow-sm bg-white">
                    <img
                      src={resolveFileUrl(selectedApp.paymentProofUrl)}
                      alt="Proof"
                      className="max-h-48 w-full object-contain p-2"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/600x400?text=Payment+Proof+Image';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all">
                      <span className="bg-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase">Click to View Original</span>
                    </div>
                  </a>
                </div>
              )}

              {/* Application Details */}
              <div className="grid grid-cols-2 gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div>
                  <div className="flex items-center gap-2 text-blue-700 font-bold mb-2">
                    <FaClock /> Schedule Details
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Duration: <span className="font-medium">{selectedApp.durationDays} days</span></div>
                    <div>Requested Slots: <span className="font-medium">{selectedApp.slotsCount}</span></div>
                    <div>Current Status: <span className="font-medium uppercase tracking-wider text-xs bg-white px-2 py-0.5 rounded border">{selectedApp.status}</span></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-blue-700 font-bold mb-2">
                    <FaMoneyBillWave /> Financials
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Total Amount: <span className="font-bold text-lg text-blue-900">KES {selectedApp.amount}</span></div>
                    <div>Payment Status: <span className="font-medium underline decoration-blue-200">{selectedApp.paymentStatus}</span></div>
                  </div>
                  {selectedApp.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => markPaid(selectedApp.id)}
                      className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-black shadow-sm flex items-center gap-2 transition-all active:scale-95"
                    >
                      <FaCheckCircle /> Mark as Received (Manual)
                    </button>
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div className="pt-4 border-t">
                {modalAction === 'approve' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Banner Heading</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                          placeholder="e.g. UNIVERSITY DEALS"
                          value={promoTitle}
                          onChange={e => setPromoTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Featured Statement</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          placeholder="e.g. Get the best deals on university essentials"
                          value={promoSubtitle}
                          onChange={e => setPromoSubtitle(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Select Live Start Date & Time</label>
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="datetime-local"
                          className="w-full pl-10 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={startAt}
                          onChange={e => setStartAt(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Promotion will end automatically after {selectedApp.durationDays} days.</p>
                    </div>
                    <button
                      disabled={actionLoading}
                      onClick={handleModalAction}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      {actionLoading ? 'Processing...' : <><FaCheckCircle /> Approve & Go Live</>}
                    </button>
                  </div>
                )}

                {modalAction === 'status' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Select New Status</label>
                      <select
                        className="w-full p-2 border rounded-lg outline-none"
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                      >
                        <option value="pending_payment">Pending Payment</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused (keep in Current)</option>
                        <option value="expired">Expired</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Reason / Notes (Sent to Seller)</label>
                      <textarea
                        className="w-full p-2 border rounded-lg h-24 outline-none"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Explain the reason for rejection or status change..."
                      />
                    </div>
                    <button
                      disabled={actionLoading}
                      onClick={handleModalAction}
                      className="w-full py-3 bg-gray-800 hover:bg-black text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      {actionLoading ? 'Updating...' : <><FaInfoCircle /> Update status</>}
                    </button>
                  </div>
                )}

                {modalAction === 'refund' && (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-sm text-orange-800">
                      <strong>Note:</strong> Refund should be processed on M-Pesa manually. This action marks it as refunded in the system and notifies the seller.
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Refund Internal Reference / Note</label>
                      <textarea
                        className="w-full p-2 border rounded-lg h-24 outline-none"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Enter transaction code or refund details..."
                      />
                    </div>
                    <button
                      disabled={actionLoading}
                      onClick={handleModalAction}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      {actionLoading ? 'Processing...' : <><FaMoneyBillWave /> Confirm System Refund</>}
                    </button>
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
