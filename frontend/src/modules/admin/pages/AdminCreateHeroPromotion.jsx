import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/shared/services/api'
import { uploadFile } from '@/shared/services/upload'
import { resolveImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { FaLink, FaImage, FaCog, FaUserTag, FaSpinner, FaCheckCircle, FaCalculator, FaTimesCircle, FaGlobe, FaHome, FaUtensils, FaShoppingBag, FaTools } from 'react-icons/fa'
import AdvancedScheduler from '@/modules/admin/components/AdvancedScheduler'

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString()}`

const calcEndDate = (startAt, durationDays) => {
  const d = Number(durationDays) || 7
  const start = startAt ? new Date(startAt) : new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + d)
  return end
}

export default function AdminCreateHeroPromotion() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = Boolean(id)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loadingBanner, setLoadingBanner] = useState(false)

  const [form, setForm] = useState({
    sellerId: '',
    productIds: [],
    durationDays: '7',
    slotsCount: '1',
    startAt: '',
    mode: 'free',
    isDefault: false,
    title: '',
    subtitle: '',
    customImageUrl: '',
    targetUrl: '',
    ctaText: '',
    eyebrow: '',
    type: 'system',
    promoType: 'product',
    fastFoodIds: [],
    bannerLocation: 'homepage',
    // Advanced scheduling
    scheduleType: 'continuous',
    recurringDays: [],
    specificDates: [],
    timeSlotStart: '',
    timeSlotEnd: '',
    timezone: 'Africa/Nairobi',
    dateTimeMode: 'same',
    dateSpecificTimes: {},
    trustPoints: [
      { icon: '🚀', text: 'Fast Delivery' },
      { icon: '✅', text: 'Verified' },
      { icon: '🎓', text: 'Student Choice' }
    ]
  })
  const [newTrustIcon, setNewTrustIcon] = useState('📍')
  const [newTrustText, setNewTrustText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ── Rates (loaded once, used for charge calc) ──
  const [rates, setRates] = useState({ perDay: 500, perProduct: 100 })
  useEffect(() => {
    api.get('/hero-promotions/rates').then(r => {
      if (r.data) setRates({ perDay: r.data.perDay || 500, perProduct: r.data.perProduct || 100 })
    }).catch(() => { })
  }, [])

  // Load existing promotion data in edit mode
  useEffect(() => {
    if (!isEditMode || !id) return

    setLoadingBanner(true)
    api.get(`/admin/hero-promotions/applications`)
      .then(r => {
        const allItems = r.data?.items || []
        const banner = allItems.find(item => item.id === Number(id))

        if (banner) {
          setForm(prev => ({
            ...prev,
            sellerId: banner.sellerId || '',
            productIds: banner.productIds || [],
            durationDays: String(banner.durationDays || 7),
            slotsCount: String(banner.slotsCount || 1),
            startAt: banner.startAt ? new Date(banner.startAt).toISOString().slice(0, 16) : '',
            mode: banner.free ? 'free' : 'charged',
            isDefault: banner.isDefault || false,
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            customImageUrl: banner.customImageUrl || '',
            targetUrl: banner.targetUrl || banner.link || '',
            ctaText: banner.ctaText || banner.buttonText || '',
            eyebrow: banner.eyebrow || banner.promoBadge || banner.badge || '',
            type: banner.isSystem ? 'system' : 'seller',
            promoType: banner.promoType || 'product',
            fastFoodIds: banner.fastFoodIds || [],
            scheduleType: banner.scheduleType || 'continuous',
            recurringDays: banner.recurringDays || [],
            specificDates: banner.specificDates || [],
            timeSlotStart: banner.timeSlotStart || '',
            timeSlotEnd: banner.timeSlotEnd || '',
            timezone: banner.timezone || 'Africa/Nairobi',
            dateTimeMode: banner.dateTimeMode || 'same',
            dateSpecificTimes: banner.dateSpecificTimes || {},
            trustPoints: Array.isArray(banner.trustPoints) ? banner.trustPoints : [],
            bannerLocation: banner.bannerLocation || (banner.promoType === 'fastfood' ? 'fastfood' : 'homepage')
          }))

          if (!banner.isSystem && banner.sellerId) {
            loadSellers()
          }
        } else {
          setError('Promotion not found')
        }
      })
      .catch(e => {
        setError(e?.response?.data?.error || 'Failed to load promotion data')
      })
      .finally(() => {
        setLoadingBanner(false)
      })
  }, [isEditMode, id, loadSellers])

  // ── Lazy: sellers only loaded when switching to Seller type ──
  const [sellers, setSellers] = useState([])
  const [loadingSellers, setLoadingSellers] = useState(false)
  const sellersLoaded = useRef(false)

  const loadSellers = useCallback(async () => {
    if (sellersLoaded.current) return
    sellersLoaded.current = true
    setLoadingSellers(true)
    try {
      const r = await api.get('/admin/users', { params: { role: 'seller', limit: 200 } })
      const data = r.data
      const arr = Array.isArray(data) ? data : (data?.users || data?.data || [])
      setSellers(arr.filter(u => u.role === 'seller'))
    } catch {
      setSellers([])
    } finally {
      setLoadingSellers(false)
    }
  }, [])

  // ── Lazy: products only loaded when a seller is selected ──
  const [sellerProducts, setSellerProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const lastSellerId = useRef(null)
  const [fastfoods, setFastfoods] = useState([])
  const [loadingFastfoods, setLoadingFastfoods] = useState(false)

  useEffect(() => {
    if (!form.sellerId) { setSellerProducts([]); return }
    const sid = Number(form.sellerId)
    if (lastSellerId.current === sid) return
    lastSellerId.current = sid
    setLoadingProducts(true)
    api.get('/admin/products', { params: { sellerId: sid, limit: 200 } })
      .then(r => {
        const data = r.data
        setSellerProducts(Array.isArray(data) ? data : (data?.products || data?.data || []))
      })
      .catch(() => setSellerProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [form.sellerId])

  useEffect(() => {
    if (!form.sellerId || form.promoType !== 'fastfood') { setFastfoods([]); return }
    const sid = Number(form.sellerId)
    setLoadingFastfoods(true)
    api.get('/admin/fastfood', { params: { sellerId: sid, limit: 200 } })
      .then(r => {
        const data = r.data
        setFastfoods(Array.isArray(data) ? data : (data?.fastfoods || data?.data || []))
      })
      .catch(() => setFastfoods([]))
      .finally(() => setLoadingFastfoods(false))
  }, [form.sellerId, form.promoType])

  // Derived values
  const selectedProducts = useMemo(() =>
    sellerProducts.filter(p => form.productIds.includes(p.id)), [sellerProducts, form.productIds])

  const previewImage = useMemo(() => {
    if (form.type === 'seller') {
      const first = selectedProducts[0]
      return first ? resolveImageUrl(first.coverImage) : null
    }
    if (form.type === 'seller' && form.promoType === 'fastfood') {
      const selected = fastfoods.filter(f => form.fastFoodIds.includes(f.id))
      const first = selected[0]
      return first ? resolveImageUrl(first.mainImage) : null
    }
    return form.customImageUrl || null
  }, [form.type, form.promoType, form.customImageUrl, selectedProducts, fastfoods, form.fastFoodIds])

  const endDate = useMemo(() => calcEndDate(form.startAt, form.durationDays), [form.startAt, form.durationDays])

  const chargeBreakdown = useMemo(() => {
    if (form.type !== 'seller' || form.mode !== 'charged') return null
    const days = Number(form.durationDays) || 7
    const numItems = form.promoType === 'product' ? form.productIds.length : form.fastFoodIds.length
    const base = days * rates.perDay
    const productFee = days * numItems * rates.perProduct
    const total = base + productFee
    return { days, numItems, base, productFee, total }
  }, [form.type, form.mode, form.durationDays, form.productIds.length, form.fastFoodIds.length, form.promoType, rates])

  const toggleProduct = (pid) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(pid)
        ? prev.productIds.filter(x => x !== pid)
        : [...prev.productIds, pid]
    }))
  }

  const toggleFastFood = (fid) => {
    setForm(prev => ({
      ...prev,
      fastFoodIds: prev.fastFoodIds.includes(fid)
        ? prev.fastFoodIds.filter(x => x !== fid)
        : [...prev.fastFoodIds, fid]
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadFile(file)
      setForm(prev => ({ ...prev, customImageUrl: url }))
      setSuccess('Image uploaded!')
      setTimeout(() => setSuccess(''), 2000)
    } catch {
      setError('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleTypeChange = (type) => {
    setForm(prev => ({ ...prev, type }))
    if (type === 'seller') loadSellers()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.type === 'seller') {
      if (!form.sellerId) return setError('Please select a seller')
      if (form.promoType === 'product' && !form.productIds.length && !form.customImageUrl) return setError('Select at least one product or upload a custom image')
      if (form.promoType === 'fastfood' && !form.fastFoodIds.length && !form.customImageUrl) return setError('Select at least one fast food item or upload a custom image')
    } else {
      if (!form.customImageUrl && !form.productIds.length) return setError('Upload a custom image for this system banner')
    }

    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const payload = {
        sellerId: form.type === 'seller' ? Number(form.sellerId) : null,
        productIds: form.productIds,
        durationDays: Number(form.durationDays) || 7,
        slotsCount: Number(form.slotsCount) || 1,
        title: form.title,
        subtitle: form.subtitle,
        customImageUrl: form.customImageUrl,
        targetUrl: form.targetUrl,
        link: form.targetUrl,
        ctaText: form.ctaText,
        buttonText: form.ctaText,
        eyebrow: form.eyebrow,
        promoBadge: form.eyebrow,
        isDefault: form.isDefault,
        isSystem: form.type === 'system',
        promoType: form.promoType,
        fastFoodIds: form.fastFoodIds,
        bannerLocation: form.bannerLocation || 'homepage',
        free: form.mode === 'free' || form.type === 'system',
        trustPoints: form.trustPoints,
        // Advanced scheduling
        scheduleType: form.scheduleType,
        recurringDays: form.recurringDays,
        specificDates: form.specificDates,
        timeSlotStart: form.timeSlotStart,
        timeSlotEnd: form.timeSlotEnd,
        timezone: form.timezone,
        dateTimeMode: form.dateTimeMode,
        dateSpecificTimes: form.dateSpecificTimes
      }
      if (form.startAt) payload.startAt = new Date(form.startAt)

      if (isEditMode) {
        await api.patch(`/admin/hero-promotions/manage/${id}`, payload)
        setSuccess('Hero promotion updated successfully!')
      } else {
        await api.post('/admin/hero-promotions/manage', payload)
        setSuccess('Hero promotion created successfully!')
      }
      setTimeout(() => navigate('/dashboard/marketing/hero-promotions'), 700)
    } catch (e) {
      setError(e.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} promotion`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow-lg my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{isEditMode ? 'Edit Hero Promotion' : 'Create Hero Promotion'}</h2>
          <p className="text-gray-500 text-sm">{isEditMode ? 'Update your banner details and settings' : 'Design a new feature banner for the marketplace'}</p>
        </div>
        <button className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold transition-colors" onClick={() => navigate('/dashboard/marketing/hero-promotions')}>
          ← Back
        </button>
      </div>

      {loadingBanner && (
        <div className="mb-6 flex items-center justify-center p-12">
          <FaSpinner className="animate-spin text-emerald-600 text-3xl" />
          <span className="ml-3 text-gray-600 font-medium">Loading promotion data...</span>
        </div>
      )}

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold flex items-center gap-2">⚠️ {error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-bold flex items-center gap-2"><FaCheckCircle /> {success}</div>}

      {!loadingBanner && (

      <form className="space-y-8" onSubmit={submit}>

        {/* Step 1: Type */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <label className="block text-xs font-black text-gray-500 mb-4 uppercase tracking-widest">Step 1 — Promotion Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { value: 'system', icon: <FaCog />, label: 'System Promotion', desc: 'Global banner — great for default/fallback display', color: 'emerald' },
              { value: 'seller', icon: <FaUserTag />, label: 'Seller Promotion', desc: "Feature a specific seller's products on the banner", color: 'blue' },
            ].map(opt => (
              <label key={opt.value} className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${form.type === opt.value ? `border-${opt.color}-600 bg-${opt.color}-50` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" value={opt.value} checked={form.type === opt.value} onChange={() => handleTypeChange(opt.value)} className="hidden" />
                <div className="flex gap-4 items-center">
                  <div className={`p-3 rounded-lg text-lg ${form.type === opt.value ? `bg-${opt.color}-600 text-white` : 'bg-gray-100 text-gray-400'}`}>{opt.icon}</div>
                  <div>
                    <div className="font-black text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Banner Placement / Page Location */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <FaGlobe className="text-purple-600" /> Target Placement / Page Location
            </label>
            <span className="text-xs text-purple-700 font-bold bg-purple-100 px-2.5 py-0.5 rounded-full">
              Active on: {form.bannerLocation === 'all' ? 'All Platform Pages' : form.bannerLocation.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Select which page header this hero banner should appear on:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { value: 'homepage', label: 'Homepage', icon: <FaHome />, desc: 'Main Landing Hero', color: 'blue' },
              { value: 'fastfood', label: 'Fast Food', icon: <FaUtensils />, desc: 'Fast Food Section', color: 'amber' },
              { value: 'products', label: 'Products', icon: <FaShoppingBag />, desc: 'Products Catalog', color: 'emerald' },
              { value: 'services', label: 'Services', icon: <FaTools />, desc: 'Campus Services', color: 'indigo' },
              { value: 'all', label: 'All Pages', icon: <FaGlobe />, desc: 'Global Hero Banner', color: 'purple' },
            ].map(loc => (
              <button
                type="button"
                key={loc.value}
                onClick={() => setForm(p => ({ ...p, bannerLocation: loc.value }))}
                className={`flex flex-col items-center text-center p-3.5 rounded-xl border-2 transition-all ${
                  form.bannerLocation === loc.value
                    ? 'border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-400/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${
                  form.bannerLocation === loc.value ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {loc.icon}
                </div>
                <span className="font-black text-xs text-slate-900">{loc.label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{loc.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT: Visuals + Text */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">
                {form.type === 'seller' ? 'Step 2 — Banner Preview (auto from selected product)' : 'Step 2 — Custom Banner Image'}
              </label>

              {/* Preview box */}
              <div className={`relative rounded-2xl overflow-hidden border-2 ${previewImage ? 'border-transparent' : 'border-dashed border-gray-200'} bg-gray-50 min-h-[200px] flex items-center justify-center`}>
                {previewImage ? (
                  <>
                    <img src={previewImage} alt="Banner preview" className="w-full h-52 object-cover" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                      <div className="text-white">
                        <div className="font-black text-lg drop-shadow">{form.title || 'Banner Heading'}</div>
                        {form.subtitle && <div className="text-sm text-white/80">{form.subtitle}</div>}
                      </div>
                    </div>
                    {form.type === 'system' && (
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, customImageUrl: '' }))} className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow">
                        Remove
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 px-6">
                    <FaImage size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-500">
                      {form.type === 'seller' ? 'Select a product below to preview its cover image here' : 'Upload a banner image'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Recommended: 1920×600px</p>
                  </div>
                )}

                {/* Upload overlay for system type */}
                {form.type === 'system' && !form.customImageUrl && (
                  <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 flex items-center justify-center bg-black/30 transition-opacity rounded-2xl">
                    <div className="bg-white/90 px-4 py-2 rounded-lg font-bold text-gray-800 text-sm">Click to Upload Image</div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-700 font-black"><FaSpinner className="animate-spin" /> Uploading...</div>
                  </div>
                )}
              </div>

              {/* Upload button for system type when no image */}
              {form.type === 'system' && !form.customImageUrl && (
                <label className="mt-2 w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 font-bold text-sm cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                  <FaImage /> Upload Custom Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>

            {/* Heading + Subtitle + URL */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Banner Heading</label>
                <input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. MEGA CAMPUS SAVINGS" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Subheading</label>
                <textarea className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none" placeholder="Short description of this promotion..." value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} />
              </div>
            </div>

            {/* Custom Buttons, Eyebrow & Badges */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FaUserTag className="text-emerald-600" /> Custom Buttons, Eyebrow & Badges (Optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Eyebrow Pill Badge</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="e.g. 🔥 EXCLUSIVE DEAL or ✨ NEW LAUNCH"
                    value={form.eyebrow}
                    onChange={e => setForm(p => ({ ...p, eyebrow: e.target.value }))}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Leave empty to hide top badge</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="e.g. Shop Now, Explore Options, Learn More"
                    value={form.ctaText}
                    onChange={e => setForm(p => ({ ...p, ctaText: e.target.value }))}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Text displayed inside action button</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <FaLink className="text-gray-400" /> CTA Target Link URL
                </label>
                <input
                  type="text"
                  className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="e.g. /fastfood, /products, /services or https://..."
                  value={form.targetUrl}
                  onChange={e => setForm(p => ({ ...p, targetUrl: e.target.value }))}
                />
                <p className="text-[10px] text-gray-400 mt-1">Destination page URL opened when CTA button is clicked</p>
              </div>

              {/* Custom Trust Points */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-gray-600">Custom Trust Badges</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.trustPoints.map((tp, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border text-xs font-semibold shadow-sm">
                      <span>{tp.icon}</span>
                      <span>{tp.text || tp}</span>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, trustPoints: p.trustPoints.filter((_, i) => i !== idx) }))}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {form.trustPoints.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No custom badges. Badges section will be hidden.</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-16 p-2 border rounded-lg text-center text-sm bg-white"
                    placeholder="Icon"
                    value={newTrustIcon}
                    onChange={e => setNewTrustIcon(e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-grow p-2 border rounded-lg text-sm bg-white"
                    placeholder="Badge label e.g. Fast Delivery, Verified"
                    value={newTrustText}
                    onChange={e => setNewTrustText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTrustText.trim()) return
                      setForm(p => ({
                        ...p,
                        trustPoints: [...p.trustPoints, { icon: newTrustIcon || '📍', text: newTrustText.trim() }]
                      }))
                      setNewTrustText('')
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Config */}
          <div className="space-y-6">

            {/* SELLER specific */}
            {form.type === 'seller' ? (
              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-blue-600 uppercase tracking-widest">Seller & Content</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm(p => ({ ...p, promoType: 'product', productIds: [], fastFoodIds: [] }))} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${form.promoType === 'product' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-200'}`}>Products</button>
                    <button type="button" onClick={() => setForm(p => ({ ...p, promoType: 'fastfood', productIds: [], fastFoodIds: [] }))} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${form.promoType === 'fastfood' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-200'}`}>FastFood</button>
                  </div>
                </div>

                {/* Seller select */}
                <div className="relative">
                  <label className="block text-xs font-bold text-blue-500 mb-1">Seller Account</label>
                  {loadingSellers && <FaSpinner className="absolute right-3 top-8 animate-spin text-blue-400 pointer-events-none" />}
                  <select className="w-full p-3 border border-blue-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={form.sellerId} onChange={e => setForm(p => ({ ...p, sellerId: e.target.value, productIds: [] }))} required={form.type === 'seller'}>
                    <option value="">{loadingSellers ? 'Loading sellers...' : '— Select a seller —'}</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name} · {s.email}</option>)}
                  </select>
                </div>

                {/* Content selection based on promoType */}
                {form.sellerId && form.promoType === 'product' && (
                  <div>
                    <label className="block text-xs font-bold text-blue-500 mb-2">Products to Feature</label>
                    {loadingProducts ? (
                      <div className="flex items-center gap-2 py-4 text-blue-500 text-sm font-bold"><FaSpinner className="animate-spin" /> Loading products...</div>
                    ) : sellerProducts.length ? (
                      <div className="max-h-56 overflow-auto border border-blue-100 bg-white rounded-xl divide-y">
                        {sellerProducts.map(p => {
                          const isChecked = form.productIds.includes(p.id)
                          return (
                            <label key={p.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <input type="checkbox" className="w-4 h-4 rounded text-blue-600 flex-shrink-0" checked={isChecked} onChange={() => toggleProduct(p.id)} />
                              <img src={resolveImageUrl(p.coverImage)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">{p.name}</div>
                                <div className="text-xs text-gray-400">#{p.id}</div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic p-3 text-center border rounded-xl">No products found for this seller</div>
                    )}
                  </div>
                )}

                {form.sellerId && form.promoType === 'fastfood' && (
                  <div>
                    <label className="block text-xs font-bold text-orange-500 mb-2">FastFood Items to Feature</label>
                    {loadingFastfoods ? (
                      <div className="flex items-center gap-2 py-4 text-orange-500 text-sm font-bold"><FaSpinner className="animate-spin" /> Loading items...</div>
                    ) : fastfoods.length ? (
                      <div className="max-h-56 overflow-auto border border-orange-100 bg-white rounded-xl divide-y">
                        {fastfoods.map(f => {
                          const isChecked = form.fastFoodIds.includes(f.id)
                          return (
                            <label key={f.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isChecked ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                              <input type="checkbox" className="w-4 h-4 rounded text-orange-600 flex-shrink-0" checked={isChecked} onChange={() => toggleFastFood(f.id)} />
                              <img src={resolveImageUrl(f.mainImage)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">{f.name}</div>
                                <div className="text-xs text-gray-400">#{f.id}</div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic p-3 text-center border rounded-xl">No items found for this seller</div>
                    )}
                  </div>
                )}

                {/* Payment mode */}
                <div className="flex gap-6">
                  {[{ value: 'charged', label: 'Charged' }, { value: 'free', label: 'Free / Pro-bono' }].map(m => (
                    <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="pay-mode" value={m.value} checked={form.mode === m.value} onChange={() => setForm(p => ({ ...p, mode: m.value }))} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              // SYSTEM specific
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-4">System Settings</label>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
                  <div>
                    <div className="text-sm font-bold text-gray-900">Default Fallback Banner</div>
                    <div className="text-xs text-gray-500">Auto-display when no seller promotions are active</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Duration & Charge */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Duration & Slots</label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Duration (days)</label>
                  <input type="number" min="1" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-400 font-bold" value={form.durationDays} onChange={e => setForm(p => ({ ...p, durationDays: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Slots</label>
                  <input type="number" min="1" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-400 font-bold" value={form.slotsCount} onChange={e => setForm(p => ({ ...p, slotsCount: e.target.value }))} />
                </div>
              </div>

              {/* Calculated end date */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border text-sm">
                <span className="text-gray-500 font-medium">Calculated End Date</span>
                <span className="font-black text-gray-900">{endDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Charge breakdown — only for charged seller promotions */}
              {chargeBreakdown && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-widest mb-2"><FaCalculator /> Charge Breakdown</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base ({chargeBreakdown.days} days × {formatKES(rates.perDay)}/day)</span>
                      <span className="font-bold">{formatKES(chargeBreakdown.base)}</span>
                    </div>
                    {chargeBreakdown.numItems > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{chargeBreakdown.numItems} item{chargeBreakdown.numItems > 1 ? 's' : ''} × {chargeBreakdown.days} days × {formatKES(rates.perProduct)}</span>
                        <span className="font-bold">{formatKES(chargeBreakdown.productFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-200 font-black text-base">
                      <span className="text-blue-900">Total Charge</span>
                      <span className="text-blue-900">{formatKES(chargeBreakdown.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {form.type === 'seller' && form.mode === 'free' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm font-bold text-emerald-700 text-center">
                  ✅ Free / Pro-bono — No charge applied
                </div>
              )}
            </div>

            {/* Advanced Scheduler */}
            <AdvancedScheduler
              value={{
                scheduleType: form.scheduleType,
                recurringDays: form.recurringDays,
                specificDates: form.specificDates,
                timeSlotStart: form.timeSlotStart,
                timeSlotEnd: form.timeSlotEnd,
                dateTimeMode: form.dateTimeMode,
                dateSpecificTimes: form.dateSpecificTimes
              }}
              onChange={(schedule) => {
                setForm(prev => ({
                  ...prev,
                  ...schedule
                }))
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 pt-6 border-t">
          <button type="submit" className="flex-grow py-4 rounded-xl bg-gray-900 hover:bg-black text-white font-black text-lg transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2" disabled={submitting || uploading}>
            {submitting ? <><FaSpinner className="animate-spin" /> {isEditMode ? 'Updating...' : 'Creating...'}</> : (isEditMode ? 'Update Hero Promotion' : 'Launch Hero Promotion')}
          </button>
          <button type="button" className="px-8 py-4 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors" onClick={() => navigate('/dashboard/marketing/hero-promotions')}>
            Cancel
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
