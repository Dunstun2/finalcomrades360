import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaTrash, FaUndo, FaTrashAlt } from 'react-icons/fa'
import api, { productApi } from '../../services/api'
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';

export default function RecycleBin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, product: null })
  const [permanentDeleteModal, setPermanentDeleteModal] = useState({ isOpen: false, product: null })

  const location = useLocation()
  const isAdminView = location.pathname.startsWith('/dashboard')

  const fileBase = useMemo(() => {
    const base = api.defaults.baseURL || ''
    return base.replace(/\/?api\/?$/, '')
  }, [])

  const resolveImageUrl = (url) => {
    const FALLBACK = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22 viewBox=%220 0 400 300%22%3E%3Crect width=%22400%22 height=%22300%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%22200%22 y=%22160%22 font-size=%2216%22 text-anchor=%22middle%22 fill=%22%236b7280%22%3ENo Image Available%3C/text%3E%3C/svg%3E'
    if (!url) return FALLBACK
    if (/^https?:\/\//i.test(url)) return url
    return `${fileBase}/${String(url).replace(/^\/+/, '')}`
  }

  const formatTimeRemaining = (autoDeleteAt) => {
    const now = new Date()
    const deleteTime = new Date(autoDeleteAt)
    const diffMs = deleteTime - now

    if (diffMs <= 0) return 'Expired'

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours > 1 ? 's' : ''}`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
    } else {
      return 'Less than 1 hour'
    }
  }

  const handleRestore = async (productId, password) => {
    try {
      await api.post(`/products/deleted/${productId}/restore`, { password })
      setItems(prev => prev.filter(item => item.id !== productId))
      alert('Product restored successfully!')
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to restore product.'
      alert(`Error: ${msg}`)
      throw error
    }
  }

  const handlePermanentDelete = async (productId, password) => {
    try {
      await api.delete(`/products/deleted/${productId}`, { data: { password } })
      setItems(prev => prev.filter(item => item.id !== productId))
      alert('Product permanently deleted.')
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to permanently delete product.'
      alert(`Error: ${msg}`)
      throw error
    }
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const response = await api.get('/products/deleted')
        if (!alive) return
        // Sort by deletedAt in ascending order (oldest first)
        const sortedItems = (response.data || []).sort((a, b) =>
          new Date(a.deletedAt) - new Date(b.deletedAt)
        )
        setItems(sortedItems)
      } catch (e) {
        console.error('Error loading deleted products:', e)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{isAdminView ? 'Admin Recycle Bin' : 'Recycle Bin'}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isAdminView
              ? 'View and restore deleted products from all sellers'
              : 'Deleted products are stored here for 30 days before permanent deletion'}
          </p>
        </div>
        <Link to={isAdminView ? "/dashboard/product-management" : "/seller/products"} className="btn-comrades">
          ← Back to {isAdminView ? 'Product Management' : 'Products'}
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-600">
          <span className="text-6xl mb-4">🗑️</span>
          <p className="text-lg">No deleted products</p>
          <p className="text-sm">Products you delete will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-yellow-600 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800">Important Notice</h3>
                <p className="text-sm text-yellow-700">
                  Products in the recycle bin will be permanently deleted after 30 days.
                  Make sure to restore any products you want to keep.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.id} className="card p-4 border-2 border-gray-200">
                <img
                  src={resolveImageUrl((item.images || [])[0])}
                  alt={item.name}
                  className="w-full h-32 object-cover rounded mb-3 opacity-75"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = resolveImageUrl(null)
                  }}
                />
                <div className="space-y-2">
                  <div className="font-semibold text-gray-800">{item.name}</div>
                  <div className="text-green-600 font-bold">KES {item.basePrice}</div>
                  <div className="text-sm text-gray-600">Stock: {item.stock}</div>
                  <div className="text-xs text-gray-500">
                    Deleted: {new Date(item.deletedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-orange-600 font-medium">
                    Auto-delete: {formatTimeRemaining(item.autoDeleteAt)}
                  </div>
                  {isAdminView && item.seller && (
                    <div className="text-xs text-blue-600 font-medium bg-blue-50 p-2 rounded">
                      Seller: {item.seller.name} ({item.seller.email})
                    </div>
                  )}
                  {item.deletionReason && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      Reason: {item.deletionReason}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setRestoreModal({ isOpen: true, product: item })}
                      className="flex-1 px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded flex items-center justify-center"
                    >
                      <FaUndo className="mr-1" />
                      Restore
                    </button>
                    <button
                      onClick={() => setPermanentDeleteModal({ isOpen: true, product: item })}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded flex items-center justify-center"
                    >
                      <FaTrashAlt className="mr-1" />
                      Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restore Modal */}
      <RestoreModal
        isOpen={restoreModal.isOpen}
        product={restoreModal.product}
        onClose={() => setRestoreModal({ isOpen: false, product: null })}
        onConfirm={handleRestore}
      />

      {/* Permanent Delete Modal */}
      <PermanentDeleteModal
        isOpen={permanentDeleteModal.isOpen}
        product={permanentDeleteModal.product}
        onClose={() => setPermanentDeleteModal({ isOpen: false, product: null })}
        onConfirm={handlePermanentDelete}
      />
    </div>
  )
}

// Restore Modal Component
const RestoreModal = ({ isOpen, product, onClose, onConfirm }) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRestore = async () => {
    if (!password.trim()) {
      alert('Please enter your password')
      return
    }

    setLoading(true)
    try {
      await onConfirm(product.id, password)
      onClose()
    } catch (error) {
      // Error already handled in onConfirm
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setPassword('')
    setLoading(false)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Restore Product</h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>

        <div className="mb-4">
          <p className="mb-2">Are you sure you want to restore "{product.name}"?</p>
          <p className="text-sm text-gray-600 mb-4">
            The product will be restored to your active products list with pending approval status.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your password to confirm restoration:
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 pr-10 border rounded"
                placeholder="Enter password..."
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={!password.trim() || loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Restoring...' : 'Restore Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Permanent Delete Modal Component
const PermanentDeleteModal = ({ isOpen, product, onClose, onConfirm }) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!password.trim()) {
      alert('Please enter your password')
      return
    }

    setLoading(true)
    try {
      await onConfirm(product.id, password)
      onClose()
    } catch (error) {
      // Error already handled in onConfirm
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setPassword('')
    setLoading(false)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-600">Permanently Delete Product</h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>

        <div className="mb-4">
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-800 font-medium mb-1">⚠️ Warning: This action cannot be undone!</p>
            <p className="text-red-700 text-sm">
              "{product.name}" will be permanently deleted and cannot be recovered.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your password to confirm permanent deletion:
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 pr-10 border rounded"
                placeholder="Enter password..."
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!password.trim() || loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>
  )
}