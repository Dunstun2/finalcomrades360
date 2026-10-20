import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/shared/services/api'
import { uploadFile } from '@/shared/services/upload'
import Modal from '@/shared/components/Modal'
import { FaStore, FaBox, FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaCalendarAlt, FaMoneyBillWave, FaStopCircle, FaCog, FaImage, FaLink, FaEdit, FaGlobe, FaTrash, FaChevronDown, FaPlayCircle, FaEllipsisH, FaSearch, FaFilter, FaVideo, FaUpload, FaEye, FaLayerGroup } from 'react-icons/fa'
import { resolveImageUrl } from '@/utils/imageUtils'
import { formatPrice } from '@/utils/currency'
import VideoBannerPreview from '@/modules/marketing/components/VideoBannerPreview'

export default function AdminHeroPromotions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingId, setUploadingId] = useState(null)
  const [me, setMe] = useState(null)
  const [usersMap, setUsersMap] = useState(new Map())
  const [productsMap, setProductsMap] = useState(new Map())
  const [rates, setRates] = useState({
    perDay: 500,
    perProduct: 100,
    videoSurcharge: 150,
    discount7d: 10,
    discount14d: 15,
    discount30d: 25,
    paymentType: 'till',
    paymentTill: '123456',
    paymentTillName: 'Comrades360',
    paymentPaybill: '247247',
    paymentPaybillAcc: '',
    paymentAccountRef: 'HERO-{id}',
    paymentPhone: '',
    paymentPhoneName: '',
    instructions: ''
  })
  const [editingRates, setEditingRates] = useState(false)
  const [savingRates, setSavingRates] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [modalAction, setModalAction] = useState(null) // 'approve' | 'status' | 'refund'
  const [newStatus, setNewStatus] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [notes, setNotes] = useState('')
  const [promoTitle, setPromoTitle] = useState('')
  const [promoSubtitle, setPromoSubtitle] = useState('')
  const [promoEyebrow, setPromoEyebrow] = useState('')
  const [promoCtaText, setPromoCtaText] = useState('')
  const [promoTargetUrl, setPromoTargetUrl] = useState('')
  const [promoBannerLocation, setPromoBannerLocation] = useState(['homepage'])
  const [promoFallbackLocation, setPromoFallbackLocation] = useState(['homepage'])
  const [trustPoints, setTrustPoints] = useState([])
  const [promoCustomImageUrl, setPromoCustomImageUrl] = useState('')
  const [promoVideoUrl, setPromoVideoUrl] = useState('')
  const [promoVideoType, setPromoVideoType] = useState('background')
  const [promoMediaMode, setPromoMediaMode] = useState('image')
  const [promoIsDefault, setPromoIsDefault] = useState(false)
  const [promoDurationDays, setPromoDurationDays] = useState(7)
  const [promoSlotsCount, setPromoSlotsCount] = useState(1)
  const [promoStatus, setPromoStatus] = useState('active')
  const [promoAmount, setPromoAmount] = useState(0)
  const [promoPaymentStatus, setPromoPaymentStatus] = useState('paid')
  const [promoIsFree, setPromoIsFree] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [modalTab, setModalTab] = useState('content') // 'content' | 'media' | 'schedule' | 'payment' | 'seller'
  const [actionLoading, setActionLoading] = useState(false)
  const [modalDropdownOpen, setModalDropdownOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'active' | 'paused' | 'pending' | 'system'
  const [searchQuery, setSearchQuery] = useState('')

  // Determine if banner is genuinely free (admin banners are NOT automatically free)
  const isPromoFree = (item) => {
    if (!item) return false
    if (item.free === true) return true
    if (item.paymentStatus === 'free' || item.paymentStatus === 'waived') return true
    if (item.amount !== undefined && item.amount !== null && Number(item.amount) === 0) return true
    return false
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.modal-actions-dropdown-container')) {
        setModalDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleModalImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingImage(true)
      const url = await uploadFile(file)
      setPromoCustomImageUrl(url)
      setPromoMediaMode('image')
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const togglePromotionPause = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active'
    const confirmMsg = currentStatus === 'active'
      ? 'Pause this promotion? It will be temporarily removed from rotation.'
      : 'Activate this promotion? It will go live immediately.'
    if (!window.confirm(confirmMsg)) return
    try {
      await api.patch(`/admin/hero-promotions/applications/${id}/status`, {
        status: nextStatus,
        notes: `Status changed to ${nextStatus} by admin`
      })
      load()
    } catch (e) {
      alert(e?.response?.data?.error || e.message)
    }
  }

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
        const { items: allItems = [], users: newUsers = [], products: newProducts = [] } = r.data
        // Show all hero promotions including video and product banners
        setItems(allItems)

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

  const deletePromotion = async (target) => {
    const x = typeof target === 'object' ? target : items.find(i => i.id === Number(target))
    const id = typeof target === 'object' ? target.id : target
    if (x?.isDefault) {
      alert('⚠️ Cannot delete a default banner.\n\nThis banner is currently configured as a "Default Fallback".\n\nTo delete it:\n1. Click "Manage / Review" (or "Edit Banner").\n2. Turn OFF the "Default Fallback" switch.\n3. Save your changes.\n4. Click Delete.')
      return
    }
    const label = x?.title ? `"${x.title}" (#${id})` : `#${id}`
    if (!window.confirm(`Are you sure you want to permanently delete banner ${label}?`)) return
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
      if (r.data) setRates(prev => ({ ...prev, ...r.data }))
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
    const startDate = app.startAt ? new Date(app.startAt) : new Date()
    const endDate = app.endAt ? new Date(app.endAt) : new Date(startDate.getTime() + (Number(app.durationDays) || 7) * 86400000)
    setStartAt(startDate.toISOString().slice(0, 16))
    setEndAt(endDate.toISOString().slice(0, 16))
    setNotes(app.notes || '')
    setPromoTitle(app.title || '')
    setPromoSubtitle(app.subtitle || '')
    setPromoEyebrow(app.eyebrow || app.promoBadge || app.badge || '')
    setPromoCtaText(app.ctaText || app.buttonText || '')
    setPromoTargetUrl(app.targetUrl || app.link || '')
    setPromoCustomImageUrl(app.customImageUrl || '')
    setPromoVideoUrl(app.videoUrl || '')
    setPromoVideoType(app.videoType || 'background')
    setPromoMediaMode(app.mediaMode || (app.videoUrl ? 'video' : 'image'))
    setPromoIsDefault(!!app.isDefault)
    setPromoDurationDays(app.durationDays || 7)
    setPromoSlotsCount(app.slotsCount || 1)
    setPromoStatus(app.status || 'active')
    const freeCheck = isPromoFree(app)
    setPromoIsFree(freeCheck)
    setPromoAmount(app.amount !== undefined ? Number(app.amount) : 0)
    setPromoPaymentStatus(freeCheck ? 'free' : (app.paymentStatus || 'unpaid'))
    setModalTab('content')
    const rawLoc = app.bannerLocation
    let parsedLoc = ['homepage']
    if (Array.isArray(rawLoc)) parsedLoc = rawLoc
    else if (typeof rawLoc === 'string') {
      try {
        const parsed = JSON.parse(rawLoc)
        if (Array.isArray(parsed)) parsedLoc = parsed
        else parsedLoc = [rawLoc]
      } catch {
        parsedLoc = rawLoc.includes(',') ? rawLoc.split(',').map(s => s.trim()) : [rawLoc || 'homepage']
      }
    }
    setPromoBannerLocation(parsedLoc)
    const rawFallbackLoc = app.fallbackLocation || app.bannerLocation
    let parsedFallbackLoc = ['homepage']
    if (Array.isArray(rawFallbackLoc)) parsedFallbackLoc = rawFallbackLoc
    else if (typeof rawFallbackLoc === 'string') {
      try {
        const parsed = JSON.parse(rawFallbackLoc)
        if (Array.isArray(parsed)) parsedFallbackLoc = parsed
        else parsedFallbackLoc = [rawFallbackLoc]
      } catch {
        parsedFallbackLoc = rawFallbackLoc.includes(',') ? rawFallbackLoc.split(',').map(s => s.trim()) : [rawFallbackLoc || 'homepage']
      }
    }
    setPromoFallbackLocation(parsedFallbackLoc)
    setTrustPoints(Array.isArray(app.trustPoints) ? app.trustPoints.slice(0, 3) : [])
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
          subtitle: promoSubtitle,
          eyebrow: promoEyebrow,
          promoBadge: promoEyebrow,
          ctaText: promoCtaText,
          buttonText: promoCtaText,
          targetUrl: promoTargetUrl,
          link: promoTargetUrl,
          bannerLocation: promoBannerLocation,
          trustPoints: trustPoints,
          customImageUrl: promoCustomImageUrl,
          videoUrl: promoVideoUrl,
          videoType: promoVideoType,
          mediaMode: promoMediaMode,
          isDefault: promoIsDefault,
          fallbackLocation: promoIsDefault ? promoFallbackLocation : null,
          durationDays: Number(promoDurationDays) || 7,
          slotsCount: Number(promoSlotsCount) || 1,
          status: promoStatus,
          amount: promoIsFree ? 0 : Number(promoAmount),
          free: promoIsFree,
          paymentStatus: promoIsFree ? 'free' : promoPaymentStatus,
          isSystem: selectedApp.isSystem,
          notes: notes
        }
        if (startAt) body.startAt = new Date(startAt)
        if (endAt) body.endAt = new Date(endAt)

        // If pending review or payment and admin is approving:
        if (['pending_payment', 'under_review'].includes(selectedApp.status)) {
          await api.post(`/admin/hero-promotions/applications/${selectedApp.id}/approve`, body)
        } else {
          // Already live, scheduled or system banner: update with direct manage PATCH
          await api.patch(`/admin/hero-promotions/manage/${selectedApp.id}`, body)
        }
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

  // --- Auto-generate payment instructions from active channel details ---
  const generateInstructions = (nextRates) => {
    const r = nextRates || rates
    const type = r.paymentType || 'till'
    if (type === 'paybill') {
      const biz = r.paymentPaybill || 'XXXXXX'
      const acc = r.paymentPaybillAcc || (r.paymentAccountRef || 'HERO-{id}')
      return `Lipa na M-Pesa > Paybill > Business No: ${biz} > Account No: ${acc}. After payment, screenshot the M-Pesa confirmation SMS and upload it below.`
    } else if (type === 'send_money') {
      const phone = r.paymentPhone || '07XXXXXXXX'
      const name = r.paymentPhoneName ? ` (${r.paymentPhoneName})` : ''
      return `Lipa na M-Pesa > Send Money > Phone: ${phone}${name}. After payment, screenshot the M-Pesa confirmation SMS and upload it below.`
    } else {
      const till = r.paymentTill || 'XXXXXX'
      const store = r.paymentTillName ? ` (${r.paymentTillName})` : ''
      return `Lipa na M-Pesa > Buy Goods and Services > Till No: ${till}${store}. After payment, screenshot the M-Pesa confirmation SMS and upload it below.`
    }
  }

  const saveSettings = async () => {
    try {
      setSavingRates(true)

      // Parse a field: return the number as-is (including 0) if valid, else the current stored value
      const n = (val, fallback) => {
        const parsed = parseFloat(String(val).trim())
        return Number.isFinite(parsed) ? parsed : (fallback ?? 0)
      }

      const payload = {
        perDay:         n(rates.perDay,         rates.perDay),
        perProduct:     n(rates.perProduct,     rates.perProduct),
        videoSurcharge: n(rates.videoSurcharge, rates.videoSurcharge),
        discount7d:     n(rates.discount7d,     rates.discount7d),
        discount14d:    n(rates.discount14d,    rates.discount14d),
        discount30d:    n(rates.discount30d,    rates.discount30d),
        paymentType:    rates.paymentType || 'till',
        paymentTill:    rates.paymentTill    || '',
        paymentTillName:    rates.paymentTillName    || '',
        paymentPaybill:     rates.paymentPaybill     || '',
        paymentPaybillAcc:  rates.paymentPaybillAcc  || '',
        paymentAccountRef:  rates.paymentAccountRef  || 'HERO-{id}',
        paymentPhone:       rates.paymentPhone       || '',
        paymentPhoneName:   rates.paymentPhoneName   || '',
        instructions:       rates.instructions       || ''
      }
      const res = await api.patch('/admin/hero-promotions/settings', payload)
      if (res.data?.rates) setRates(prev => ({ ...prev, ...res.data.rates }))
      setEditingRates(false)
      alert('Settings saved successfully!')
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
        {/* Check for all admin role variations for consistent access */}
        {(['super_admin', 'superadmin', 'admin'].includes(me?.role) || me?.roles?.some(r => ['super_admin', 'superadmin', 'admin'].includes(r))) && (
          <Link
            to="/dashboard/marketing/hero-promotions/create"
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Create Promotion
          </Link>
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

          <div className="mb-6 p-4 sm:p-5 border border-slate-200 rounded-2xl shadow-sm bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>💳</span> Promotion Pricing & M-Pesa Settings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure base daily rates, format surcharges, duration volume discounts, and payment instructions</p>
              </div>
              {!editingRates ? (
                <button
                  type="button"
                  onClick={() => setEditingRates(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FaEdit /> Edit Rates & Settings
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingRates}
                    onClick={() => setEditingRates(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingRates}
                    onClick={saveSettings}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingRates ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {!editingRates ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Daily Rates */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-black text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <span>⚡</span> Daily Rates & Formats
                  </div>
                  <div className="text-slate-800 flex justify-between">
                    <span>Base Banner:</span>
                    <span className="font-bold text-slate-900">KES {rates.perDay ?? 500}/day</span>
                  </div>
                  <div className="text-slate-800 flex justify-between">
                    <span>Product Add-on:</span>
                    <span className="font-bold text-slate-900">+KES {rates.perProduct ?? 100}/item/day</span>
                  </div>
                  <div className="text-slate-800 flex justify-between text-purple-700">
                    <span>Video Surcharge:</span>
                    <span className="font-bold">+KES {rates.videoSurcharge ?? 150}/day</span>
                  </div>
                </div>

                {/* Duration Discounts */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="font-black text-emerald-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <span>🎉</span> Commitment Discounts
                  </div>
                  <div className="text-emerald-900 flex justify-between">
                    <span>7+ Days:</span>
                    <span className="font-black text-emerald-700">{rates.discount7d ?? 10}% OFF</span>
                  </div>
                  <div className="text-emerald-900 flex justify-between">
                    <span>14+ Days:</span>
                    <span className="font-black text-emerald-700">{rates.discount14d ?? 15}% OFF</span>
                  </div>
                  <div className="text-emerald-900 flex justify-between">
                    <span>30+ Days (Monthly):</span>
                    <span className="font-black text-emerald-700">{rates.discount30d ?? 25}% OFF</span>
                  </div>
                </div>

                {/* M-Pesa Setup */}
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1.5">
                  <div className="font-black text-indigo-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <span>📱</span> M-Pesa Destination
                  </div>
                  <div className="text-indigo-950 font-bold text-xs space-y-0.5">
                    {rates.paymentType === 'paybill' ? (
                      <>
                        <div>Paybill Business No: <span className="font-black text-indigo-700">{rates.paymentPaybill || 'Not set'}</span></div>
                        <div>Account No: <span className="font-black text-indigo-700">{rates.paymentPaybillAcc || 'Not set'}</span></div>
                        {rates.paymentAccountRef && <div className="text-[10px] font-mono text-slate-500">Ref format: {rates.paymentAccountRef}</div>}
                      </>
                    ) : rates.paymentType === 'send_money' ? (
                      <>
                        <div>Send Money to: <span className="font-black text-indigo-700">{rates.paymentPhone || 'Not set'}</span></div>
                        {rates.paymentPhoneName && <div className="text-[10px] text-slate-500">Recipient: {rates.paymentPhoneName}</div>}
                      </>
                    ) : (
                      <div>Buy Goods Till: <span className="font-black text-indigo-700">{rates.paymentTill || '123456'}</span>{rates.paymentTillName && <span className="text-[10px] text-slate-500 ml-1">({rates.paymentTillName})</span>}</div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 italic line-clamp-2 mt-0.5">
                    {rates.instructions || 'No custom payment note set.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Block 1: Daily Rates & Video Add-on */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <span>1.</span> Daily Rates & Media Surcharges
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Base Daily Rate (KES)</label>
                      <input
                        type="number"
                        min="0"
                        value={rates.perDay}
                        onChange={e => setRates({ ...rates, perDay: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                        placeholder="500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Default fee per calendar day</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Product Slot / Day (KES)</label>
                      <input
                        type="number"
                        min="0"
                        value={rates.perProduct}
                        onChange={e => setRates({ ...rates, perProduct: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                        placeholder="100"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Added per tagged product per day</span>
                    </div>

                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                      <label className="block text-[11px] font-bold text-purple-900 uppercase mb-1">Video Surcharge / Day (KES)</label>
                      <input
                        type="number"
                        min="0"
                        value={rates.videoSurcharge ?? ''}
                        onChange={e => setRates({ ...rates, videoSurcharge: e.target.value })}
                        className="w-full p-2 border border-purple-300 rounded-lg text-xs font-bold bg-white"
                        placeholder="150"
                      />
                      <span className="text-[10px] text-purple-700 mt-1 block">Extra per day for video streaming banners</span>
                    </div>
                  </div>
                </div>

                {/* Block 2: Duration Commitment Discounts */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <span>2.</span> Duration Volume Discounts (% Off Total)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                      <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1">7+ Days Discount (%)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={rates.discount7d ?? ''}
                          onChange={e => setRates({ ...rates, discount7d: e.target.value })}
                          className="w-full p-2 border border-emerald-300 rounded-lg text-xs font-bold bg-white"
                          placeholder="10"
                        />
                        <span className="text-xs font-black text-emerald-800">%</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 mt-1 block">Incentivizes 1-week campaigns</span>
                    </div>

                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                      <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1">14+ Days Discount (%)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={rates.discount14d ?? ''}
                          onChange={e => setRates({ ...rates, discount14d: e.target.value })}
                          className="w-full p-2 border border-emerald-300 rounded-lg text-xs font-bold bg-white"
                          placeholder="15"
                        />
                        <span className="text-xs font-black text-emerald-800">%</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 mt-1 block">For 2-week continuous runs</span>
                    </div>

                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                      <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1">30+ Days Discount (%)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={rates.discount30d ?? ''}
                          onChange={e => setRates({ ...rates, discount30d: e.target.value })}
                          className="w-full p-2 border border-emerald-300 rounded-lg text-xs font-bold bg-white"
                          placeholder="25"
                        />
                        <span className="text-xs font-black text-emerald-800">%</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 mt-1 block">For monthly brand partnerships</span>
                    </div>
                  </div>
                </div>

                {/* Block 3: M-Pesa Setup */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <span>3.</span> M-Pesa Payment Channel & Reconciliation
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-xs font-bold text-slate-700">Payment Channel:</span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="paymentType"
                          value="till"
                          checked={rates.paymentType === 'till' || (!rates.paymentType)}
                          onChange={() => {
                            const next = { ...rates, paymentType: 'till' }
                            next.instructions = generateInstructions(next)
                            setRates(next)
                          }}
                          className="text-indigo-600"
                        />
                        Buy Goods Till
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="paymentType"
                          value="paybill"
                          checked={rates.paymentType === 'paybill'}
                          onChange={() => {
                            const next = { ...rates, paymentType: 'paybill' }
                            next.instructions = generateInstructions(next)
                            setRates(next)
                          }}
                          className="text-indigo-600"
                        />
                        Paybill
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="radio"
                          name="paymentType"
                          value="send_money"
                          checked={rates.paymentType === 'send_money'}
                          onChange={() => {
                            const next = { ...rates, paymentType: 'send_money' }
                            next.instructions = generateInstructions(next)
                            setRates(next)
                          }}
                          className="text-indigo-600"
                        />
                        Send Money
                      </label>
                    </div>

                    {/* ── Buy Goods Till ── */}
                    {rates.paymentType === 'till' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">M-Pesa Till Number</label>
                          <input
                            type="text"
                            value={rates.paymentTill || ''}
                            onChange={e => setRates({ ...rates, paymentTill: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            placeholder="e.g. 123456"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Till / Store Name</label>
                          <input
                            type="text"
                            value={rates.paymentTillName || ''}
                            onChange={e => setRates({ ...rates, paymentTillName: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            placeholder="e.g. Comrades360"
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Paybill ── */}
                    {rates.paymentType === 'paybill' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Paybill Business Number</label>
                          <input
                            type="text"
                            value={rates.paymentPaybill || ''}
                            onChange={e => setRates({ ...rates, paymentPaybill: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            placeholder="e.g. 247247"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Paybill / Business No.</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Account Number</label>
                          <input
                            type="text"
                            value={rates.paymentPaybillAcc || ''}
                            onChange={e => setRates({ ...rates, paymentPaybillAcc: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            placeholder="e.g. 01234567890"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Bank / customer account no.</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Account Reference Format</label>
                          <input
                            type="text"
                            value={rates.paymentAccountRef || 'HERO-{id}'}
                            onChange={e => setRates({ ...rates, paymentAccountRef: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            placeholder="e.g. HERO-{id}"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{`"{id}" is dynamically replaced with the promotion ID`}</span>
                        </div>
                      </div>
                    )}

                    {/* ── Send Money ── */}
                    {rates.paymentType === 'send_money' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">M-Pesa Phone Number</label>
                          <input
                            type="text"
                            value={rates.paymentPhone || ''}
                            onChange={e => setRates({ ...rates, paymentPhone: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            placeholder="e.g. 0712345678"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Safaricom registered number</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Recipient Name</label>
                          <input
                            type="text"
                            value={rates.paymentPhoneName || ''}
                            onChange={e => setRates({ ...rates, paymentPhoneName: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                            placeholder="e.g. Comrades360 Admin"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Name shown on M-Pesa</span>
                        </div>
                      </div>
                    )}

                    {/* Live preview box */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-950">
                      <span className="font-black uppercase tracking-wider text-[10px] text-indigo-700 block mb-1">Buyer Payment Prompt Preview:</span>
                      {rates.paymentType === 'paybill' ? (
                        <span>Lipa na M-Pesa &gt; Paybill &gt; Business No: <strong>{rates.paymentPaybill || 'XXXXXX'}</strong> &gt; Account No: <strong>{rates.paymentPaybillAcc || 'XXXXXXXXXXX'}</strong></span>
                      ) : rates.paymentType === 'send_money' ? (
                        <span>Lipa na M-Pesa &gt; Send Money &gt; Phone: <strong>{rates.paymentPhone || '07XXXXXXXX'}</strong>{rates.paymentPhoneName && <> &gt; <strong>{rates.paymentPhoneName}</strong></>}</span>
                      ) : (
                        <span>Lipa na M-Pesa &gt; Buy Goods and Services &gt; Till No: <strong>{rates.paymentTill || 'XXXXXX'}</strong>{rates.paymentTillName && <> ({rates.paymentTillName})</>}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Additional Instructions Note</label>
                        <button
                          type="button"
                          onClick={() => setRates({ ...rates, instructions: generateInstructions() })}
                          className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                          title="Re-generate note from current channel details"
                        >
                          ↺ Re-generate
                        </button>
                      </div>
                      <textarea
                        value={rates.instructions || ''}
                        onChange={e => setRates({ ...rates, instructions: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white h-16 resize-none"
                        placeholder="Auto-generated from payment channel details above — or type a custom note."
                      ></textarea>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-fills when you switch channels. Edit freely or click ↺ Re-generate to refresh.</span>
                    </div>
                  </div>
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

            const filteredCurrentItems = currentItems.filter(item => {
              if (filterStatus === 'active' && item.status !== 'active') return false
              if (filterStatus === 'paused' && item.status !== 'paused') return false
              if (filterStatus === 'pending' && !['pending_payment', 'submitted', 'review'].includes(item.status)) return false
              if (filterStatus === 'system' && !item.isSystem) return false
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const seller = usersMap.get(item.sellerId)
                const matchId = String(item.id).includes(q)
                const matchTitle = (item.title || '').toLowerCase().includes(q)
                const matchSeller = (seller?.name || '').toLowerCase().includes(q) || (seller?.email || '').toLowerCase().includes(q)
                if (!matchId && !matchTitle && !matchSeller) return false
              }
              return true
            })

            const counts = {
              all: currentItems.length,
              active: currentItems.filter(x => x.status === 'active').length,
              paused: currentItems.filter(x => x.status === 'paused').length,
              pending: currentItems.filter(x => ['pending_payment', 'submitted', 'review'].includes(x.status)).length,
              system: currentItems.filter(x => x.isSystem).length
            }

            return (
              <>
                {/* Search & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">Current Promotions</h3>
                    <span className="text-xs bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                      {filteredCurrentItems.length}{filteredCurrentItems.length !== currentItems.length ? ` of ${currentItems.length}` : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-64">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                      <input
                        type="text"
                        placeholder="Search ID, title, seller..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-bold">
                      {[
                        { key: 'all', label: 'All', count: counts.all },
                        { key: 'active', label: 'Active', count: counts.active },
                        { key: 'paused', label: 'Paused', count: counts.paused },
                        { key: 'pending', label: 'Pending', count: counts.pending },
                        { key: 'system', label: 'System', count: counts.system }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setFilterStatus(tab.key)}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            filterStatus === tab.key
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 mb-6">
                  {filteredCurrentItems.map(x => (
                    <div
                      key={x.id}
                      className={`rounded-xl border-2 transition-all shadow-sm bg-white relative ${
                        x.isSystem ? 'border-emerald-100 ring-4 ring-emerald-50/50' : 'border-gray-100'
                      }`}
                    >
                      {/* Mobile action strip — always visible at the very top on small screens */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 rounded-t-xl md:hidden">
                        <Link
                          to={`/dashboard/marketing/hero-promotions/edit/${x.id}`}
                          className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-black shadow-sm flex items-center justify-center gap-1 active:scale-95"
                        >
                          <FaEdit /> Edit
                        </Link>
                        <button
                          className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-sm active:scale-95 flex items-center justify-center gap-1"
                          onClick={() => openApproveModal(x)}
                        >
                          <FaCog /> Manage
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm active:scale-95 flex items-center justify-center gap-1 ${
                            x.isDefault
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white'
                          }`}
                          onClick={() => setDeleteTarget(x)}
                          title={x.isDefault ? 'Default banner options' : 'Delete banner'}
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>

                      <div className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Visual Preview */}
                          <div className="w-full md:w-36 h-28 sm:h-32 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-200 relative shadow-sm">
                            {x.videoUrl ? (
                              <VideoBannerPreview videoUrl={x.videoUrl} videoType={x.videoType} autoPlay={true} loop={true} muted={true} />
                            ) : x.customImageUrl ? (
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
                              {(() => {
                                const locs = Array.isArray(x.bannerLocation)
                                  ? x.bannerLocation
                                  : (x.bannerLocation ? [x.bannerLocation] : ['homepage'])
                                return locs.map(l => (
                                  <span key={l} className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded uppercase">
                                    📍 {l === 'all' ? 'All Pages' : l}
                                  </span>
                                ))
                              })()}
                              {x.videoUrl && <span className="text-[10px] font-black bg-purple-600 text-white px-2 py-0.5 rounded uppercase flex items-center gap-1">🎥 {x.videoType || 'video'}</span>}
                              {x.isSystem && <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded uppercase flex items-center gap-1"><FaCog /> System</span>}
                              {x.isDefault && (
                                <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-sm">
                                  <FaInfoCircle /> Fallback ({(Array.isArray(x.fallbackLocation) && x.fallbackLocation.length > 0 ? x.fallbackLocation : (Array.isArray(x.bannerLocation) ? x.bannerLocation : [x.bannerLocation || 'homepage'])).join(', ')})
                                </span>
                              )}
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
                              <span>
                                <span className="font-bold text-gray-400 uppercase text-[9px]">Payment: </span>
                                {isPromoFree(x) ? (
                                  <span className="font-black text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase text-[10px]">
                                    🎁 Free
                                  </span>
                                ) : (
                                  <span className={`font-bold uppercase ${
                                    x.paymentStatus === 'paid' ? 'text-emerald-600' :
                                    x.paymentStatus === 'refunded' ? 'text-rose-600' :
                                    'text-amber-600'
                                  }`}>
                                    {x.paymentStatus || 'unpaid'}
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="text-xs">
                              <span className="font-bold text-gray-400 uppercase text-[9px] mr-1">Content:</span>
                              {x.videoUrl ? (
                                <span className="text-purple-700 font-bold italic">Video ({x.videoType || 'video'})</span>
                              ) : x.customImageUrl ? (
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
                              {x.durationDays}d • {x.slotsCount} slots • {isPromoFree(x) ? 'FREE (KES 0)' : `KES ${x.amount}`}
                              {x.startAt && <span className="ml-1">• {new Date(x.startAt).toLocaleDateString()}</span>}
                            </div>

                            {/* Analytics counter */}
                            <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 w-fit">
                              <span>👁️ <span className="text-gray-900 font-black">{x.impressions || 0}</span> views</span>
                              <span>🖱️ <span className="text-gray-900 font-black">{x.clicks || 0}</span> clicks</span>
                              <span className="text-emerald-600 font-black">
                                CTR: {x.impressions > 0 ? ((x.clicks / x.impressions) * 100).toFixed(1) : '0.0'}%
                              </span>
                            </div>
                          </div>

                          {/* Desktop-only action column */}
                          <div className="hidden md:flex flex-col gap-2 w-36 flex-shrink-0">
                            <Link
                              to={`/dashboard/marketing/hero-promotions/edit/${x.id}`}
                              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black shadow-sm transition-all text-center flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <FaEdit /> Edit Banner
                            </Link>
                            <button
                              className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-sm transition-all text-center flex items-center justify-center gap-1.5 active:scale-95"
                              onClick={() => openApproveModal(x)}
                            >
                              <FaCog /> Manage / Review
                            </button>
                            <button
                              className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                x.isDefault
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600'
                              }`}
                              onClick={() => setDeleteTarget(x)}
                              title={x.isDefault ? 'Default banner (Locked)' : 'Delete banner'}
                            >
                              <FaTrash /> {x.isDefault ? 'Delete (Locked)' : 'Delete Banner'}
                            </button>
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
                  ))}
                  {!loading && currentItems.length === 0 && <div className="text-sm text-gray-500 py-6 text-center">No current applications.</div>}
                  {!loading && currentItems.length > 0 && filteredCurrentItems.length === 0 && (
                    <div className="text-sm text-gray-500 py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
                      No promotions found matching your filter or search query.
                    </div>
                  )}
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
                            <button className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition-colors" onClick={() => setDeleteTarget(x)}>Delete</button>
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
        const hasSellerOrProducts = Boolean(selectedApp.sellerId || pids.length > 0 || selectedApp.paymentProofUrl)

        const PRESET_BADGES = [
          { icon: '⚡', text: 'Fast Dispatch' },
          { icon: '🛡️', text: 'Verified Deal' },
          { icon: '⭐', text: 'Student Special' },
          { icon: '🚚', text: 'Campus Express' },
          { icon: '🔒', text: 'Secure Escrow' }
        ]

        return (
          <Modal
            isOpen={!!selectedApp}
            onClose={() => setSelectedApp(null)}
            title={
              modalAction === 'approve'
                ? (selectedApp.isSystem ? `Manage System Banner #${selectedApp.id}` : `Manage Promotion Banner #${selectedApp.id}`)
                : modalAction === 'refund'
                  ? 'Review Refund Request'
                  : 'Update Application Status'
            }
            maxWidth="max-w-4xl"
          >
            <div className="space-y-5">
              {/* Modal Top Action Toolbar with Quick Status, Free/Payment Badge, Expiry, & More Actions dropdown */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gray-900 text-white">
                    ID: {selectedApp.id}
                  </span>

                  {selectedApp.isSystem || !selectedApp.sellerId ? (
                    promoIsFree ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                        <span>🎁</span> Admin Banner (Free)
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm flex items-center gap-1">
                        <span>⚙️</span> Admin Banner (Commercial)
                      </span>
                    )
                  ) : (
                    promoIsFree ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-sm flex items-center gap-1">
                        <span>🎁</span> Seller Promo (Free Waiver)
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                        Seller Promo (Charged)
                      </span>
                    )
                  )}

                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedApp.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                    selectedApp.status === 'paused' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedApp.status.toUpperCase()}
                  </span>

                  {promoIsFree ? (
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                      FREE (KES 0)
                    </span>
                  ) : (
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                      promoPaymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {promoPaymentStatus === 'paid' ? `PAID (KES ${promoAmount})` : `UNPAID (KES ${promoAmount})`}
                    </span>
                  )}

                  {endAt && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1">
                      <FaClock className="text-slate-500 text-[10px]" />
                      <span>Expires: {new Date(endAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/marketing/hero-promotions/edit/${selectedApp.id}`}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <FaEdit /> Full Edit Form
                  </Link>

                  {/* More Actions Dropdown inside Modal */}
                  <div className="relative modal-actions-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setModalDropdownOpen(!modalDropdownOpen)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                        modalDropdownOpen
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                      }`}
                    >
                      <FaEllipsisH />
                      <span>More Actions</span>
                      <FaChevronDown className={`text-[9px] transition-transform ${modalDropdownOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                    </button>

                    {modalDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            setModalDropdownOpen(false)
                            setModalAction('status')
                            setNewStatus(selectedApp.status)
                            setNotes('')
                          }}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                        >
                          <FaInfoCircle className="text-blue-500" />
                          <span>Set Custom Status...</span>
                        </button>

                        {selectedApp.status === 'active' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              setModalDropdownOpen(false)
                              await togglePromotionPause(selectedApp.id, 'active')
                              setSelectedApp(prev => ({ ...prev, status: 'paused' }))
                              setPromoStatus('paused')
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                          >
                            <FaStopCircle className="text-amber-500" />
                            <span>Pause Banner</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              setModalDropdownOpen(false)
                              await togglePromotionPause(selectedApp.id, selectedApp.status)
                              setSelectedApp(prev => ({ ...prev, status: 'active' }))
                              setPromoStatus('active')
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                          >
                            <FaPlayCircle className="text-emerald-500" />
                            <span>Activate Banner</span>
                          </button>
                        )}

                        {selectedApp.paymentStatus === 'paid' && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalDropdownOpen(false)
                              setModalAction('refund')
                              setNotes('')
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-50 flex items-center gap-2 cursor-pointer"
                          >
                            <FaMoneyBillWave className="text-orange-500" />
                            <span>Process Refund...</span>
                          </button>
                        )}

                        {me?.role === 'super_admin' && (
                          <>
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              type="button"
                              onClick={async () => {
                                setModalDropdownOpen(false)
                                if (!window.confirm('Delete this hero promotion permanently?')) return
                                try {
                                  await api.delete(`/admin/hero-promotions/manage/${selectedApp.id}`)
                                  setSelectedApp(null)
                                  load()
                                } catch (e) {
                                  alert(e?.response?.data?.error || e.message)
                                }
                              }}
                              className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                            >
                              <FaTrash className="text-red-500" />
                              <span>Delete Permanently</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {modalAction !== 'approve' && (
                <button
                  type="button"
                  onClick={() => setModalAction('approve')}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 -mb-2 cursor-pointer"
                >
                  ← Back to Banner Management & Live Preview
                </button>
              )}

              {modalAction === 'approve' && (
                <>
                  {/* Live Interactive Banner Preview: Homepage 2-Column Layout */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl border border-slate-800 p-4 sm:p-5">
                    {/* Background Pattern and Lighting Effects */}
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#FF6600]/15 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />

                    {/* Top Row: Eyebrow + Live Preview Badge */}
                    <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {promoEyebrow ? (
                          <span className="inline-flex items-center gap-2 px-3.5 py-1 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/20 backdrop-blur-md text-amber-300 text-[11px] font-black rounded-full border border-amber-400/30 uppercase tracking-widest shadow-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                            </span>
                            <span>{promoEyebrow}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500 italic">No eyebrow pill set</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-300 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                        <FaEye className="text-emerald-400" />
                        <span className="font-bold">Live Preview</span>
                        {promoIsDefault && (
                          <span className="ml-1 text-amber-300 font-bold">• Default Fallback</span>
                        )}
                      </div>
                    </div>

                    {/* 2-Column Grid: Details Section (Left) & Media Section (Right) */}
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                      
                      {/* DETAIL SECTION (Left: 5 cols on desktop) */}
                      <div className="md:col-span-5 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5">
                          <h2 className="text-lg sm:text-2xl font-black leading-tight tracking-tight uppercase line-clamp-2">
                            <span className="bg-gradient-to-r from-[#FF6600] via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-md">
                              {promoTitle || <span className="opacity-40 italic text-white">Banner Heading</span>}
                            </span>
                          </h2>

                          {promoSubtitle ? (
                            <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
                              <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed line-clamp-3">
                                {promoSubtitle}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 text-slate-500 text-xs italic">
                              Add a featured statement or promotion description...
                            </div>
                          )}
                        </div>

                        <div className="space-y-2.5 pt-1">
                          {/* CTA Button & Target Link */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-600/30 border border-blue-400/40">
                              <span>{promoCtaText || 'Explore Options'}</span>
                              <span className="text-[10px]">→</span>
                            </div>
                            {promoTargetUrl && (
                              <span className="text-[11px] font-mono text-slate-300 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 truncate max-w-[170px]" title={promoTargetUrl}>
                                🔗 {promoTargetUrl}
                              </span>
                            )}
                          </div>

                          {/* Trust Badges */}
                          {trustPoints.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/10">
                              {trustPoints.map((tp, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/15 text-[10px] font-bold text-slate-200">
                                  <span>{tp.icon}</span>
                                  <span className="truncate max-w-[110px]">{tp.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* MEDIA SECTION (Right: 7 cols on desktop) */}
                      <div className="md:col-span-7 flex items-center justify-center min-h-[200px] sm:min-h-[240px]">
                        <div className="relative w-full h-full min-h-[200px] sm:min-h-[240px] rounded-2xl border border-white/15 bg-slate-950/80 shadow-2xl overflow-hidden flex items-center justify-center p-2">
                          {promoMediaMode === 'video' && promoVideoUrl ? (
                            <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-black">
                              <VideoBannerPreview videoUrl={promoVideoUrl} videoType={promoVideoType} isBackground={promoVideoType === 'background'} />
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-white/20">
                                VIDEO ({promoVideoType.toUpperCase()})
                              </div>
                            </div>
                          ) : promoCustomImageUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center p-3 bg-gradient-to-b from-white/5 to-white/0">
                              <img
                                src={resolveImageUrl(promoCustomImageUrl)}
                                alt="Banner Media"
                                className="max-h-56 max-w-full object-contain rounded-xl drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all hover:scale-105"
                                onError={(e) => {
                                  e.target.src = 'https://placehold.co/600x400?text=Preview+Image'
                                }}
                              />
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-white/20">
                                IMAGE
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500">
                              <FaImage className="text-3xl mb-2 text-slate-600" />
                              <span className="text-xs font-bold text-slate-400">No media attached</span>
                              <span className="text-[10px] text-slate-600 mt-0.5">Upload an image or set a video URL in Media tab</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Management Tabs */}
                  <div className="border-b border-gray-200 flex items-center gap-1 overflow-x-auto text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setModalTab('content')}
                      className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        modalTab === 'content'
                          ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <FaEdit />
                      <span>Content & Copy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalTab('media')}
                      className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        modalTab === 'media'
                          ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <FaImage />
                      <span>Media & Placement</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalTab('schedule')}
                      className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        modalTab === 'schedule'
                          ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <FaClock />
                      <span>Schedule & Lifecycle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalTab('payment')}
                      className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        modalTab === 'payment'
                          ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <FaMoneyBillWave />
                      <span>Billing & Payments</span>
                      {promoIsFree ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                          FREE
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${
                          promoPaymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          KES {promoAmount}
                        </span>
                      )}
                    </button>

                    {hasSellerOrProducts && (
                      <button
                        type="button"
                        onClick={() => setModalTab('seller')}
                        className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          modalTab === 'seller'
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <FaStore />
                        <span>Seller & Products ({pids.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Tab 1: Content & Copy */}
                  {modalTab === 'content' && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            Banner Heading <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            placeholder="e.g. UNIVERSITY DEALS or MARKETER RECRUITMENT"
                            value={promoTitle}
                            onChange={e => setPromoTitle(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            Eyebrow Pill / Badge
                          </label>
                          <input
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-semibold"
                            placeholder="e.g. 🔥 HOT OPPORTUNITY or VERIFIED SELLER"
                            value={promoEyebrow}
                            onChange={e => setPromoEyebrow(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                          Featured Statement / Subtitle
                        </label>
                        <textarea
                          rows={2}
                          className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          placeholder="e.g. Join our campus marketing ambassadors and earn commissions..."
                          value={promoSubtitle}
                          onChange={e => setPromoSubtitle(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            CTA Button Text
                          </label>
                          <input
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold"
                            placeholder="e.g. Apply Now, Shop Collection, Learn More"
                            value={promoCtaText}
                            onChange={e => setPromoCtaText(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            CTA Target Link URL
                          </label>
                          <input
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium font-mono"
                            placeholder="e.g. /products, /fastfood or https://..."
                            value={promoTargetUrl}
                            onChange={e => setPromoTargetUrl(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Trust & Speed Markers */}
                      <div className="pt-3 border-t border-dashed border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider text-gray-700">Trust & Speed Markers</span>
                            <span className="text-[11px] text-gray-400 font-medium ml-1">({trustPoints.length}/3)</span>
                          </div>
                          <button
                            type="button"
                            disabled={trustPoints.length >= 3}
                            className={`text-xs font-bold flex items-center gap-1 ${
                              trustPoints.length >= 3 ? 'text-gray-400 cursor-not-allowed' : 'text-emerald-600 hover:text-emerald-700 cursor-pointer'
                            }`}
                            onClick={() => {
                              if (trustPoints.length >= 3) return
                              setTrustPoints([...trustPoints, { icon: '✨', text: 'New Feature' }])
                            }}
                          >
                            + Add Custom Marker
                          </button>
                        </div>

                        {/* Presets suggestions */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presets:</span>
                          {PRESET_BADGES.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={trustPoints.length >= 3 || trustPoints.some(tp => tp.text === preset.text)}
                              onClick={() => {
                                if (trustPoints.length < 3) {
                                  setTrustPoints([...trustPoints, preset])
                                }
                              }}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {preset.icon} {preset.text}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          {trustPoints.map((tp, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <input
                                className="w-10 text-center border-b border-slate-300 bg-transparent outline-none focus:border-indigo-600 text-sm font-bold"
                                value={tp.icon}
                                onChange={e => {
                                  const next = [...trustPoints]
                                  next[idx].icon = e.target.value
                                  setTrustPoints(next)
                                }}
                              />
                              <input
                                className="flex-1 text-xs font-medium bg-transparent outline-none border-b border-slate-300 focus:border-indigo-600"
                                placeholder="Marker text..."
                                value={tp.text}
                                onChange={e => {
                                  const next = [...trustPoints]
                                  next[idx].text = e.target.value
                                  setTrustPoints(next)
                                }}
                              />
                              <button
                                type="button"
                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                onClick={() => setTrustPoints(trustPoints.filter((_, i) => i !== idx))}
                              >
                                <FaTimesCircle size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Media & Placement */}
                  {modalTab === 'media' && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                      {/* Media Mode Switch */}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                          Banner Media Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPromoMediaMode('image')}
                            className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              promoMediaMode === 'image'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                            }`}
                          >
                            <FaImage /> Image Background
                          </button>
                          <button
                            type="button"
                            onClick={() => setPromoMediaMode('video')}
                            className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              promoMediaMode === 'video'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                            }`}
                          >
                            <FaVideo /> Video Banner
                          </button>
                        </div>
                      </div>

                      {/* Image Controls */}
                      {promoMediaMode === 'image' && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Custom Banner Image</span>
                            {promoCustomImageUrl && (
                              <button
                                type="button"
                                onClick={() => setPromoCustomImageUrl('')}
                                className="text-[11px] font-bold text-red-600 hover:underline"
                              >
                                Remove Image
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 items-center">
                            {promoCustomImageUrl && (
                              <img
                                src={resolveImageUrl(promoCustomImageUrl)}
                                alt="Current"
                                className="w-24 h-16 object-cover rounded-lg border border-slate-300 shadow-sm shrink-0"
                              />
                            )}
                            <div className="flex-1 w-full space-y-2">
                              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer shadow-sm">
                                <FaUpload className="text-indigo-600" />
                                <span>{uploadingImage ? 'Uploading Image...' : 'Upload Image File'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleModalImageUpload}
                                  className="hidden"
                                  disabled={uploadingImage}
                                />
                              </label>
                              <input
                                type="text"
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                placeholder="Or paste image URL (https://... or /uploads/...)"
                                value={promoCustomImageUrl}
                                onChange={e => setPromoCustomImageUrl(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Video Controls */}
                      {promoMediaMode === 'video' && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700">Video Source & Presentation</span>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Video URL (MP4, YouTube, Vimeo)</label>
                            <input
                              type="text"
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                              placeholder="e.g. https://example.com/video.mp4 or YouTube link"
                              value={promoVideoUrl}
                              onChange={e => setPromoVideoUrl(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Video Presentation Mode</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { id: 'background', label: 'Background Loop' },
                                { id: 'overlay', label: 'Overlay Player' },
                                { id: 'embed', label: 'Embedded Card' }
                              ].map(vt => (
                                <button
                                  key={vt.id}
                                  type="button"
                                  onClick={() => setPromoVideoType(vt.id)}
                                  className={`p-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                                    promoVideoType === vt.id
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                  }`}
                                >
                                  {vt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Target Placement / Pages */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                          Target Placement & Display Pages
                        </label>
                        <p className="text-[11px] text-gray-500 mb-2">
                          Select the pages where this hero promotion should rotate and be visible:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'homepage', label: 'Homepage' },
                            { value: 'fastfood', label: 'Fast Food' },
                            { value: 'products', label: 'Products' },
                            { value: 'services', label: 'Services' },
                            { value: 'all', label: 'All Pages' }
                          ].map(item => {
                            const isSelected = Array.isArray(promoBannerLocation)
                              ? (item.value === 'all' ? promoBannerLocation.includes('all') : (promoBannerLocation.includes('all') || promoBannerLocation.includes(item.value)))
                              : promoBannerLocation === item.value
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  const curr = Array.isArray(promoBannerLocation) ? promoBannerLocation : [promoBannerLocation || 'homepage']
                                  if (item.value === 'all') {
                                    setPromoBannerLocation(curr.includes('all') ? ['homepage'] : ['all'])
                                  } else {
                                    let next = curr.filter(x => x !== 'all')
                                    if (next.includes(item.value)) {
                                      next = next.filter(x => x !== item.value)
                                      if (next.length === 0) next = ['homepage']
                                    } else {
                                      next = [...next, item.value]
                                      if (['homepage', 'fastfood', 'products', 'services'].every(p => next.includes(p))) {
                                        next = ['all']
                                      }
                                    }
                                    setPromoBannerLocation(next)
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                }`}
                              >
                                {isSelected ? '✓ ' : ''}{item.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Schedule & Settings */}
                  {modalTab === 'schedule' && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            Banner Status
                          </label>
                          <select
                            className="w-full p-2.5 border border-gray-300 rounded-lg outline-none text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                            value={promoStatus}
                            onChange={e => setPromoStatus(e.target.value)}
                          >
                            <option value="active">Active (Currently Live)</option>
                            <option value="paused">Paused (Temporarily Inactive)</option>
                            <option value="scheduled">Scheduled (Future Start)</option>
                            <option value="pending_payment">Pending Payment</option>
                            <option value="expired">Expired</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            Active Duration (Days)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold bg-white"
                            value={promoDurationDays}
                            onChange={e => {
                              const d = Number(e.target.value)
                              setPromoDurationDays(d)
                              if (startAt && d) {
                                const s = new Date(startAt)
                                const end = new Date(s.getTime() + d * 86400000)
                                setEndAt(end.toISOString().slice(0, 16))
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            Live Start Date & Time
                          </label>
                          <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                              type="datetime-local"
                              className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium bg-white"
                              value={startAt}
                              onChange={e => {
                                setStartAt(e.target.value)
                                if (e.target.value && promoDurationDays) {
                                  const s = new Date(e.target.value)
                                  const end = new Date(s.getTime() + promoDurationDays * 86400000)
                                  setEndAt(end.toISOString().slice(0, 16))
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
                            <span>Live Expiry Date & Time</span>
                            {endAt && (
                              <span className="text-[10px] text-indigo-600 font-bold lowercase">
                                {new Date(endAt) > new Date() ? 'active' : 'passed'}
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                              type="datetime-local"
                              className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium bg-white"
                              value={endAt}
                              onChange={e => setEndAt(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                            Concurrent Slots Weight
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold bg-white"
                            value={promoSlotsCount}
                            onChange={e => setPromoSlotsCount(Number(e.target.value))}
                          />
                        </div>

                        {/* Default Fallback Banner Toggle & Page Specification */}
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-black text-amber-900 uppercase tracking-wider">
                                Default Fallback
                              </div>
                              <div className="text-[10px] text-amber-700 font-medium">
                                Always displays when no paid promotions are running.
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={promoIsDefault}
                                onChange={e => setPromoIsDefault(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                            </label>
                          </div>

                          {promoIsDefault && (
                            <div className="pt-2 border-t border-amber-200 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-amber-900">
                                  Default Fallback on which Page(s)?
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-amber-700">Fallback:</span>
                                  {Array.isArray(promoFallbackLocation) && promoFallbackLocation.includes('all') ? (
                                    <span className="text-[10px] text-amber-800 font-black bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                      All Pages
                                    </span>
                                  ) : (
                                    (Array.isArray(promoFallbackLocation) ? promoFallbackLocation : [promoFallbackLocation || 'homepage']).map(loc => (
                                      <span key={loc} className="text-[10px] text-amber-800 font-black bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                                        {loc}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] text-amber-800">
                                Choose the page(s) where this banner will act as the default fallback when no ads are active (independent of Target Placement):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { value: 'homepage', label: '🏠 Homepage' },
                                  { value: 'fastfood', label: '🍔 Fast Food' },
                                  { value: 'products', label: '🛍️ Products' },
                                  { value: 'services', label: '🛠️ Services' },
                                  { value: 'all', label: '🌐 All Pages (Global)' },
                                ].map(item => {
                                  const curr = Array.isArray(promoFallbackLocation) ? promoFallbackLocation : [promoFallbackLocation || 'homepage']
                                  const isSelected = curr.includes('all') ? item.value === 'all' : curr.includes(item.value)
                                  return (
                                    <button
                                      key={item.value}
                                      type="button"
                                      onClick={() => {
                                        if (item.value === 'all') {
                                          setPromoFallbackLocation(curr.includes('all') ? ['homepage'] : ['all'])
                                        } else {
                                          let next = curr.filter(x => x !== 'all')
                                          if (next.includes(item.value)) {
                                            next = next.filter(x => x !== item.value)
                                            if (next.length === 0) next = ['homepage']
                                          } else {
                                            next = [...next, item.value]
                                            const allPages = ['homepage', 'fastfood', 'products', 'services']
                                            if (allPages.every(p => next.includes(p))) {
                                              next = ['all']
                                            }
                                          }
                                          setPromoFallbackLocation(next)
                                        }
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                          : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                                      }`}
                                    >
                                      {isSelected ? '✓ ' : ''}{item.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                          Admin Notes & Reference
                        </label>
                        <textarea
                          rows={2}
                          className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                          placeholder="Optional notes for internal tracking or seller feedback..."
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab: Billing & Payments */}
                  {modalTab === 'payment' && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                      {/* Admin Free Banner Callout */}
                      {promoIsFree ? (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-purple-500/15 border-2 border-purple-400/60 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">🎁</span>
                              <div>
                                <div className="text-sm font-black text-purple-950 uppercase tracking-wider flex items-center gap-2">
                                  <span>Free / Complimentary Banner</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-600 text-white">100% COMPLIMENTARY</span>
                                </div>
                                <p className="text-xs text-purple-800 font-medium mt-0.5">
                                  This banner is marked as free. Commercial charges are completely waived (KES 0.00). No seller billing or M-Pesa transaction is required.
                                </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right shrink-0 bg-white/60 sm:bg-transparent p-2 sm:p-0 rounded-xl border border-purple-200 sm:border-0">
                              <div className="text-[10px] font-black uppercase text-purple-700">Cost to Platform / Seller</div>
                              <div className="text-xl font-black text-purple-900">KES 0.00</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 border-2 border-blue-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-900 font-black text-sm uppercase tracking-wider">
                              <FaMoneyBillWave className="text-blue-600" /> Commercial Campaign Billing ({selectedApp.isSystem ? 'Admin Platform Sponsor' : 'Seller Paid'})
                            </div>
                            <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                              promoPaymentStatus === 'paid' ? 'bg-emerald-600 text-white shadow-sm' :
                              promoPaymentStatus === 'refunded' ? 'bg-orange-600 text-white shadow-sm' :
                              'bg-amber-500 text-white shadow-sm'
                            }`}>
                              {promoPaymentStatus.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Fee Waiver Switch for Admin */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Free Promotion (Waive all fees)
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Toggle on to make this banner 100% complimentary (sets billing amount to KES 0 and payment status to Free).
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={promoIsFree}
                            onChange={e => {
                              const free = e.target.checked
                              setPromoIsFree(free)
                              if (free) {
                                setPromoAmount(0)
                                setPromoPaymentStatus('free')
                              } else {
                                const calc = (Number(promoDurationDays) || 7) * (rates.perDay || 500) + pids.length * (rates.perProduct || 100)
                                const restoredAmount = Number(selectedApp.amount) > 0 ? selectedApp.amount : calc
                                setPromoAmount(restoredAmount)
                                setPromoPaymentStatus(selectedApp.paymentStatus === 'free' ? 'unpaid' : (selectedApp.paymentStatus || 'unpaid'))
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {/* Financial & Rates Breakdown */}
                      {(() => {
                        const days = Number(promoDurationDays) || 7
                        const numProducts = pids.length
                        const isVideo = Boolean(promoVideoUrl)
                        const perDay = Number(rates.perDay) || 500
                        const perProduct = Number(rates.perProduct) || 100
                        const videoSurcharge = Number(rates.videoSurcharge) || 150
                        const baseCost = days * perDay
                        const productCost = days * numProducts * perProduct
                        const videoCost = isVideo ? (days * videoSurcharge) : 0
                        const subtotal = baseCost + productCost + videoCost

                        let discountPercent = 0
                        if (days >= 30) discountPercent = Number(rates.discount30d) || 25
                        else if (days >= 14) discountPercent = Number(rates.discount14d) || 15
                        else if (days >= 7) discountPercent = Number(rates.discount7d) || 10

                        const discountAmount = Math.round(subtotal * (discountPercent / 100))
                        const autoTotal = Math.max(0, subtotal - discountAmount)

                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                              {/* Base */}
                              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Base Duration</span>
                                <div className="text-sm font-black text-slate-900 mt-0.5">
                                  {promoIsFree ? 'KES 0' : `KES ${baseCost}`}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {days}d × KES {perDay}/day
                                </div>
                              </div>

                              {/* Products */}
                              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Products Add-on</span>
                                <div className="text-sm font-black text-slate-900 mt-0.5">
                                  {promoIsFree ? 'KES 0' : `KES ${productCost}`}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {numProducts} items × {days}d × KES {perProduct}
                                </div>
                              </div>

                              {/* Video Surcharge */}
                              <div className={`p-3 rounded-xl border shadow-sm ${isVideo ? 'bg-purple-50/70 border-purple-200' : 'bg-white border-slate-200'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isVideo ? 'text-purple-700' : 'text-slate-400'}`}>
                                  Video Surcharge
                                </span>
                                <div className={`text-sm font-black mt-0.5 ${isVideo ? 'text-purple-900' : 'text-slate-900'}`}>
                                  {promoIsFree ? 'KES 0' : isVideo ? `KES ${videoCost}` : 'KES 0'}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {isVideo ? `${days}d × KES ${videoSurcharge}/day` : 'Static image'}
                                </div>
                              </div>

                              {/* Duration Discount */}
                              <div className={`p-3 rounded-xl border shadow-sm ${discountPercent > 0 && !promoIsFree ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${discountPercent > 0 && !promoIsFree ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  Duration Discount
                                </span>
                                <div className={`text-sm font-black mt-0.5 ${discountPercent > 0 && !promoIsFree ? 'text-emerald-900' : 'text-slate-900'}`}>
                                  {promoIsFree ? 'Waived' : discountPercent > 0 ? `-${discountPercent}%` : '0%'}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {discountPercent > 0 && !promoIsFree ? `Save KES ${discountAmount}` : 'No discount (<7d)'}
                                </div>
                              </div>
                            </div>

                            {/* Total Billed / Summary Card */}
                            <div className={`p-3.5 rounded-xl border-2 shadow-sm flex items-center justify-between ${
                              promoIsFree ? 'bg-purple-50/70 border-purple-300' : 'bg-indigo-50/70 border-indigo-300'
                            }`}>
                              <div>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${promoIsFree ? 'text-purple-700' : 'text-indigo-700'}`}>
                                  Total Billed / Money Paid
                                </span>
                                <div className="text-xs text-slate-500 font-medium">
                                  {promoIsFree ? '100% complimentary admin banner' : `Subtotal: KES ${subtotal} • Status: ${promoPaymentStatus.toUpperCase()}`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-2xl font-black ${promoIsFree ? 'text-purple-950' : 'text-indigo-950'}`}>
                                  KES {promoIsFree ? 0 : (promoAmount !== undefined ? promoAmount : autoTotal)}
                                </div>
                              </div>
                            </div>

                            {/* Structured M-Pesa Instructions Box */}
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2.5">
                              <div className="font-black text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                <span>📱</span> M-Pesa Payment Details
                              </div>

                              {rates.paymentType === 'paybill' ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Paybill Business No</div>
                                    <div className="font-mono font-black text-slate-900 text-sm">{rates.paymentPaybill || '—'}</div>
                                  </div>
                                  <div className="p-2 bg-white rounded-lg border border-indigo-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Account Number</div>
                                    <div className="font-mono font-black text-indigo-700 text-sm">{rates.paymentPaybillAcc || (rates.paymentAccountRef || 'HERO-{id}').replace('{id}', selectedApp.id)}</div>
                                  </div>
                                  {rates.paymentAccountRef && rates.paymentPaybillAcc && (
                                    <div className="col-span-2 text-[10px] text-slate-500 font-mono italic">
                                      Ref format: {rates.paymentAccountRef.replace('{id}', selectedApp.id)}
                                    </div>
                                  )}
                                </div>
                              ) : rates.paymentType === 'send_money' ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Phone Number</div>
                                    <div className="font-mono font-black text-slate-900 text-sm">{rates.paymentPhone || '—'}</div>
                                  </div>
                                  {rates.paymentPhoneName && (
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                      <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Recipient Name</div>
                                      <div className="font-bold text-slate-900">{rates.paymentPhoneName}</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                                    <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Buy Goods Till No</div>
                                    <div className="font-mono font-black text-slate-900 text-sm">{rates.paymentTill || '—'}</div>
                                  </div>
                                  {rates.paymentTillName && (
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                      <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Store Name</div>
                                      <div className="font-bold text-slate-900">{rates.paymentTillName}</div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {rates.instructions && (
                                <p className="text-[11px] text-slate-500 italic border-t border-slate-200 pt-2">
                                  {rates.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Expiry & Lifecycle Information */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                            <FaClock className="text-indigo-600" /> Expiry & Campaign Timeline
                          </div>
                          {/* Remaining time pill */}
                          {(() => {
                            if (promoIsDefault) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Default Fallback • Always Active
                                </span>
                              )
                            }
                            const endMs = endAt ? new Date(endAt).getTime() : 0
                            const nowMs = Date.now()
                            const diffMs = endMs - nowMs
                            if (diffMs > 0) {
                              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                              const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Active • Expires in {days}d {hours}h</span>
                                </span>
                              )
                            } else {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                                  Expired
                                </span>
                              )
                            }
                          })()}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Live Start Date & Time</label>
                            <input
                              type="datetime-local"
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                              value={startAt}
                              onChange={e => {
                                setStartAt(e.target.value)
                                if (e.target.value && promoDurationDays) {
                                  const s = new Date(e.target.value)
                                  const end = new Date(s.getTime() + promoDurationDays * 86400000)
                                  setEndAt(end.toISOString().slice(0, 16))
                                }
                              }}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Live Expiry Date & Time</label>
                            <input
                              type="datetime-local"
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                              value={endAt}
                              onChange={e => setEndAt(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Active Duration</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="365"
                                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                value={promoDurationDays}
                                onChange={e => {
                                  const d = Number(e.target.value)
                                  setPromoDurationDays(d)
                                  if (startAt && d) {
                                    const s = new Date(startAt)
                                    const end = new Date(s.getTime() + d * 86400000)
                                    setEndAt(end.toISOString().slice(0, 16))
                                  }
                                }}
                              />
                              <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Days</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Management & Manual Controls */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Payment Status & Reconciliation
                          </span>
                          <div className="flex items-center gap-2">
                            {!promoIsFree && promoPaymentStatus !== 'paid' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await markPaid(selectedApp.id)
                                  setPromoPaymentStatus('paid')
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                              >
                                <FaCheckCircle /> Mark Paid (Manual)
                              </button>
                            )}

                            {!promoIsFree && promoPaymentStatus === 'paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalAction('refund')
                                  setNotes('')
                                }}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                              >
                                <FaMoneyBillWave /> Process Refund...
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Payment Status</label>
                            <select
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                              value={promoPaymentStatus}
                              disabled={promoIsFree}
                              onChange={e => setPromoPaymentStatus(e.target.value)}
                            >
                              <option value="free">Free (Complimentary / Waived)</option>
                              <option value="paid">Paid (Confirmed)</option>
                              <option value="unpaid">Unpaid</option>
                              <option value="pending_payment">Pending Payment</option>
                              <option value="refund_requested">Refund Requested</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Custom Amount Override (KES)</label>
                            <input
                              type="number"
                              min="0"
                              disabled={promoIsFree}
                              className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                              value={promoAmount}
                              onChange={e => setPromoAmount(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        {/* Payment Receipt / Proof Upload & Preview */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {selectedApp.paymentProofUrl ? (
                              <a
                                href={resolveImageUrl(selectedApp.paymentProofUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="block relative group overflow-hidden rounded-lg border border-emerald-300 shadow-sm bg-slate-50 shrink-0"
                              >
                                <img
                                  src={resolveImageUrl(selectedApp.paymentProofUrl)}
                                  alt="Payment Proof"
                                  className="w-16 h-12 object-contain p-1"
                                  onError={e => { e.target.src = 'https://placehold.co/600x400?text=Receipt' }}
                                />
                                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-bold text-white transition-opacity">
                                  View
                                </span>
                              </a>
                            ) : (
                              <div className="w-16 h-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 bg-gray-50 shrink-0">
                                No receipt
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-gray-800">
                                {selectedApp.paymentProofUrl ? 'Payment Proof Attached' : 'No Payment Receipt Uploaded'}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {selectedApp.paymentProofUrl ? 'Click image to view high-resolution M-Pesa receipt' : 'Seller has not submitted an M-Pesa screenshot'}
                              </div>
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer shadow-sm transition-all whitespace-nowrap">
                            <FaUpload className="text-indigo-600 text-[11px]" />
                            <span>Upload / Replace Receipt</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  await uploadAndMarkPaid(selectedApp.id, file)
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Seller & Products */}
                  {modalTab === 'seller' && hasSellerOrProducts && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                      {/* Seller Info */}
                      {selectedApp.sellerId && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-emerald-800 font-black uppercase text-xs tracking-widest">
                              <FaStore /> Seller Information
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border">
                              UID: {selectedApp.sellerId}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          {seller.email && seller.email !== '-' && (
                            <div className="mt-3 pt-2.5 border-t border-dashed flex justify-end">
                              <a
                                href={`/superadmin?search=${seller.email}`}
                                className="text-[10px] font-black text-emerald-600 hover:underline uppercase"
                              >
                                View Full Profile In SuperAdmin →
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Financials & Payment Proof */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-100">
                        <div>
                          <div className="flex items-center gap-2 text-blue-700 font-bold mb-2">
                            <FaMoneyBillWave /> Financials & Booking
                          </div>
                          <div className="text-xs space-y-1 text-slate-700">
                            <div>Total Amount: <span className="font-black text-base text-blue-900">KES {selectedApp.amount || 0}</span></div>
                            <div>Payment Status: <span className="font-bold uppercase tracking-wider">{selectedApp.paymentStatus}</span></div>
                            <div>Duration: <span className="font-semibold">{selectedApp.durationDays} days</span></div>
                          </div>
                          {selectedApp.paymentStatus !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => markPaid(selectedApp.id)}
                              className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            >
                              <FaCheckCircle /> Mark as Received (Manual)
                            </button>
                          )}
                        </div>

                        {selectedApp.paymentProofUrl && (
                          <div>
                            <div className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <FaMoneyBillWave /> Payment Proof Submitted
                            </div>
                            <a
                              href={resolveImageUrl(selectedApp.paymentProofUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="block relative group overflow-hidden rounded-lg border border-emerald-200 shadow-sm bg-white"
                            >
                              <img
                                src={resolveImageUrl(selectedApp.paymentProofUrl)}
                                alt="Payment Proof"
                                className="max-h-32 w-full object-contain p-2"
                                onError={(e) => {
                                  e.target.src = 'https://placehold.co/600x400?text=Payment+Proof+Image'
                                }}
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="bg-white px-2.5 py-1 rounded text-[10px] font-bold shadow uppercase">Open Original</span>
                              </div>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Products Grid */}
                      {pids.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 text-indigo-800 font-bold mb-3 text-xs uppercase tracking-wider">
                            <FaBox /> Promotional Products ({pids.length})
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {pids.map(pid => {
                              const p = productsMap.get(pid)
                              if (!p) return <div key={pid} className="p-3 border rounded-xl text-xs text-gray-400 bg-gray-50 flex items-center justify-center">Loading Product #{pid}...</div>

                              const image = resolveImageUrl(p?.coverImage || p?.image)
                              return (
                                <div key={pid} className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex">
                                  <div className="relative w-24 h-24 bg-gray-50 overflow-hidden shrink-0">
                                    <img
                                      src={image}
                                      alt={p?.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">
                                      #{pid}
                                    </div>
                                  </div>
                                  <div className="p-2.5 flex flex-col justify-between flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-gray-900 truncate">{p?.name || `Product #${pid}`}</h4>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-xs font-black text-blue-800">{formatPrice(p?.discountPrice || p?.displayPrice || p?.price || 0)}</span>
                                      <a
                                        href={`/product/${pid}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                                      >
                                        Details →
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modal Footer Controls */}
                  <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {promoStatus === 'active' ? (
                        <button
                          type="button"
                          onClick={() => setPromoStatus('paused')}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <FaStopCircle />
                          <span>Pause Banner</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPromoStatus('active')}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <FaPlayCircle />
                          <span>Set Active</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleModalAction}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        {actionLoading ? 'Saving...' : (
                          ['pending_payment', 'under_review'].includes(selectedApp.status)
                            ? <><FaCheckCircle /> Approve & Go Live</>
                            : <><FaCheckCircle /> Save Banner Changes</>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {modalAction === 'status' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Select New Status</label>
                    <select
                      className="w-full p-2.5 border rounded-lg outline-none text-sm font-bold bg-white"
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
                      className="w-full p-2.5 border rounded-lg h-24 outline-none text-sm"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Explain the reason for rejection or status change..."
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalAction('approve')}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={handleModalAction}
                      className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      {actionLoading ? 'Updating...' : <><FaInfoCircle /> Update Status</>}
                    </button>
                  </div>
                </div>
              )}

              {modalAction === 'refund' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-sm text-orange-800">
                    <strong>Note:</strong> Refund should be processed on M-Pesa manually. This action marks it as refunded in the system and notifies the seller.
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Refund Internal Reference / Note</label>
                    <textarea
                      className="w-full p-2.5 border rounded-lg h-24 outline-none text-sm"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Enter transaction code or refund details..."
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalAction('approve')}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={handleModalAction}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      {actionLoading ? 'Processing...' : <><FaMoneyBillWave /> Confirm System Refund</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )
      })()}

      {/* Modern In-App Delete Dialog Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        title={deleteTarget?.isDefault ? "Default Banner Locked" : "Confirm Banner Deletion"}
        maxWidth="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            {deleteTarget.isDefault ? (
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 text-lg flex-shrink-0 mt-0.5">
                    <FaInfoCircle />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-black text-amber-900 text-sm">Cannot Delete a Default Banner</div>
                    <p className="text-amber-800 leading-relaxed">
                      Banner <strong>#{deleteTarget.id}</strong> {deleteTarget.title ? `("${deleteTarget.title}")` : ''} is currently designated as a <strong>Default Fallback Banner</strong>.
                    </p>
                    <p className="text-amber-700 pt-1">
                      To protect your marketplace from showing an empty space when no campaigns are running, the system prevents deleting default banners.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
                  <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">How to delete this banner:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>Open <strong>Manage / Review</strong> (or <strong>Edit Banner</strong>).</li>
                    <li>Turn OFF the <strong>Default Fallback</strong> switch.</li>
                    <li>Click <strong>Save Banner Changes</strong>.</li>
                    <li>Click Delete Banner again to permanently remove it.</li>
                  </ol>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = deleteTarget
                      setDeleteTarget(null)
                      openApproveModal(item)
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaCog /> Open Manage / Review
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 text-lg flex-shrink-0 mt-0.5">
                    <FaTrash />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-black text-rose-900 text-sm">Delete Banner #{deleteTarget.id}?</div>
                    <p className="text-rose-800 leading-relaxed">
                      Are you sure you want to permanently delete {deleteTarget.title ? <strong>"{deleteTarget.title}"</strong> : 'this banner'}? This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-500 font-semibold">Banner ID:</span>
                    <span className="font-bold text-gray-900">#{deleteTarget.id}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-500 font-semibold">Type:</span>
                    <span className="font-bold text-gray-900">{deleteTarget.isSystem ? 'Platform-Wide Banner' : 'Seller Banner'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-500 font-semibold">Placements:</span>
                    <span className="font-bold text-gray-900 uppercase">
                      {Array.isArray(deleteTarget.bannerLocation) ? deleteTarget.bannerLocation.join(', ') : deleteTarget.bannerLocation || 'homepage'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={async () => {
                      try {
                        setDeleting(true)
                        await api.delete(`/admin/hero-promotions/manage/${deleteTarget.id}`)
                        setDeleteTarget(null)
                        load()
                      } catch (err) {
                        alert(err?.response?.data?.error || err.message)
                      } finally {
                        setDeleting(false)
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : <><FaTrash /> Permanently Delete</>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
