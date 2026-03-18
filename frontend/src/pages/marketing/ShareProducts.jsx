import React from 'react';
import { FaFacebook, FaTwitter, FaWhatsapp, FaTelegram, FaLink, FaCopy } from 'react-icons/fa';
import { formatPrice } from '../../utils/currency';

export default function ShareProducts({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  minCommission,
  setMinCommission,
  sortOrder,
  setSortOrder,
  stockOnly,
  setStockOnly,
  flashOnly,
  setFlashOnly,
  filteredProducts,
  categories,
  selectedProduct,
  sharingContent,
  toggleShareLinks,
  handleShare,
  copyToClipboard,
  analytics,
  userReferralCode
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-4">Share Products</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Commission</label>
            <input
              type="number"
              value={minCommission}
              onChange={(e) => setMinCommission(e.target.value)}
              placeholder="Min %"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end space-x-4">
            <div className="flex items-center">
              <input
                id="stock-only"
                type="checkbox"
                checked={stockOnly}
                onChange={(e) => setStockOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="stock-only" className="ml-2 block text-sm text-gray-700">
                In Stock Only
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="flash-sale"
                type="checkbox"
                checked={flashOnly}
                onChange={(e) => setFlashOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="flash-sale" className="ml-2 block text-sm text-gray-700">
                Flash Sale
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img className="h-10 w-10 rounded-full" src={product.images?.[0] || '/placeholder-product.png'} alt={product.name} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.Category?.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatPrice(product.displayPrice || 0)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {product.commissionRate || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleShareLinks(product.id)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Share
                        </button>
                      </td>
                    </tr>
                    {selectedProduct === product.id && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="flex flex-wrap gap-4">
                            <button
                              onClick={() => handleShare(product.id, 'facebook')}
                              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              <FaFacebook className="mr-2" /> Facebook
                            </button>
                            <button
                              onClick={() => handleShare(product.id, 'twitter')}
                              className="flex items-center px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500"
                            >
                              <FaTwitter className="mr-2" /> Twitter
                            </button>
                            <button
                              onClick={() => handleShare(product.id, 'whatsapp')}
                              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                            >
                              <FaWhatsapp className="mr-2" /> WhatsApp
                            </button>
                            <button
                              onClick={() => handleShare(product.id, 'telegram')}
                              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                              <FaTelegram className="mr-2" /> Telegram
                            </button>
                            <div className="flex items-center">
                              <div className="relative flex-grow">
                                <input
                                  type="text"
                                  readOnly
                                  value={`${window.location.origin}/?ref=${userReferralCode}`}
                                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                  onClick={() => copyToClipboard(`${window.location.origin}/?ref=${userReferralCode}`)}
                                  className="absolute inset-y-0 right-0 px-3 flex items-center bg-gray-100 border-l border-gray-300 rounded-r-md hover:bg-gray-200"
                                >
                                  <FaCopy className="text-gray-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No products found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
