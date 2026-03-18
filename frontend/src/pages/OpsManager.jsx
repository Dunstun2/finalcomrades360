import React, { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

export default function OpsManager({ user }) {
  const [activeTab, setActiveTab] = useState('pending') // pending | all
  const [pendingProducts, setPendingProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resetAlerts = () => { setError(''); setSuccess(''); }

  const loadPending = async (showLoading = true) => {
    try {
      const r = await api.get('/admin/products/pending')
      setPendingProducts(r.data || [])
    } catch (e) {
      if (showLoading) setError(e.response?.data?.message || 'Failed to load pending products')
    }
  }
  const loadAllProducts = async (showLoading = true) => {
    try {
      const r = await api.get('/admin/products')
      setAllProducts(r.data || [])
    } catch (e) {
      if (showLoading) setError(e.response?.data?.message || 'Failed to load products')
    }
  }
  const loadCategories = async () => {
    try {
      const r = await api.get('/categories')
      setCategories(r.data || [])
    } catch (e) {
      // soft fail
    }
  }

  useEffect(() => {
    loadPending();
    loadAllProducts();
    loadCategories();

    const interval = setInterval(() => {
      loadPending(false);
      loadAllProducts(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [])

  const flatCategories = useMemo(() => {
    const out = []
    const walk = (arr, prefix = '') => (arr || []).forEach(c => { const label = prefix ? `${prefix} / ${c.name}` : c.name; out.push({ id: c.id, name: label }); if (c.subcategories?.length) walk(c.subcategories, label) })
    walk(categories)
    return out
  }, [categories])

  const approve = async (productId) => {
    resetAlerts()
    try {
      await api.patch(`/admin/products/${productId}/approve`)
      setSuccess('Product approved')
      loadPending(); loadAllProducts()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to approve product')
    }
  }
  const reject = async (productId) => {
    resetAlerts()
    const reason = window.prompt('Enter rejection reason (optional):') || ''
    try {
      await api.patch(`/admin/products/${productId}/reject`, { reason })
      setSuccess('Product rejected')
      loadPending(); loadAllProducts()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reject product')
    }
  }
  const requestChanges = async (productId) => {
    resetAlerts()
    const notes = window.prompt('Enter requested changes/notes:') || ''
    try {
      await api.patch(`/admin/products/${productId}/request-changes`, { notes })
      setSuccess('Change request recorded')
      loadPending(); loadAllProducts()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to request changes')
    }
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold">Operations Dashboard</h1>
          {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'super_admin' || user?.roles?.some(r => ['admin', 'superadmin', 'super_admin'].includes(r))) && (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-black transition-all border border-gray-800"
              >
                <span>⬅️</span>
                <span>Admin Console</span>
              </Link>
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:bg-gray-50 transition-all border border-gray-200"
              >
                <span>🏠</span>
                <span>Exit Home</span>
              </button>
            </div>
          )}
        </div>
        {user && (<div className="text-sm text-gray-600">Signed in as <span className="font-medium">{user.name}</span> ({user.role})</div>)}
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-700">{error}</div>}
      {success && <div className="mb-4 p-3 rounded bg-green-100 text-green-700">{success}</div>}

      <div className="flex gap-2 mb-6">
        <button className={`px-4 py-2 rounded ${activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setActiveTab('pending')}>Pending Products</button>
        <button className={`px-4 py-2 rounded ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setActiveTab('all')}>All Products</button>
      </div>

      {(activeTab === 'all') && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">All Products</h2>
            <button className="btn" onClick={() => loadAllProducts()}>Refresh</button>
          </div>
          {allProducts.length === 0 ? (
            <div className="text-gray-600">No products found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Name</th>
                    <th className="p-2">Seller</th>
                    <th className="p-2">Base Price</th>
                    <th className="p-2">Display Price</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{p.seller ? `${p.seller.name} (${p.seller.email})` : p.sellerId}</td>
                      <td className="p-2">{p.basePrice}</td>
                      <td className="p-2">{p.displayPrice ?? '-'}</td>
                      <td className="p-2">{p.stock}</td>
                      <td className="p-2">{p.approved ? 'approved' : (p.reviewStatus || 'pending')}</td>
                      <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'pending') && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Pending Products</h2>
            <button className="btn" onClick={() => loadPending()}>Refresh</button>
          </div>
          {pendingProducts.length === 0 ? (
            <div className="text-gray-600">No pending products.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Name</th>
                    <th className="p-2">Seller</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Base Price</th>
                    <th className="p-2">Display Price</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProducts.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{p.seller ? `${p.seller.name} (${p.seller.email})` : p.sellerId}</td>
                      <td className="p-2">{p.Category?.name || p.categoryId}</td>
                      <td className="p-2">{p.basePrice}</td>
                      <td className="p-2">{p.displayPrice ?? '-'}</td>
                      <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button className="btn" onClick={() => approve(p.id)}>Approve</button>
                          <button className="btn" onClick={() => reject(p.id)}>Reject</button>
                          <button className="btn" onClick={() => requestChanges(p.id)}>Request Changes</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
