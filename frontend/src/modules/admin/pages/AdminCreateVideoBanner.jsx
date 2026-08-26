import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/shared/services/api'
import { uploadFile } from '@/shared/services/upload'
import { resolveImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { FaLink, FaImage, FaCog, FaUserTag, FaSpinner, FaCheckCircle, FaCalculator, FaTimesCircle, FaVideo, FaPlay } from 'react-icons/fa'
import AdvancedScheduler from '@/modules/admin/components/AdvancedScheduler'

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString()}`

const calcEndDate = (startAt, durationDays) => {
  const d = Number(durationDays) || 7
  const start = startAt ? new Date(startAt) : new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + d)
  return end
}

export default function AdminCreateVideoBanner() {
  const navigate = useNavigate()
  const { id } = useParams() // Get banner ID from URL for edit mode
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
    type: 'system',
    promoType: 'product',
    fastFoodIds: [],
    // Video fields
    videoUrl: '',
    videoType: 'background',
    videoAutoplay: true,
    videoLoop: true,
    videoMuted: true,
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
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const [rates, setRates] = useState({ perDay: 500, perProduct: 100 })
  useEffect(() => {
    api.get('/hero-promotions/rates').then(r => {
      if (r.data) setRates({ perDay: r.data.perDay || 500, perProduct: r.data.perProduct || 100 })
    }).catch(() => { })
  }, [])

  // Load existing banner data in edit mode
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
            targetUrl: banner.targetUrl || '',
            type: banner.isSystem ? 'system' : 'seller',
            promoType: banner.promoType || 'product',
            fastFoodIds: banner.fastFoodIds || [],
            videoUrl: banner.videoUrl || '',
            videoType: banner.videoType || 'background',
            videoAutoplay: banner.videoAutoplay !== false,
            videoLoop: banner.videoLoop !== false,
            videoMuted: banner.videoMuted !== false,
            scheduleType: banner.scheduleType || 'continuous',
            recurringDays: banner.recurringDays || [],
            specificDates: banner.specificDates || [],
            timeSlotStart: banner.timeSlotStart || '',
            timeSlotEnd: banner.timeSlotEnd || '',
            timezone: banner.timezone || 'Africa/Nairobi',
            dateTimeMode: banner.dateTimeMode || 'same',
            dateSpecificTimes: banner.dateSpecificTimes || {},
            trustPoints: banner.trustPoints || [
              { icon: '🚀', text: 'Fast Delivery' },
              { icon: '✅', text: 'Verified' },
              { icon: '🎓', text: 'Student Choice' }
            ]
          }))

          // If it's a seller banner, load sellers
          if (!banner.isSystem && banner.sellerId) {
            loadSellers()
          }
        } else {
          setError('Video banner not found')
        }
      })
      .catch(e => {
        setError(e?.response?.data?.error || 'Failed to load banner data')
      })
      .finally(() => {
        setLoadingBanner(false)
      })
  }, [isEditMode, id])

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

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg']
    if (!validTypes.includes(file.type)) {
      setError('Please upload MP4, WEBM, or OGG video files only')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('Video file must be less than 50MB')
      return
    }

    setUploadingVideo(true)
    setError('')
    try {
      const url = await uploadFile(file)
      setForm(prev => ({ ...prev, videoUrl: url }))
      setSuccess('Video uploaded!')
      setTimeout(() => setSuccess(''), 2000)
    } catch {
      setError('Video upload failed')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleTypeChange = (type) => {
    setForm(prev => ({ ...prev, type }))
    if (type === 'seller') loadSellers()
  }

  const submit = async (e) => {
    e.preventDefault()

    if (!form.videoUrl) {
      return setError('Video URL or video file is required for video banners')
    }

    if (form.type === 'seller') {
      if (!form.sellerId) return setError('Please select a seller')
      if (form.promoType === 'product' && !form.productIds.length && !form.customImageUrl) return setError('Select at least one product or upload a custom image')
      if (form.promoType === 'fastfood' && !form.fastFoodIds.length && !form.customImageUrl) return setError('Select at least one fast food item or upload a custom image')
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
        isDefault: form.isDefault,
        isSystem: form.type === 'system',
        promoType: form.promoType,
        fastFoodIds: form.fastFoodIds,
        free: form.mode === 'free' || form.type === 'system',
        trustPoints: form.trustPoints,
        // Video fields
        videoUrl: form.videoUrl,
        videoType: form.videoType,
        videoAutoplay: form.videoAutoplay,
        videoLoop: form.videoLoop,
        videoMuted: form.videoMuted,
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
        // Update existing banner
        await api.patch(`/admin/hero-promotions/manage/${id}`, payload)
        setSuccess('Video banner updated successfully!')
      } else {
        // Create new banner
        await api.post('/admin/hero-promotions/manage', payload)
        setSuccess('Video banner created successfully!')
      }

      setTimeout(() => navigate('/dashboard/marketing/video-banners'), 1000)
    } catch (e) {
      setError(e.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} video banner`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow-lg my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FaVideo className="text-purple-600" /> {isEditMode ? 'Edit Video Banner' : 'Create Video Banner'}
          </h2>
          <p className="text-gray-500 text-sm">{isEditMode ? 'Update your video banner settings and scheduling' : 'Design a video banner for the homepage with advanced scheduling'}</p>
        </div>
        <button className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 font-bold transition-colors" onClick={() => navigate('/dashboard/marketing/video-banners')}>
          ← Back
        </button>
      </div>

      {loadingBanner && (
        <div className="mb-6 flex items-center justify-center p-12">
          <FaSpinner className="animate-spin text-purple-600 text-3xl" />
          <span className="ml-3 text-gray-600 font-medium">Loading video banner data...</span>
        </div>
      )}

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold flex items-center gap-2">⚠️ {error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-bold flex items-center gap-2"><FaCheckCircle /> {success}</div>}

      {!loadingBanner && (
        <form className="space-y-8" onSubmit={submit}>

          {/* Step 1: Type - Only show in create mode */}
          {!isEditMode && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-black text-gray-500 mb-4 uppercase tracking-widest">Step 1 — Banner Type</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'system', icon: <FaCog />, label: 'System Video Banner', desc: 'Platform-wide video banner', color: 'emerald' },
                  { value: 'seller', icon: <FaUserTag />, label: 'Seller Video Banner', desc: 'Seller-specific video promotion', color: 'blue' },
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
          )}

          {/* Video Preview - Only show in edit mode */}
          {isEditMode && form.videoUrl && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border-2 border-purple-200">
              <label className="block text-xs font-black text-purple-600 mb-4 uppercase tracking-widest flex items-center gap-2">
                <FaPlay /> Current Video Preview
              </label>
              <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl" style={{ paddingBottom: '56.25%' }}>
                {(() => {
                  const url = form.videoUrl;

                  // YouTube
                  if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    const youtubeId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                    if (youtubeId) {
                      return (
                        <iframe
                          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1`}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="YouTube Video Preview"
                        />
                      );
                    }
                  }

                  // TikTok
                  if (url.includes('tiktok.com')) {
                    const tiktokId = url.match(/tiktok\.com\/.*\/video\/(\d+)/)?.[1];
                    if (tiktokId) {
                      return (
                        <iframe
                          src={`https://www.tiktok.com/embed/v2/${tiktokId}`}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="TikTok Video Preview"
                        />
                      );
                    }
                  }

                  // Vimeo
                  if (url.includes('vimeo.com')) {
                    const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
                    if (vimeoId) {
                      return (
                        <iframe
                          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&loop=0&controls=1`}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Vimeo Video Preview"
                        />
                      );
                    }
                  }

                  // Dailymotion
                  if (url.includes('dailymotion.com')) {
                    const dailymotionId = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/)?.[1];
                    if (dailymotionId) {
                      return (
                        <iframe
                          src={`https://www.dailymotion.com/embed/video/${dailymotionId}?autoplay=0&controls=1`}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Dailymotion Video Preview"
                        />
                      );
                    }
                  }

                  // Facebook
                  if (url.includes('facebook.com') && url.includes('/videos/')) {
                    return (
                      <iframe
                        src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=0`}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Facebook Video Preview"
                      />
                    );
                  }

                  // Instagram
                  if (url.includes('instagram.com')) {
                    return (
                      <iframe
                        src={`${url}embed/`}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Instagram Video Preview"
                      />
                    );
                  }

                  // Default: Direct video file
                  return (
                    <video
                      src={url}
                      className="absolute inset-0 w-full h-full object-cover"
                      controls
                      autoPlay={form.videoAutoplay}
                      loop={form.videoLoop}
                      muted={form.videoMuted}
                    />
                  );
                })()}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded ${form.videoAutoplay ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {form.videoAutoplay ? '✓ Autoplay' : '✗ Autoplay'}
                  </span>
                  <span className={`px-2 py-1 rounded ${form.videoLoop ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {form.videoLoop ? '✓ Loop' : '✗ Loop'}
                  </span>
                  <span className={`px-2 py-1 rounded ${form.videoMuted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {form.videoMuted ? '✓ Muted' : '✗ Muted'}
                  </span>
                </div>
                <span className="font-bold text-purple-600 uppercase">{form.videoType}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* LEFT: Video Upload */}
            <div className="space-y-6">

              {/* Video Upload Section */}
              <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 space-y-4">
                <label className="block text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                  <FaVideo /> Video Content (Required)
                </label>

                {/* Video File Upload */}
                <div>
                  <label className="block text-xs font-bold text-purple-500 mb-2">Upload Video File</label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload"
                    disabled={uploadingVideo}
                  />
                  <label
                    htmlFor="video-upload"
                    className={`cursor-pointer px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${uploadingVideo ? 'opacity-50' : ''}`}
                  >
                    {uploadingVideo ? <><FaSpinner className="animate-spin" /> Uploading...</> : <><FaVideo /> {form.videoUrl ? 'Change Video File' : 'Upload Video File'} (Max 50MB)</>}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: MP4 (H.264), max 50MB
                  </p>
                  {form.videoUrl && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FaCheckCircle className="text-green-600" />
                          <span className="text-sm font-bold text-green-800">Video uploaded successfully!</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, videoUrl: '' }))}
                          className="text-red-600 hover:text-red-800 font-bold text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-600 truncate">
                        {form.videoUrl}
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Type Selection */}
                {form.videoUrl && (
                  <div className="pt-4 border-t border-purple-200">
                    <label className="block text-xs font-bold text-purple-500 mb-2">
                      Video Display Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'background', label: 'Background', desc: 'Full banner with controls' },
                        { value: 'overlay', label: 'Overlay', desc: 'Full banner with controls' },
                        { value: 'embed', label: 'Embed', desc: 'Full banner with controls' }
                      ].map(opt => (
                        <label
                          key={opt.value}
                          className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${form.videoType === opt.value
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-purple-300'
                            }`}
                        >
                          <input
                            type="radio"
                            value={opt.value}
                            checked={form.videoType === opt.value}
                            onChange={e => setForm(p => ({ ...p, videoType: e.target.value }))}
                            className="hidden"
                          />
                          <span className="font-black text-xs">{opt.label}</span>
                          <span className="text-[10px] text-gray-500 mt-1">{opt.desc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Settings */}
                {form.videoUrl && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer hover:border-purple-300">
                      <input
                        type="checkbox"
                        checked={form.videoAutoplay}
                        onChange={e => setForm(p => ({ ...p, videoAutoplay: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-xs font-bold">Autoplay</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer hover:border-purple-300">
                      <input
                        type="checkbox"
                        checked={form.videoLoop}
                        onChange={e => setForm(p => ({ ...p, videoLoop: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-xs font-bold">Loop</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer hover:border-purple-300">
                      <input
                        type="checkbox"
                        checked={form.videoMuted}
                        onChange={e => setForm(p => ({ ...p, videoMuted: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-xs font-bold">Muted</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Video Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Video Title</label>
                  <input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Campus Mega Sale 2026" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Video Description</label>
                  <textarea className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 h-20 resize-none" placeholder="Short description of the video banner..." value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* RIGHT: Configuration */}
            <div className="space-y-6">

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

          {/* Submit */}
          <div className="flex gap-4 pt-6 border-t">
            <button type="submit" className="flex-grow py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-lg transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2" disabled={submitting || uploadingVideo}>
              {submitting ? <><FaSpinner className="animate-spin" /> {isEditMode ? 'Updating...' : 'Creating...'}</> : <><FaPlay /> {isEditMode ? 'Update Video Banner' : 'Launch Video Banner'}</>}
            </button>
            <button type="button" className="px-8 py-4 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors" onClick={() => navigate('/dashboard/marketing/video-banners')}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
