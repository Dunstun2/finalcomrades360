import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/shared/services/api'
import { uploadFile } from '@/shared/services/upload'
import { resolveImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'
import { FaLink, FaImage, FaCog, FaUserTag, FaSpinner, FaCheckCircle, FaCalculator, FaTimesCircle, FaGlobe, FaHome, FaUtensils, FaShoppingBag, FaTools, FaPlay, FaVideo, FaMagic, FaLightbulb, FaCheck, FaTimes } from 'react-icons/fa'
import AdvancedScheduler from '@/modules/admin/components/AdvancedScheduler'
import VideoBannerPreview from '@/modules/marketing/components/VideoBannerPreview'

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
  const [mediaMode, setMediaMode] = useState('image') // 'image' | 'video'

  const switchMediaMode = (mode) => {
    setMediaMode(mode)
    // Don't wipe the opposite field — just switch the active mode
  }

  const toggleBannerLocation = (locVal) => {
    setForm(prev => {
      const current = Array.isArray(prev.bannerLocation)
        ? prev.bannerLocation
        : [prev.bannerLocation || 'homepage']

      if (locVal === 'all') {
        return {
          ...prev,
          bannerLocation: current.includes('all') ? ['homepage'] : ['all']
        }
      }

      let next = current.filter(x => x !== 'all')
      if (next.includes(locVal)) {
        next = next.filter(x => x !== locVal)
        if (next.length === 0) next = ['homepage']
      } else {
        next = [...next, locVal]
        const allPages = ['homepage', 'fastfood', 'products', 'services']
        if (allPages.every(p => next.includes(p))) {
          next = ['all']
        }
      }

      return { ...prev, bannerLocation: next }
    })
  }

  const isLocationSelected = (locVal) => {
    const current = Array.isArray(form.bannerLocation)
      ? form.bannerLocation
      : [form.bannerLocation || 'homepage']
    if (locVal === 'all') return current.includes('all')
    return current.includes('all') || current.includes(locVal)
  }

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
    bannerLocation: ['homepage'],
    // Advanced scheduling
    scheduleType: 'continuous',
    recurringDays: [],
    specificDates: [],
    timeSlotStart: '',
    timeSlotEnd: '',
    timezone: 'Africa/Nairobi',
    dateTimeMode: 'same',
    dateSpecificTimes: {},
    trustPoints: [],
    // Video banner fields
    videoUrl: '',
    videoType: 'background',
    videoAutoplay: true,
    videoLoop: true,
    videoMuted: true
  })
  const [newTrustIcon, setNewTrustIcon] = useState('📍')
  const [newTrustText, setNewTrustText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ── AI Marketing Assistant State ──
  const [aiLoading, setAiLoading] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiActiveTab, setAiActiveTab] = useState('all')

  // ── Per-field AI Suggest Dropdown State ──
  const [fieldDropdown, setFieldDropdown] = useState(null)   // 'title'|'subtitle'|'eyebrow'|'ctaText'|null
  const [fieldSuggestions, setFieldSuggestions] = useState({}) // { title: [...], subtitle: [...], ... }
  const [fieldLoading, setFieldLoading] = useState({})        // { title: true/false, ... }
  const suggestDropdownRef = useRef(null)

  // ── Rates (loaded once, used for charge calc) ──
  const [rates, setRates] = useState({ perDay: 500, perProduct: 100 })
  useEffect(() => {
    api.get('/hero-promotions/rates').then(r => {
      if (r.data) setRates({ perDay: r.data.perDay || 500, perProduct: r.data.perProduct || 100 })
    }).catch(() => { })
  }, [])

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

  // Load existing promotion data in edit mode
  useEffect(() => {
    if (!isEditMode || !id) return

    setLoadingBanner(true)
    api.get(`/admin/hero-promotions/applications`)
      .then(r => {
        const allItems = r.data?.items || []
        const banner = allItems.find(item => item.id === Number(id))

        if (banner) {
          // Restore saved mediaMode, or infer from which asset is populated
          const savedMode = banner.mediaMode || (Boolean(banner.videoUrl && String(banner.videoUrl).trim()) ? 'video' : 'image')
          setMediaMode(savedMode)

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
            trustPoints: Array.isArray(banner.trustPoints) ? banner.trustPoints.slice(0, 3) : [],
            bannerLocation: (() => {
              const raw = banner.bannerLocation || (banner.promoType === 'fastfood' ? 'fastfood' : 'homepage')
              if (Array.isArray(raw)) return raw
              if (typeof raw === 'string') {
                try {
                  const parsed = JSON.parse(raw)
                  if (Array.isArray(parsed)) return parsed
                } catch {}
                if (raw.includes(',')) return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
                return [raw.toLowerCase().trim()]
              }
              return ['homepage']
            })(),
            videoUrl: banner.videoUrl || '',
            videoType: banner.videoType || 'background',
            videoAutoplay: banner.videoAutoplay !== undefined ? banner.videoAutoplay : true,
            videoLoop: banner.videoLoop !== undefined ? banner.videoLoop : true,
            videoMuted: banner.videoMuted !== undefined ? banner.videoMuted : true
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

  const isSpecificDates = form.scheduleType === 'specific_dates'

  const effectiveDays = useMemo(() => {
    if (isSpecificDates) {
      return form.specificDates.length || 1
    }
    return Number(form.durationDays) || 7
  }, [isSpecificDates, form.specificDates.length, form.durationDays])

  const sortedSpecificDates = useMemo(() => {
    return [...(form.specificDates || [])].sort()
  }, [form.specificDates])

  const effectiveEndDate = useMemo(() => {
    if (isSpecificDates) {
      if (!sortedSpecificDates.length) return null
      const last = sortedSpecificDates[sortedSpecificDates.length - 1]
      const time = form.timeSlotEnd || '23:59'
      return new Date(`${last}T${time}:00`)
    }
    return calcEndDate(form.startAt, form.durationDays)
  }, [isSpecificDates, sortedSpecificDates, form.timeSlotEnd, form.startAt, form.durationDays])

  const chargeBreakdown = useMemo(() => {
    if (form.mode !== 'charged') return null
    const days = effectiveDays
    const numItems = form.promoType === 'product' ? form.productIds.length : form.fastFoodIds.length
    const isVideo = Boolean(form.videoUrl)
    const base = days * (rates.perDay || 500)
    const productFee = days * numItems * (rates.perProduct || 100)
    const videoFee = isVideo ? days * (rates.videoSurcharge || 150) : 0
    const subtotal = base + productFee + videoFee

    let discountPercent = 0
    if (days >= 30) discountPercent = rates.discount30d || 25
    else if (days >= 14) discountPercent = rates.discount14d || 15
    else if (days >= 7) discountPercent = rates.discount7d || 10

    const discountAmount = Math.round(subtotal * (discountPercent / 100))
    const total = Math.max(0, subtotal - discountAmount)

    return { days, numItems, isVideo, base, productFee, videoFee, subtotal, discountPercent, discountAmount, total }
  }, [form.mode, effectiveDays, form.productIds.length, form.fastFoodIds.length, form.promoType, form.videoUrl, rates])

  const toggleProduct = (pid) => {
    setForm(prev => {
      const isAdding = !prev.productIds.includes(pid)
      const nextIds = isAdding
        ? [...prev.productIds, pid]
        : prev.productIds.filter(x => x !== pid)

      // Auto-fill content fields from first selected product (only if fields are empty)
      if (isAdding && nextIds.length === 1) {
        const p = sellerProducts.find(x => x.id === pid)
        if (p) {
          return {
            ...prev,
            productIds: nextIds,
            title: prev.title || p.name || '',
            subtitle: prev.subtitle || p.shortDescription || p.description || '',
            ctaText: prev.ctaText || 'Buy Now',
            targetUrl: prev.targetUrl || `/products/${p.id}`,
            eyebrow: prev.eyebrow || '🔥 FEATURED DEAL',
          }
        }
      }
      return { ...prev, productIds: nextIds }
    })
  }

  const toggleFastFood = (fid) => {
    setForm(prev => {
      const isAdding = !prev.fastFoodIds.includes(fid)
      const nextIds = isAdding
        ? [...prev.fastFoodIds, fid]
        : prev.fastFoodIds.filter(x => x !== fid)

      // Auto-fill content fields from first selected fast food item (only if fields are empty)
      if (isAdding && nextIds.length === 1) {
        const f = fastfoods.find(x => x.id === fid)
        if (f) {
          return {
            ...prev,
            fastFoodIds: nextIds,
            title: prev.title || f.name || '',
            subtitle: prev.subtitle || f.shortDescription || f.description || '',
            ctaText: prev.ctaText || 'Order Now',
            targetUrl: prev.targetUrl || `/fastfood/${f.id}`,
            eyebrow: prev.eyebrow || '🍔 TASTY SPECIAL',
          }
        }
      }
      return { ...prev, fastFoodIds: nextIds }
    })
  }

  // ── AI Marketing Assistant Handlers ──
  const fetchAiSuggestionsData = async () => {
    const selectedItems = form.promoType === 'fastfood'
      ? fastfoods.filter(f => form.fastFoodIds.includes(f.id))
      : sellerProducts.filter(p => form.productIds.includes(p.id))

    const res = await api.post('/admin/hero-promotions/ai-suggest', {
      promoType: form.promoType,
      type: form.type,
      items: selectedItems,
      productIds: form.productIds,
      fastFoodIds: form.fastFoodIds,
      bannerLocation: form.bannerLocation,
      currentValues: {
        title: form.title,
        subtitle: form.subtitle
      }
    })
    return res.data?.suggestions
  }

  const handleFetchAiSuggestions = async (autoOpenModal = true) => {
    setAiLoading(true)
    setError('')
    try {
      const data = await fetchAiSuggestionsData()
      if (data) {
        setAiSuggestions(data)
        if (autoOpenModal) setAiModalOpen(true)
        return data
      }
    } catch (err) {
      console.error('Failed to get AI suggestions:', err)
      setError('Could not generate AI suggestions right now. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleQuickAutoFillAI = async (preserveChosen = true) => {
    let data = aiSuggestions
    if (!data) {
      data = await handleFetchAiSuggestions(false)
    }
    if (!data) return

    setForm(prev => {
      const defaultUrl = prev.targetUrl || (
        prev.promoType === 'fastfood' && prev.fastFoodIds.length
          ? `/fastfood/${prev.fastFoodIds[0]}`
          : (prev.productIds.length ? `/products/${prev.productIds[0]}` : '/products')
      )

      return {
        ...prev,
        title: (preserveChosen && prev.title?.trim()) ? prev.title : (data.headingSuggestions?.[0] || prev.title),
        subtitle: (preserveChosen && prev.subtitle?.trim()) ? prev.subtitle : (data.shortDescriptionSuggestions?.[0] || prev.subtitle),
        eyebrow: (preserveChosen && prev.eyebrow?.trim()) ? prev.eyebrow : (data.eyebrowSuggestions?.[0] || prev.eyebrow),
        ctaText: (preserveChosen && prev.ctaText?.trim()) ? prev.ctaText : (data.ctaSuggestions?.[0] || prev.ctaText || 'Shop Now'),
        targetUrl: defaultUrl,
        trustPoints: (preserveChosen && Array.isArray(prev.trustPoints) && prev.trustPoints.length > 0)
          ? prev.trustPoints
          : (data.trustBadgeSets?.[0]?.slice(0, 3) || prev.trustPoints)
      }
    })

    setSuccess('✨ Applied AI suggestions! Your selected fields remained intact.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const applyTrustBadgeSet = (badgeSet) => {
    if (!Array.isArray(badgeSet)) return
    setForm(prev => ({
      ...prev,
      trustPoints: badgeSet.slice(0, 3)
    }))
    setSuccess('Applied 3 trust badges!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const toggleTrustBadge = (badge) => {
    setForm(prev => {
      const current = Array.isArray(prev.trustPoints) ? prev.trustPoints : []
      const exists = current.some(b => b.text === badge.text)
      if (exists) {
        return { ...prev, trustPoints: current.filter(b => b.text !== badge.text) }
      }
      if (current.length >= 3) {
        setSuccess('Max 3 badges — remove one first.')
        setTimeout(() => setSuccess(''), 2000)
        return prev
      }
      return { ...prev, trustPoints: [...current, badge] }
    })
  }

  // Click-outside handler for field dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (suggestDropdownRef.current && !suggestDropdownRef.current.contains(e.target)) {
        setFieldDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Independent per-field AI suggest — fetches suggestions and opens a dropdown for that field only
  const openFieldSuggest = async (field) => {
    // Toggle off if already open
    if (fieldDropdown === field) {
      setFieldDropdown(null)
      return
    }

    // If we already have suggestions for this field, just open the dropdown
    const existing = fieldSuggestions[field]
    if (existing && existing.length > 0) {
      setFieldDropdown(field)
      return
    }

    // Fetch AI suggestions independently for this field
    setFieldLoading(prev => ({ ...prev, [field]: true }))
    try {
      let data = aiSuggestions
      if (!data) {
        data = await fetchAiSuggestionsData()
        if (data) setAiSuggestions(data)
      }
      if (!data) return

      const map = {
        title:    (data.headingSuggestions || []).slice(0, 6),
        subtitle: (data.shortDescriptionSuggestions || []).slice(0, 6),
        eyebrow:  (data.eyebrowSuggestions || []).slice(0, 6),
        ctaText:  (data.ctaSuggestions || []).slice(0, 6),
      }
      setFieldSuggestions(prev => ({ ...prev, [field]: map[field] || [] }))
      setFieldDropdown(field)
    } catch {
      setError('Could not load suggestions. Try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setFieldLoading(prev => ({ ...prev, [field]: false }))
    }
  }

  const applyFieldSuggestion = (field, value) => {
    setForm(p => ({ ...p, [field]: value }))
    setFieldDropdown(null)
  }

  const handleQuickSuggestField = async (field) => {
    if (field === 'trustBadges') {
      let data = aiSuggestions
      if (!data) data = await handleFetchAiSuggestions(false)
      if (!data) return
      const sets = data.trustBadgeSets || []
      if (sets.length > 0) {
        const nextSet = sets[Math.floor(Math.random() * sets.length)]
        applyTrustBadgeSet(nextSet)
      }
    } else {
      openFieldSuggest(field)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadFile(file)
      setForm(prev => ({ ...prev, customImageUrl: url }))
      setMediaMode('image')
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
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg']
    if (!validTypes.includes(file.type)) {
      return setError('Please upload MP4, WEBM, or OGG video files only')
    }
    if (file.size > 50 * 1024 * 1024) {
      return setError('Video file must be less than 50MB')
    }
    setUploading(true)
    setError('')
    try {
      const url = await uploadFile(file)
      setForm(prev => ({ ...prev, videoUrl: url }))
      setMediaMode('video')
      setSuccess('Video uploaded successfully!')
      setTimeout(() => setSuccess(''), 2500)
    } catch {
      setError('Video upload failed')
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

    // Required fields for ALL banner types
    if (!form.title || !form.title.trim()) {
      return setError('Please provide a Banner Heading')
    }
    if (!form.subtitle || !form.subtitle.trim()) {
      return setError('Please provide a Short Description')
    }
    if (!form.eyebrow || !form.eyebrow.trim()) {
      return setError('Please provide an Eyebrow Pill Badge (e.g. 🔥 EXCLUSIVE DEAL)')
    }
    if (!form.ctaText || !form.ctaText.trim()) {
      return setError('Please provide CTA Button Text (e.g. Shop Now, Order Now)')
    }
    if (!form.targetUrl || !form.targetUrl.trim()) {
      return setError('Please provide a CTA Target Link URL')
    }
    if (!form.bannerLocation || (Array.isArray(form.bannerLocation) && form.bannerLocation.length === 0)) {
      return setError('Please select at least one banner placement location')
    }

    if (form.type === 'seller') {
      if (!form.sellerId) return setError('Please select a seller')
      if (mediaMode === 'image') {
        if (form.promoType === 'product' && !form.productIds.length && !form.customImageUrl) return setError('Select at least one product or upload a custom image')
        if (form.promoType === 'fastfood' && !form.fastFoodIds.length && !form.customImageUrl) return setError('Select at least one fast food item or upload a custom image')
      } else {
        if (!form.videoUrl) return setError('Please upload an MP4 or provide a video URL for this video banner')
      }
    } else {
      if (mediaMode === 'image') {
        if (!form.customImageUrl && !form.productIds.length) return setError('Upload a custom banner image for this banner')
      } else {
        if (!form.videoUrl) return setError('Upload an MP4 or enter a video URL for this video banner')
      }
    }

    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const effectiveDuration = isSpecificDates
        ? (form.specificDates.length || 1)
        : (Number(form.durationDays) || 7)

      const payload = {
        sellerId: form.type === 'seller' ? Number(form.sellerId) : null,
        productIds: form.productIds,
        durationDays: effectiveDuration,
        slotsCount: Number(form.slotsCount) || 1,
        title: form.title,
        subtitle: form.subtitle,
        // Preserve both assets — mediaMode tells the renderer which one is active
        customImageUrl: form.customImageUrl || null,
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
        free: form.mode === 'free',
        amount: form.mode === 'free' ? 0 : (chargeBreakdown?.total || 0),
        paymentStatus: form.mode === 'free' ? 'free' : 'paid',
        trustPoints: form.trustPoints,
        // Advanced scheduling
        scheduleType: form.scheduleType || 'specific_dates',
        recurringDays: form.recurringDays,
        specificDates: form.specificDates,
        timeSlotStart: form.timeSlotStart,
        timeSlotEnd: form.timeSlotEnd,
        timezone: form.timezone,
        dateTimeMode: form.dateTimeMode,
        dateSpecificTimes: form.dateSpecificTimes,
        // Video fields — always preserved, mediaMode determines which is rendered
        videoUrl: form.videoUrl || null,
        videoType: form.videoType || 'background',
        videoAutoplay: form.videoAutoplay !== undefined ? form.videoAutoplay : true,
        videoLoop: form.videoLoop !== undefined ? form.videoLoop : true,
        videoMuted: form.videoMuted !== undefined ? form.videoMuted : true,
        // Active media mode so renderer/backend knows which asset to use
        mediaMode: mediaMode
      }

      if (isSpecificDates && form.specificDates.length > 0) {
        const sorted = [...form.specificDates].sort()
        payload.startAt = new Date(`${sorted[0]}T${form.timeSlotStart || '00:00'}:00`)
        payload.endAt = new Date(`${sorted[sorted.length - 1]}T${form.timeSlotEnd || '23:59'}:59`)
      } else if (form.startAt) {
        payload.startAt = new Date(form.startAt)
      }

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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-12 pt-6 bg-white rounded-2xl shadow-lg my-4 lg:my-8 box-border">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <FaGlobe className="text-purple-600" /> Target Placement / Page Location
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Select one or more pages where this hero banner should appear (e.g. Products & Fast Food):
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500">Active on:</span>
              {Array.isArray(form.bannerLocation) && form.bannerLocation.includes('all') ? (
                <span className="text-xs text-purple-700 font-black bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full">
                  All Platform Pages
                </span>
              ) : (
                (Array.isArray(form.bannerLocation) ? form.bannerLocation : [form.bannerLocation || 'homepage']).map(loc => (
                  <span key={loc} className="text-xs text-purple-700 font-black bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full uppercase">
                    {loc}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { value: 'homepage', label: 'Homepage', icon: <FaHome />, desc: 'Main Landing Hero', color: 'blue' },
              { value: 'fastfood', label: 'Fast Food', icon: <FaUtensils />, desc: 'Fast Food Section', color: 'amber' },
              { value: 'products', label: 'Products', icon: <FaShoppingBag />, desc: 'Products Catalog', color: 'emerald' },
              { value: 'services', label: 'Services', icon: <FaTools />, desc: 'Campus Services', color: 'indigo' },
              { value: 'all', label: 'All Pages', icon: <FaGlobe />, desc: 'Global Hero Banner', color: 'purple' },
            ].map(loc => {
              const selected = isLocationSelected(loc.value)
              return (
                <button
                  type="button"
                  key={loc.value}
                  onClick={() => toggleBannerLocation(loc.value)}
                  className={`relative flex flex-col items-center text-center p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                    selected
                      ? 'border-purple-600 bg-purple-50/80 shadow-md ring-2 ring-purple-400/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {selected && (
                    <FaCheckCircle className="absolute top-2 right-2 text-purple-600 text-xs" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${
                    selected ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {loc.icon}
                  </div>
                  <span className="font-black text-xs text-slate-900">{loc.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{loc.desc}</span>
                  <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded ${
                    selected ? 'bg-purple-200 text-purple-800' : 'text-slate-400'
                  }`}>
                    {selected ? 'Active' : 'Click to add'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT: Visuals + Text */}
          <div className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-widest">
                    Step 2 — Banner Visual Asset
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    A banner can have either a <span className="font-bold text-emerald-700">Custom Banner Image</span> or a <span className="font-bold text-purple-700">Video Banner</span>, but not both.
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full w-fit ${
                  mediaMode === 'video' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {mediaMode === 'video' ? '🎬 Video Mode Active' : '🖼️ Image Mode Active'}
                </span>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => switchMediaMode('image')}
                  className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    mediaMode === 'image'
                      ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FaImage /> Custom Banner Image
                </button>
                <button
                  type="button"
                  onClick={() => switchMediaMode('video')}
                  className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    mediaMode === 'video'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FaPlay /> Video Banner (Optional)
                </button>
              </div>

              {/* IMAGE MODE */}
              {mediaMode === 'image' && (
                <div className="space-y-3">
                  <div className={`relative rounded-2xl overflow-hidden border-2 ${previewImage ? 'border-transparent shadow-md' : 'border-dashed border-gray-300'} bg-gray-50 min-h-[220px] flex items-center justify-center`}>
                    {previewImage ? (
                      <>
                        <img src={previewImage} alt="Banner preview" className="w-full h-56 object-cover" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4 pointer-events-none">
                          <div className="text-white">
                            <div className="font-black text-lg drop-shadow">{form.title || 'Banner Heading'}</div>
                            {form.subtitle && <div className="text-sm text-white/80 line-clamp-2">{form.subtitle}</div>}
                          </div>
                        </div>
                        {form.customImageUrl && (
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, customImageUrl: '' }))}
                            className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg transition-transform active:scale-95 z-10"
                          >
                            ✕ Remove Image
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-10 px-6">
                        <FaImage size={36} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-600">
                          {form.type === 'seller' ? 'Select a product on the right to preview its cover image' : 'Upload custom banner image'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Recommended size: 1920×600px (JPG, PNG, WEBP)</p>
                      </div>
                    )}

                    {!form.customImageUrl && (
                      <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 flex items-center justify-center bg-black/40 transition-opacity rounded-2xl">
                        <div className="bg-white/95 px-4 py-2 rounded-xl font-black text-gray-800 text-sm shadow-xl">Click to Upload Image</div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-2xl z-20">
                        <div className="flex items-center gap-2 text-emerald-700 font-black"><FaSpinner className="animate-spin text-lg" /> Uploading image...</div>
                      </div>
                    )}
                  </div>

                  {!form.customImageUrl && (
                    <label className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 font-bold text-sm cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all bg-emerald-50/40">
                      <FaImage /> Browse & Upload Custom Banner Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
              )}

              {/* VIDEO MODE */}
              {mediaMode === 'video' && (
                <div className="space-y-4">
                  <div className={`relative rounded-2xl overflow-hidden border-2 ${form.videoUrl ? 'border-purple-300 shadow-md' : 'border-dashed border-purple-200'} bg-black min-h-[220px] flex items-center justify-center`}>
                    {form.videoUrl ? (
                      <>
                        <div className="w-full h-56">
                          <VideoBannerPreview
                            videoUrl={form.videoUrl}
                            videoType={form.videoType}
                            autoPlay={form.videoAutoplay}
                            loop={form.videoLoop}
                            muted={form.videoMuted}
                            badge={false}
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4 pointer-events-none">
                          <div className="text-white">
                            <div className="font-black text-lg drop-shadow">{form.title || 'Video Banner Heading'}</div>
                            {form.subtitle && <div className="text-sm text-white/80 line-clamp-2">{form.subtitle}</div>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, videoUrl: '' }))}
                          className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg transition-transform active:scale-95 z-20"
                        >
                          ✕ Remove Video
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-10 px-6 bg-gradient-to-br from-purple-900/40 to-indigo-950/50 w-full h-full flex flex-col items-center justify-center min-h-[220px]">
                        <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 mb-3">
                          <FaPlay className="text-lg ml-0.5" />
                        </div>
                        <p className="text-sm font-bold text-purple-200">
                          Upload an MP4 or enter a video link below
                        </p>
                        <p className="text-xs text-purple-300/70 mt-1">Supports MP4, WEBM, YouTube, TikTok, and Vimeo</p>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl z-20">
                        <div className="flex items-center gap-2 text-purple-300 font-black"><FaSpinner className="animate-spin text-lg" /> Uploading video...</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                      <span>📹</span> Video URL or Upload MP4
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        className="flex-grow p-3 border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 bg-white"
                        placeholder="https://youtube.com/watch?v=... or direct MP4 URL"
                        value={form.videoUrl}
                        onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
                      />
                      <label className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs cursor-pointer flex items-center justify-center gap-2 flex-shrink-0 shadow-sm transition-all active:scale-95">
                        <FaVideo />
                        <span>Upload MP4</span>
                        <input type="file" accept="video/mp4,video/webm,video/ogg" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Max upload size: 50MB. External YouTube/TikTok/Vimeo URLs can be pasted directly.</p>
                  </div>

                  {form.videoUrl && (
                    <div className="space-y-3 pt-3 border-t border-purple-200">
                      <div>
                        <label className="block text-xs font-bold text-purple-900 mb-2">Video Display Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'background', label: 'Full Background', desc: 'Hero canvas layer' },
                            { value: 'overlay', label: 'Media Area', desc: 'Product frame area' },
                            { value: 'embed', label: 'Embed Player', desc: 'Interactive player' }
                          ].map(opt => (
                            <label
                              key={opt.value}
                              className={`flex flex-col p-2.5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                                form.videoType === opt.value
                                  ? 'border-purple-600 bg-purple-100 font-bold text-purple-950'
                                  : 'border-purple-200 bg-white hover:border-purple-300 text-gray-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="videoType"
                                value={opt.value}
                                checked={form.videoType === opt.value}
                                onChange={e => setForm(p => ({ ...p, videoType: e.target.value }))}
                                className="hidden"
                              />
                              <span className="text-xs font-black">{opt.label}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-purple-200 cursor-pointer text-xs font-bold text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.videoAutoplay}
                            onChange={e => setForm(p => ({ ...p, videoAutoplay: e.target.checked }))}
                            className="rounded text-purple-600"
                          />
                          <span>Autoplay</span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-purple-200 cursor-pointer text-xs font-bold text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.videoLoop}
                            onChange={e => setForm(p => ({ ...p, videoLoop: e.target.checked }))}
                            className="rounded text-purple-600"
                          />
                          <span>Loop</span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-purple-200 cursor-pointer text-xs font-bold text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.videoMuted}
                            onChange={e => setForm(p => ({ ...p, videoMuted: e.target.checked }))}
                            className="rounded text-purple-600"
                          />
                          <span>Muted</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Marketing Assistant Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 px-4 py-3 rounded-2xl text-white shadow-lg border border-purple-500/30 flex items-center gap-3">
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-fuchsia-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <FaMagic className={`text-base ${aiLoading ? 'animate-spin' : 'animate-pulse'}`} />
              </div>

              {/* Text block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wide text-amber-300 leading-none">✨ AI Copy & Badge Assistant</span>
                  <span className="text-[9px] bg-purple-500/30 text-purple-200 border border-purple-400/40 px-1.5 py-0.5 rounded-full font-bold leading-none whitespace-nowrap">Smart Suggestions</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug truncate">
                  Generate high-converting Headings, Short Descriptions, Badges &amp; Trust Points.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleFetchAiSuggestions(true)}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  {aiLoading ? <FaSpinner className="animate-spin text-[10px]" /> : <FaMagic className="text-[10px] text-amber-300" />}
                  <span>{aiLoading ? 'Generating...' : 'Browse AI Ideas'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickAutoFillAI}
                  disabled={aiLoading}
                  title="Generate and auto-fill all required fields at once"
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 rounded-xl text-[11px] font-black shadow-md transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                >
                  <span>⚡ 1-Click Auto-Fill</span>
                </button>
              </div>
            </div>

            {/* Heading + Short Description + URL */}
            <div className="space-y-3">
              <div ref={fieldDropdown === 'title' ? suggestDropdownRef : null}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Banner Heading <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openFieldSuggest('title')}
                        disabled={fieldLoading.title}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all active:scale-95 border ${
                          fieldDropdown === 'title'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-200'
                        }`}
                      >
                        {fieldLoading.title ? <FaSpinner className="text-[9px] animate-spin" /> : <FaMagic className="text-[9px]" />}
                        AI Suggest
                      </button>
                      {fieldDropdown === 'title' && fieldSuggestions.title?.length > 0 && (
                        <div ref={suggestDropdownRef} className="absolute right-0 top-7 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">✨ Choose a Heading</div>
                          {fieldSuggestions.title.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => applyFieldSuggestion('title', s)}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-purple-50 transition-colors border-b border-gray-50 last:border-0 ${
                                form.title === s ? 'bg-purple-50 text-purple-700 font-black' : 'text-gray-800'
                              }`}
                            >
                              {form.title === s && <span className="text-purple-500 mr-1">✓</span>}{s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {form.type === 'seller' && form.title && (form.productIds.length > 0 || form.fastFoodIds.length > 0) && (
                      <span className="text-[10px] text-blue-500 font-semibold flex items-center gap-1">
                        <span>⚡</span> Auto-filled
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. MEGA CAMPUS SAVINGS"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div ref={fieldDropdown === 'subtitle' ? suggestDropdownRef : null}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Short Description <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openFieldSuggest('subtitle')}
                        disabled={fieldLoading.subtitle}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all active:scale-95 border ${
                          fieldDropdown === 'subtitle'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-200'
                        }`}
                      >
                        {fieldLoading.subtitle ? <FaSpinner className="text-[9px] animate-spin" /> : <FaMagic className="text-[9px]" />}
                        AI Suggest
                      </button>
                      {fieldDropdown === 'subtitle' && fieldSuggestions.subtitle?.length > 0 && (
                        <div ref={suggestDropdownRef} className="absolute right-0 top-7 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">✨ Choose a Description</div>
                          {fieldSuggestions.subtitle.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => applyFieldSuggestion('subtitle', s)}
                              className={`w-full text-left px-3 py-2.5 text-xs leading-snug hover:bg-purple-50 transition-colors border-b border-gray-50 last:border-0 ${
                                form.subtitle === s ? 'bg-purple-50 text-purple-700 font-black' : 'text-gray-700 font-medium'
                              }`}
                            >
                              {form.subtitle === s && <span className="text-purple-500 mr-1">✓</span>}{s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {form.type === 'seller' && form.subtitle && (form.productIds.length > 0 || form.fastFoodIds.length > 0) && (
                      <span className="text-[10px] text-blue-500 font-semibold flex items-center gap-1">
                        <span>⚡</span> Auto-filled
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  required
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
                  placeholder="Short description of this promotion..."
                  value={form.subtitle}
                  onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
                />
              </div>
            </div>

            {/* Buttons, Eyebrow & Badges */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FaUserTag className="text-emerald-600" /> Buttons, Eyebrow & Badges
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div ref={fieldDropdown === 'eyebrow' ? suggestDropdownRef : null}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Eyebrow Pill Badge <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openFieldSuggest('eyebrow')}
                        disabled={fieldLoading.eyebrow}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all active:scale-95 border ${
                          fieldDropdown === 'eyebrow'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-200'
                        }`}
                      >
                        {fieldLoading.eyebrow ? <FaSpinner className="text-[9px] animate-spin" /> : <FaMagic className="text-[9px]" />}
                        AI Suggest
                      </button>
                      {fieldDropdown === 'eyebrow' && fieldSuggestions.eyebrow?.length > 0 && (
                        <div ref={suggestDropdownRef} className="absolute right-0 top-7 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">✨ Choose a Badge Label</div>
                          {fieldSuggestions.eyebrow.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => applyFieldSuggestion('eyebrow', s)}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-purple-50 transition-colors border-b border-gray-50 last:border-0 ${
                                form.eyebrow === s ? 'bg-purple-50 text-purple-700 font-black' : 'text-gray-800'
                              }`}
                            >
                              {form.eyebrow === s && <span className="text-purple-500 mr-1">✓</span>}{s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="e.g. 🔥 EXCLUSIVE DEAL or ✨ NEW LAUNCH"
                    value={form.eyebrow}
                    onChange={e => setForm(p => ({ ...p, eyebrow: e.target.value }))}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Badge displayed at the top of banner</p>
                </div>

                <div ref={fieldDropdown === 'ctaText' ? suggestDropdownRef : null}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">
                      CTA Button Text <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openFieldSuggest('ctaText')}
                        disabled={fieldLoading.ctaText}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all active:scale-95 border ${
                          fieldDropdown === 'ctaText'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-200'
                        }`}
                      >
                        {fieldLoading.ctaText ? <FaSpinner className="text-[9px] animate-spin" /> : <FaMagic className="text-[9px]" />}
                        AI Suggest
                      </button>
                      {fieldDropdown === 'ctaText' && fieldSuggestions.ctaText?.length > 0 && (
                        <div ref={suggestDropdownRef} className="absolute right-0 top-7 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">✨ Choose CTA Text</div>
                          {fieldSuggestions.ctaText.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => applyFieldSuggestion('ctaText', s)}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-purple-50 transition-colors border-b border-gray-50 last:border-0 ${
                                form.ctaText === s ? 'bg-purple-50 text-purple-700 font-black' : 'text-gray-800'
                              }`}
                            >
                              {form.ctaText === s && <span className="text-purple-500 mr-1">✓</span>}{s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="e.g. Shop Now, Explore Options, Learn More"
                    value={form.ctaText}
                    onChange={e => setForm(p => ({ ...p, ctaText: e.target.value }))}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Text displayed inside action button</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <FaLink className="text-gray-400" /> CTA Target Link URL <span className="text-red-500">*</span>
                  {form.type === 'seller' && form.targetUrl && (form.productIds.length > 0 || form.fastFoodIds.length > 0) && (
                    <span className="ml-auto text-[10px] text-blue-500 font-semibold flex items-center gap-1">
                      <span>⚡</span> Auto-linked to item
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="e.g. /fastfood, /products, /services or https://..."
                  value={form.targetUrl}
                  onChange={e => setForm(p => ({ ...p, targetUrl: e.target.value }))}
                />
                <p className="text-[10px] text-gray-500 mt-1">Destination page URL opened when CTA button is clicked</p>
              </div>

              {/* Custom Trust Points */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Custom Trust Badges <span className="text-gray-400 font-normal">({form.trustPoints.length}/3 max)</span>
                    </label>
                    {form.trustPoints.length >= 3 && (
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Limit reached (3 max)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickSuggestField('trustBadges')}
                    disabled={aiLoading}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all active:scale-95"
                  >
                    <FaMagic className="text-[9px]" /> ✨ Auto-fill 3 Trust Badges
                  </button>
                </div>
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
                    disabled={form.trustPoints.length >= 3}
                    className="w-16 p-2 border rounded-lg text-center text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="Icon"
                    value={newTrustIcon}
                    onChange={e => setNewTrustIcon(e.target.value)}
                  />
                  <input
                    type="text"
                    disabled={form.trustPoints.length >= 3}
                    className="flex-grow p-2 border rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder={form.trustPoints.length >= 3 ? "Maximum 3 badges added" : "Badge label e.g. Fast Delivery, Verified"}
                    value={newTrustText}
                    onChange={e => setNewTrustText(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={form.trustPoints.length >= 3}
                    onClick={() => {
                      if (!newTrustText.trim() || form.trustPoints.length >= 3) return
                      setForm(p => ({
                        ...p,
                        trustPoints: [...p.trustPoints, { icon: newTrustIcon || '📍', text: newTrustText.trim() }].slice(0, 3)
                      }))
                      setNewTrustText('')
                    }}
                    className={`px-4 py-2 text-white rounded-lg font-bold text-xs transition-colors ${
                      form.trustPoints.length >= 3
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    + Add
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">Up to 3 badges will display side-by-side in a single horizontal line on the hero banner.</p>
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
                          const price = p.discountPrice || p.displayPrice || p.basePrice || p.price
                          return (
                            <label key={p.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                              <input type="checkbox" className="w-4 h-4 rounded text-blue-600 flex-shrink-0" checked={isChecked} onChange={() => toggleProduct(p.id)} />
                              <img src={resolveImageUrl(p.coverImage)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-gray-900 truncate">{p.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">#{p.id}</span>
                                  {price && <span className="text-xs font-bold text-emerald-600">KES {Number(price).toLocaleString()}</span>}
                                  {p.discountPercentage > 0 && <span className="text-[10px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">-{p.discountPercentage}%</span>}
                                </div>
                              </div>
                              {isChecked && <span className="text-blue-500 text-xs font-black flex-shrink-0">✓ Featured</span>}
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic p-3 text-center border rounded-xl">No products found for this seller</div>
                    )}
                    {/* Selected product summary card */}
                    {selectedProducts.length > 0 && (() => {
                      const fp = selectedProducts[0]
                      const price = fp.discountPrice || fp.displayPrice || fp.basePrice || fp.price
                      return (
                        <div className="mt-3 p-3 bg-blue-600 rounded-xl text-white flex items-center gap-3 shadow-lg">
                          <img src={resolveImageUrl(fp.coverImage)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-white/30" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black uppercase tracking-wide text-blue-200">Featured Product</div>
                            <div className="font-bold text-sm truncate">{fp.name}</div>
                            {price && <div className="text-amber-300 font-black text-sm">KES {Number(price).toLocaleString()}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[10px] text-blue-200">Add to Cart button</span>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">will appear on banner</span>
                          </div>
                        </div>
                      )
                    })()}
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
                          const price = f.discountPrice || f.displayPrice || f.basePrice || f.price
                          return (
                            <label key={f.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isChecked ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                              <input type="checkbox" className="w-4 h-4 rounded text-orange-600 flex-shrink-0" checked={isChecked} onChange={() => toggleFastFood(f.id)} />
                              <img src={resolveImageUrl(f.mainImage)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-gray-900 truncate">{f.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">#{f.id}</span>
                                  {price && <span className="text-xs font-bold text-orange-600">KES {Number(price).toLocaleString()}</span>}
                                  {f.discountPercentage > 0 && <span className="text-[10px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">-{f.discountPercentage}%</span>}
                                </div>
                              </div>
                              {isChecked && <span className="text-orange-500 text-xs font-black flex-shrink-0">✓ Featured</span>}
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic p-3 text-center border rounded-xl">No items found for this seller</div>
                    )}
                    {/* Selected fastfood summary card */}
                    {form.fastFoodIds.length > 0 && (() => {
                      const ff = fastfoods.find(x => x.id === form.fastFoodIds[0])
                      if (!ff) return null
                      const price = ff.discountPrice || ff.displayPrice || ff.basePrice || ff.price
                      return (
                        <div className="mt-3 p-3 bg-orange-600 rounded-xl text-white flex items-center gap-3 shadow-lg">
                          <img src={resolveImageUrl(ff.mainImage)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-white/30" onError={e => { e.target.src = FALLBACK_IMAGE }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black uppercase tracking-wide text-orange-200">Featured Item</div>
                            <div className="font-bold text-sm truncate">{ff.name}</div>
                            {price && <div className="text-amber-300 font-black text-sm">KES {Number(price).toLocaleString()}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[10px] text-orange-200">Order Now button</span>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">will appear on banner</span>
                          </div>
                        </div>
                      )
                    })()}
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
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
                <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">System Settings</label>
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

                <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Platform Banner Pricing Mode</div>
                  <div className="flex flex-wrap gap-6">
                    {[{ value: 'free', label: '🎁 Free / Complimentary (KES 0)' }, { value: 'charged', label: '💳 Charged / Commercial (Charge Fee)' }].map(m => (
                      <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="pay-mode-system" value={m.value} checked={form.mode === m.value} onChange={() => setForm(p => ({ ...p, mode: m.value }))} className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-700">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Scheduler (Placed before duration & billing for intuitive flow) */}
            <AdvancedScheduler
              isVideo={Boolean(form.videoUrl)}
              value={{
                scheduleType: form.scheduleType,
                recurringDays: form.recurringDays,
                specificDates: form.specificDates,
                timeSlotStart: form.timeSlotStart,
                timeSlotEnd: form.timeSlotEnd,
                timezone: form.timezone,
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

            {/* Duration, Slots & Charge */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                Duration & Slots Summary
              </label>

              {isSpecificDates ? (
                /* Specific Dates Mode: Duration is automatically derived from chosen dates */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Scheduled Days</span>
                      <span className="text-lg font-black text-indigo-700">
                        {form.specificDates.length} {form.specificDates.length === 1 ? 'day' : 'days'}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Auto-calculated from dates</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Concurrent Slots</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-gray-400 font-bold bg-white text-sm"
                        value={form.slotsCount}
                        onChange={e => setForm(p => ({ ...p, slotsCount: e.target.value }))}
                      />
                      <span className="text-[10px] text-gray-400 block mt-0.5">Slider positions allocated</span>
                    </div>
                  </div>

                  {/* Active period info */}
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="font-bold">Active Dates Span:</span>
                      <span className="font-black text-gray-900">
                        {sortedSpecificDates.length > 0 ? (
                          `${sortedSpecificDates[0]} → ${sortedSpecificDates[sortedSpecificDates.length - 1]}`
                        ) : (
                          <span className="text-amber-600 font-medium italic">Select dates above</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500 text-[11px]">
                      <span className="font-bold">Daily Active Window:</span>
                      <span className="font-semibold text-indigo-700">
                        {form.timeSlotStart || form.timeSlotEnd
                          ? `${form.timeSlotStart || '00:00'} to ${form.timeSlotEnd || '23:59'} (${form.timezone})`
                          : 'Full Day 24/7 (00:00 to 23:59)'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Continuous Period Mode: Manual duration days input */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-400 font-bold bg-white"
                        value={form.durationDays}
                        onChange={e => setForm(p => ({ ...p, durationDays: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Slots</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-gray-400 font-bold bg-white"
                        value={form.slotsCount}
                        onChange={e => setForm(p => ({ ...p, slotsCount: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border text-sm">
                    <span className="text-gray-500 font-medium">Calculated End Date</span>
                    <span className="font-black text-gray-900">
                      {effectiveEndDate ? effectiveEndDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* Charge breakdown — for any charged promotion */}
              {chargeBreakdown && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between text-blue-700 font-black text-xs uppercase tracking-widest mb-2">
                    <span className="flex items-center gap-1.5"><FaCalculator /> Charge Breakdown</span>
                    {chargeBreakdown.discountPercent > 0 && (
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        🎉 {chargeBreakdown.discountPercent}% OFF APPLIED
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Rate ({chargeBreakdown.days} days × {formatKES(rates.perDay || 500)}/day)</span>
                      <span className="font-bold">{formatKES(chargeBreakdown.base)}</span>
                    </div>
                    {chargeBreakdown.numItems > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{chargeBreakdown.numItems} product slot{chargeBreakdown.numItems > 1 ? 's' : ''} × {chargeBreakdown.days} days × {formatKES(rates.perProduct || 100)}</span>
                        <span className="font-bold">{formatKES(chargeBreakdown.productFee)}</span>
                      </div>
                    )}
                    {chargeBreakdown.isVideo && (
                      <div className="flex justify-between text-purple-700">
                        <span>Video Banner Surcharge ({chargeBreakdown.days} days × {formatKES(rates.videoSurcharge || 150)}/day)</span>
                        <span className="font-bold">+{formatKES(chargeBreakdown.videoFee)}</span>
                      </div>
                    )}
                    {chargeBreakdown.discountPercent > 0 && (
                      <>
                        <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-blue-200">
                          <span>Subtotal</span>
                          <span>{formatKES(chargeBreakdown.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Duration Discount ({chargeBreakdown.days}d commitment • {chargeBreakdown.discountPercent}% off)</span>
                          <span>-{formatKES(chargeBreakdown.discountAmount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-200 font-black text-base">
                      <span className="text-blue-900">Total Billed Charge</span>
                      <span className="text-blue-900">{formatKES(chargeBreakdown.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {form.mode === 'free' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm font-bold text-emerald-700 text-center">
                  ✅ Free / Pro-bono — No charge applied (KES 0.00)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 pt-6 pb-2 border-t">
          <button type="submit" className="flex-grow py-4 rounded-xl bg-gray-900 hover:bg-black text-white font-black text-lg transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2" disabled={submitting || uploading}>
            {submitting ? <><FaSpinner className="animate-spin" /> {isEditMode ? 'Updating...' : 'Creating...'}</> : (isEditMode ? 'Update Hero Promotion' : 'Launch Hero Promotion')}
          </button>
          <button type="button" className="px-8 py-4 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors" onClick={() => navigate('/dashboard/marketing/hero-promotions')}>
            Cancel
          </button>
        </div>
      </form>
      )}

      {/* ── AI Suggestions Modal ── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-fuchsia-500 flex items-center justify-center text-white shadow-md">
                  <FaMagic className="text-lg" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <span>✨ AI Copy & Badges Assistant</span>
                    <span className="text-[10px] bg-amber-400 text-gray-950 px-2 py-0.5 rounded-full font-black uppercase">
                      Ready
                    </span>
                  </h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Click any suggestion to instantly apply it to your banner form.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick 1-Click Action */}
            <div className="px-5 py-3 bg-purple-50/90 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="text-xs text-purple-950">
                <span className="font-black text-purple-900 mr-1.5">⚡ 1-Click Fill:</span>
                <span className="text-purple-700">Fills all remaining empty fields without touching any selections you already picked.</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleQuickAutoFillAI(true);
                    setAiModalOpen(false);
                  }}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>⚡ Fill Remaining Fields</span>
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-5 space-y-6 overflow-y-auto flex-1">
              {aiLoading && !aiSuggestions ? (
                <div className="py-16 text-center space-y-3">
                  <FaSpinner className="animate-spin text-4xl text-purple-600 mx-auto" />
                  <div className="font-black text-slate-800 text-sm">Generating AI Suggestions...</div>
                  <p className="text-xs text-slate-500">Analyzing your product details, category, and campus context</p>
                </div>
              ) : !aiSuggestions ? (
                <div className="py-12 text-center space-y-3">
                  <FaMagic className="text-4xl text-purple-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No suggestions loaded yet.</p>
                  <button
                    type="button"
                    onClick={() => handleFetchAiSuggestions(true)}
                    className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl"
                  >
                    Generate Now
                  </button>
                </div>
              ) : (
                <>
                  {aiLoading && (
                    <div className="p-3 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-purple-200 animate-pulse">
                      <FaSpinner className="animate-spin text-purple-600" />
                      <span>Fetching brand new suggestions while keeping your chosen selections...</span>
                    </div>
                  )}

                  {/* 1. Headings */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>🏷️</span> Banner Headings
                      </label>
                      <span className="text-[10px] text-slate-400">Click to apply</span>
                    </div>

                    {/* Pinned if user already has a choice not in list */}
                    {form.title && !aiSuggestions.headingSuggestions?.includes(form.title) && (
                      <div className="p-3 rounded-xl border-2 border-purple-500 bg-purple-50 text-purple-950 font-black text-xs flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600 font-bold">✓</span>
                          <span>{form.title}</span>
                        </div>
                        <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                          Current Choice
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiSuggestions.headingSuggestions?.map((heading, i) => {
                        const isSelected = form.title === heading;
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => {
                              setForm(p => ({ ...p, title: heading }));
                              setSuccess(`Applied heading: "${heading}"`);
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            className={`text-left p-3 rounded-xl border-2 transition-all font-black text-xs ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50 text-purple-950 shadow-sm ring-2 ring-purple-300'
                                : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span>{heading}</span>
                              {isSelected && <span className="text-purple-600 text-xs">✓ Chosen</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Short Descriptions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>📝</span> Short Descriptions
                      </label>
                      <span className="text-[10px] text-slate-400">Click to apply</span>
                    </div>

                    {/* Pinned if user has choice not in list */}
                    {form.subtitle && !aiSuggestions.shortDescriptionSuggestions?.includes(form.subtitle) && (
                      <div className="p-3 rounded-xl border-2 border-purple-500 bg-purple-50 text-purple-950 text-xs leading-relaxed flex items-start justify-between gap-2 shadow-xs">
                        <div>
                          <div className="text-[10px] text-purple-700 font-black uppercase mb-0.5">✓ Your Current Description:</div>
                          <p className="font-semibold">{form.subtitle}</p>
                        </div>
                        <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                          Current Choice
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {aiSuggestions.shortDescriptionSuggestions?.map((desc, i) => {
                        const isSelected = form.subtitle === desc;
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => {
                              setForm(p => ({ ...p, subtitle: desc }));
                              setSuccess('Short description applied!');
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all text-xs leading-relaxed ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold shadow-sm ring-2 ring-purple-300'
                                : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span>{desc}</span>
                              {isSelected && <span className="text-purple-600 font-bold text-xs flex-shrink-0">✓ Chosen</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Eyebrow Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>✨</span> Eyebrow Pill Badges
                      </label>
                      <span className="text-[10px] text-slate-400">Click to apply</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* If user picked an eyebrow badge not in current pool, display it pinned first */}
                      {form.eyebrow && !aiSuggestions.eyebrowSuggestions?.includes(form.eyebrow) && (
                        <button
                          type="button"
                          onClick={() => {}}
                          className="px-3.5 py-1.5 rounded-full text-xs font-black bg-purple-600 text-white border-2 border-purple-400 shadow-sm ring-2 ring-purple-300 flex items-center gap-1.5"
                        >
                          <span>{form.eyebrow}</span>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">✓ Current Choice</span>
                        </button>
                      )}

                      {aiSuggestions.eyebrowSuggestions?.map((pill, i) => {
                        const isSelected = form.eyebrow === pill;
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => {
                              setForm(p => ({ ...p, eyebrow: pill }));
                              setSuccess(`Eyebrow badge set to "${pill}"`);
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-300'
                                : 'bg-white hover:bg-purple-50 text-slate-800 border-slate-200 hover:border-purple-300'
                            }`}
                          >
                            {pill} {isSelected && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. CTA Buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>🔘</span> CTA Button Text
                      </label>
                      <span className="text-[10px] text-slate-400">Click to apply</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* If user picked a CTA not in current pool, display it pinned first */}
                      {form.ctaText && !aiSuggestions.ctaSuggestions?.includes(form.ctaText) && (
                        <button
                          type="button"
                          onClick={() => {}}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white border-2 border-emerald-400 shadow-sm ring-2 ring-emerald-300 flex items-center gap-1.5"
                        >
                          <span>{form.ctaText}</span>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">✓ Current Choice</span>
                        </button>
                      )}

                      {aiSuggestions.ctaSuggestions?.map((cta, i) => {
                        const isSelected = form.ctaText === cta;
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => {
                              setForm(p => ({ ...p, ctaText: cta }));
                              setSuccess(`CTA button text set to "${cta}"`);
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                                : 'bg-white hover:bg-emerald-50 text-slate-800 border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            {cta} {isSelected && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Custom Trust Badges — pick any from the sets */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>🛡️</span> Trust Badges
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {Array.isArray(form.trustPoints) ? form.trustPoints.length : 0}/3 selected — click any badge to toggle
                      </span>
                    </div>

                    {/* Current active badges */}
                    {Array.isArray(form.trustPoints) && form.trustPoints.length > 0 && (
                      <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 flex items-center justify-between gap-2 flex-wrap shadow-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase text-emerald-900 mr-1">✓ Selected:</span>
                          {form.trustPoints.map((b, bi) => (
                            <button
                              key={bi}
                              type="button"
                              onClick={() => toggleTrustBadge(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg border border-emerald-500 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
                              title="Click to remove"
                            >
                              <span>{b.icon}</span>
                              <span>{b.text || b}</span>
                              <span className="ml-0.5 opacity-70 text-[10px]">✕</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All badges from all sets as individual chips */}
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.trustBadgeSets?.flatMap((badgeSet, si) =>
                        badgeSet.map((b, bi) => {
                          const isSelected = Array.isArray(form.trustPoints) && form.trustPoints.some(tp => tp.text === b.text)
                          const isFull = Array.isArray(form.trustPoints) && form.trustPoints.length >= 3 && !isSelected
                          return (
                            <button
                              key={`${si}-${bi}`}
                              type="button"
                              onClick={() => toggleTrustBadge(b)}
                              disabled={isFull}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 shadow-sm ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300'
                                  : isFull
                                    ? 'bg-white text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                                    : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'
                              }`}
                            >
                              <span>{b.icon}</span>
                              <span>{b.text}</span>
                              {isSelected && <span className="text-[10px] opacity-80">✓</span>}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleFetchAiSuggestions(true)}
                disabled={aiLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
              >
                {aiLoading ? <FaSpinner className="animate-spin text-xs" /> : <FaMagic className="text-xs text-amber-300" />}
                <span>{aiLoading ? 'Generating Fresh Ideas...' : '✨ Re-generate New Ideas'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="px-6 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl transition-all shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
