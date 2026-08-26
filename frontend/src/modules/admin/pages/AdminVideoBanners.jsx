import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/shared/services/api'
import { uploadFile } from '@/shared/services/upload'
import Modal from '@/shared/components/Modal'
import { FaStore, FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaCalendarAlt, FaMoneyBillWave, FaStopCircle, FaCog, FaPlay, FaEdit, FaTrash } from 'react-icons/fa'
import { resolveImageUrl } from '@/utils/imageUtils'

export default function AdminVideoBanners() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [me, setMe] = useState(null)
  const [usersMap, setUsersMap] = useState(new Map())
  const [selectedBanner, setSelectedBanner] = useState(null)
  const [modalAction, setModalAction] = useState(null) // 'edit' | 'status' | 'delete'
  const [newStatus, setNewStatus] = useState('')
  const [startAt, setStartAt] = useState('')
  const [notes, setNotes] = useState('')
  const [promoTitle, setPromoTitle] = useState('')
  const [promoSubtitle, setPromoSubtitle] = useState('')
  const [trustPoints, setTrustPoints] = useState([])
  const [actionLoading, setActionLoading] = useState(false)

  // Resolve backend file URLs
  const fileBase = useMemo(() => {
    const base = api.defaults.baseURL || ''
    return base.replace(/\/?api\/?$/, '')
  }, [])

  const resolveFileUrl = (url) => {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    return `${fileBase}/${String(url).replace(/^\/+/, '')}`
  }

  const load = () => {
    setLoading(true)
    api.get('/admin/hero-promotions/applications')
      .then(r => {
        const { items: allItems = [], users: newUsers = [] } = r.data
        // Filter only video banners (those with videoUrl)
        const videoBanners = allItems.filter(item => item.videoUrl)
        setItems(videoBanners)

        // Merge enriched data into maps
        setUsersMap(prev => {
          const next = new Map(prev)
          newUsers.forEach(u => next.set(u.id, u))
          return next
        })
      })
      .catch(e => setError(e?.response?.data?.error || 'Failed to load video banners'))
      .finally(() => setLoading(false))
  }

  const openEditModal = (banner) => {
    // Navigate to edit page with banner ID
    navigate(`/dashboard/marketing/video-banners/edit/${banner.id}`)
  }

  const openStatusModal = (banner) => {
    setSelectedBanner(banner)
    setModalAction('status')
    setNewStatus(banner.status)
    setNotes('')
  }

  const openDeleteModal = (banner) => {
    setSelectedBanner(banner)
    setModalAction('delete')
  }

  const handleModalAction = async () => {
    if (!selectedBanner || !modalAction) return
    try {
      setActionLoading(true)
      if (modalAction === 'edit') {
        const body = {
          title: promoTitle,
          subtitle: promoSubtitle,
          trustPoints: trustPoints
        }
        if (startAt) body.startAt = new Date(startAt)
        await api.post(`/admin/hero-promotions/applications/${selectedBanner.id}/approve`, body)
      } else if (modalAction === 'status') {
        await api.patch(`/admin/hero-promotions/applications/${selectedBanner.id}/status`, { status: newStatus, notes })
      } else if (modalAction === 'delete') {
        await api.delete(`/admin/hero-promotions/manage/${selectedBanner.id}`)
      }
      setSelectedBanner(null)
      setModalAction(null)
      load()
    } catch (e) {
      alert(e?.response?.data?.error || e.message)
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    load()
    api.get('/auth/me').then(r => setMe(r.data)).catch(() => { })
    api.get('/admin/users')
      .then(r => {
        const m = new Map()
        const usersArray = Array.isArray(r.data) ? r.data : (r.data?.users || [])
        usersArray.forEach(u => m.set(u.id, u))
        setUsersMap(prev => new Map([...prev, ...m]))
      })
      .catch(() => { })
  }, [])

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button className="px-3 py-1 bg-gray-200 rounded flex-shrink-0" onClick={() => window.history.back()}>← Back</button>
          <h2 className="text-base sm:text-lg font-semibold truncate">Video Banner Management</h2>
        </div>
        {(['super_admin', 'superadmin', 'admin'].includes(me?.role) || me?.roles?.some(r => ['super_admin', 'superadmin', 'admin'].includes(r))) && (
          <Link
            to="/dashboard/marketing/video-banners/create"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-800 text-white rounded-xl text-sm font-black shadow-lg shadow-purple-100 hover:shadow-purple-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Create Video Banner
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading video banners...</span>
        </div>
      ) : (
        <>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          {(() => {
            const isHistory = (x) => x.paymentStatus === 'refunded' || ['expired', 'cancelled', 'rejected'].includes(x.status)
            const isCurrent = (x) => !isHistory(x) || x.paymentStatus === 'refund_requested'
            const currentItems = (items || []).filter(isCurrent)
            const historyItems = (items || []).filter(isHistory)

            return (
              <>
                <h3 className="text-base font-semibold mb-2">Current Video Banners</h3>
                <div className="grid gap-4 mb-6">
                  {currentItems.map(x => (
                    <div key={x.id} className={`rounded-xl border-2 transition-all shadow-sm bg-white overflow-hidden ${x.isSystem ? 'border-purple-100 ring-4 ring-purple-50/50' : 'border-gray-100'}`}>
                      {/* Mobile action strip */}
                      <div className="flex flex-wrap gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 md:hidden">
                        <button className="flex-1 min-w-[90px] px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-sm active:scale-95" onClick={() => openEditModal(x)}>Edit</button>
                        <button className="flex-1 min-w-[70px] px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold" onClick={() => openStatusModal(x)}>Status</button>
                        {x.status === 'active' && (
                          <button className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-black flex items-center gap-1" onClick={() => {
                            if (window.confirm('Pause this video banner?')) {
                              api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'paused', notes: 'Manually paused by admin' }).then(() => load())
                            }
                          }}><FaStopCircle /> Pause</button>
                        )}
                        {x.status === 'paused' && (
                          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black flex items-center gap-1" onClick={() => {
                            api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'active', notes: 'Reactivated by admin' }).then(() => load())
                          }}><FaCheckCircle /> Activate</button>
                        )}
                        <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-black flex items-center gap-1" onClick={() => openDeleteModal(x)}>
                          <FaTrash /> Delete
                        </button>
                      </div>

                      <div className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Video Preview */}
                          <div className="w-full md:w-32 h-28 sm:h-32 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden flex-shrink-0 border border-purple-200 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-4xl mb-1"><FaPlay className="inline text-purple-600" /></div>
                              <div className="text-[10px] font-bold text-purple-700">Video Banner</div>
                              <div className="text-[9px] text-purple-500 mt-1">{x.videoType || 'background'}</div>
                            </div>
                          </div>

                          <div className="flex-grow space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded tracking-widest uppercase">ID: {x.id}</span>
                              {x.isSystem && <span className="text-[10px] font-black bg-purple-600 text-white px-2 py-0.5 rounded uppercase flex items-center gap-1"><FaCog /> System</span>}
                            </div>

                            <div className="text-sm">
                              <span className="font-bold text-gray-500 mr-1 uppercase text-[10px] tracking-wider">Owner:</span>
                              {x.isSystem ? (
                                <span className="font-bold text-purple-700 italic">Platform-Wide Banner</span>
                              ) : (
                                <span className="font-bold text-gray-900 text-xs">
                                  {usersMap.has(x.sellerId) ? (
                                    <a href="/superadmin" className="text-blue-700 underline">
                                      {usersMap.get(x.sellerId)?.name || 'Unknown'}
                                    </a>
                                  ) : `User #${x.sellerId}`}
                                </span>
                              )}
                            </div>

                            <div className="text-xs flex flex-wrap gap-x-2 gap-y-0.5">
                              <span><span className="font-bold text-gray-400 uppercase text-[9px]">Status: </span><span className="font-black text-gray-900 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{x.status}</span></span>
                              <span><span className="font-bold text-gray-400 uppercase text-[9px]">Payment: </span><span className="font-bold text-emerald-600">{x.paymentStatus}</span></span>
                            </div>

                            <div className="text-xs">
                              <span className="font-bold text-gray-400 uppercase text-[9px] mr-1">Video:</span>
                              <div className="text-purple-700 font-medium mt-1">
                                {x.videoUrl ? (
                                  <div className="space-y-1">
                                    <div className="truncate max-w-[300px]" title={x.videoUrl}>
                                      📹 {x.videoUrl.split('/').pop()}
                                    </div>
                                    {x.title && (
                                      <div className="text-gray-600 text-[10px]">
                                        <strong>Title:</strong> {x.title}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-red-500">No video</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Desktop-only action column */}
                          <div className="hidden md:flex flex-col gap-2 w-44 flex-shrink-0">
                            <button className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1" onClick={() => openEditModal(x)}><FaEdit /> Edit Details</button>
                            <button className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all" onClick={() => openStatusModal(x)}>Set Status</button>
                            {x.status === 'active' && (
                              <button className="w-full px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-black flex items-center justify-center gap-1" onClick={() => {
                                if (window.confirm('Pause this video banner?')) {
                                  api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'paused', notes: 'Manually paused by admin' }).then(() => load())
                                }
                              }}><FaStopCircle /> Pause</button>
                            )}
                            {x.status === 'paused' && (
                              <button className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1 shadow-sm" onClick={() => {
                                api.patch(`/admin/hero-promotions/applications/${x.id}/status`, { status: 'active', notes: 'Reactivated by admin' }).then(() => load())
                              }}><FaCheckCircle /> Activate</button>
                            )}
                            <button className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1" onClick={() => openDeleteModal(x)}><FaTrash /> Delete Banner</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loading && currentItems.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FaPlay className="mx-auto text-5xl text-gray-300 mb-4" />
                      <p className="text-sm">No current video banners.</p>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-semibold mb-2">History</h3>
                <div className="grid gap-3">
                  {historyItems.map(x => (
                    <div key={x.id} className="card p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-sm font-bold">ID: {x.id}</div>
                          <div className="text-sm">Owner: {usersMap.get(x.sellerId)?.name || x.sellerId}</div>
                          <div className="text-sm">Status: <span className="font-medium">{x.status}</span> | Payment: {x.paymentStatus}</div>
                          <div className="text-sm">Video: {x.videoUrl}</div>
                          <div className="text-sm">Amount: KES {x.amount}</div>
                          {x.endAt && <div className="text-sm">Ended: {new Date(x.endAt).toLocaleString()}</div>}
                        </div>
                        <div className="flex flex-col gap-2">
                          {me?.role === 'super_admin' && (
                            <button className="px-3 py-1 bg-red-600 text-white rounded text-xs" onClick={() => openDeleteModal(x)}>Delete</button>
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

      {/* Modal for Edit/Status/Delete */}
      {selectedBanner && (
        <Modal
          isOpen={!!selectedBanner}
          onClose={() => setSelectedBanner(null)}
          title={
            modalAction === 'edit' ? 'Edit Video Banner' :
              modalAction === 'delete' ? 'Delete Video Banner' :
                'Update Video Banner Status'
          }
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {modalAction === 'edit' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Banner Heading</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold"
                      placeholder="e.g. SPECIAL ANNOUNCEMENT"
                      value={promoTitle}
                      onChange={e => setPromoTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                      placeholder="e.g. Check out our new video"
                      value={promoSubtitle}
                      onChange={e => setPromoSubtitle(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Date & Time</label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="datetime-local"
                      className="w-full pl-10 p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      value={startAt}
                      onChange={e => setStartAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-700 uppercase tracking-widest">Trust Markers</div>
                    <button
                      type="button"
                      className="text-xs font-black text-purple-600 hover:underline flex items-center gap-1"
                      onClick={() => setTrustPoints([...trustPoints, { icon: '✨', text: 'New Marker' }])}
                    >
                      + Add Marker
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {trustPoints.map((tp, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                        <input
                          className="w-10 text-center border-b outline-none focus:border-purple-500"
                          value={tp.icon}
                          onChange={e => {
                            const next = [...trustPoints];
                            next[idx].icon = e.target.value;
                            setTrustPoints(next);
                          }}
                        />
                        <input
                          className="flex-1 text-xs font-medium outline-none border-b focus:border-purple-500"
                          placeholder="Marker text..."
                          value={tp.text}
                          onChange={e => {
                            const next = [...trustPoints];
                            next[idx].text = e.target.value;
                            setTrustPoints(next);
                          }}
                        />
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => setTrustPoints(trustPoints.filter((_, i) => i !== idx))}
                        >
                          <FaTimesCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={actionLoading}
                  onClick={handleModalAction}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  {actionLoading ? 'Saving...' : <><FaCheckCircle /> Save Changes</>}
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
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Reason / Notes</label>
                  <textarea
                    className="w-full p-2 border rounded-lg h-24 outline-none"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Explain the reason..."
                  />
                </div>
                <button
                  disabled={actionLoading}
                  onClick={handleModalAction}
                  className="w-full py-3 bg-gray-800 hover:bg-black text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  {actionLoading ? 'Updating...' : <><FaInfoCircle /> Update Status</>}
                </button>
              </div>
            )}

            {modalAction === 'delete' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-sm text-red-800">
                  <strong>Warning:</strong> This action will permanently delete this video banner. This cannot be undone.
                </div>
                <button
                  disabled={actionLoading}
                  onClick={handleModalAction}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  {actionLoading ? 'Deleting...' : <><FaTrash /> Confirm Delete</>}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
