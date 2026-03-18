import React, { useState, useEffect } from 'react';
import { PRODUCT_IDS, getProductId, getProductName, validateProductId } from '../../../utils/productIds';

/**
 * Demo component showing how to use correct product IDs
 * This demonstrates the integration of database product IDs throughout the system
 */
const ProductIDDemo = () => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productDetails, setProductDetails] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  // Sample product names that exist in our database
  const availableProducts = [
    'Wireless Bluetooth Earbuds',
    'iPhone X',
    'Instant Noodles (Pack of 10)',
    'Professional DSLR Camera Kit',
    'Techno Spark 40'
  ];

  const handleProductSelect = async (productName) => {
    setSelectedProduct(productName);
    
    // Method 1: Using getProductId() for name-to-ID conversion
    const productId = getProductId(productName);
    
    if (productId) {
      console.log(`✅ Found product ID for "${productName}": ${productId}`);
      
      // Method 2: Using PRODUCT_IDS constants
      const constantName = Object.keys(PRODUCT_IDS).find(
        key => PRODUCT_IDS[key] === productId
      );
      
      console.log(`✅ Product constant: ${constantName}`);
      
      // Method 3: Using getProductName() for ID-to-name conversion
      const retrievedName = getProductName(productId);
      console.log(`✅ Retrieved name for ID ${productId}: "${retrievedName}"`);
      
      // Method 4: Validating the ID
      const isValid = validateProductId(productId);
      console.log(`✅ ID ${productId} is valid: ${isValid}`);
      
      setProductDetails({
        originalName: productName,
        productId: productId,
        constantName: constantName,
        retrievedName: retrievedName,
        isValid: isValid,
        // Using the correct database ID for API calls
        apiEndpoint: `/api/products/${productId}`,
        formValue: productId
      });
      
      setValidationResult(`✅ All validations passed for product "${productName}"`);
    } else {
      console.log(`❌ Product "${productName}" not found in database`);
      setProductDetails(null);
      setValidationResult(`❌ Product "${productName}" not found - may not exist in database or name mismatch`);
    }
  };

  const demonstrateConstants = () => {
    console.log('🔧 DEMONSTRATING PRODUCT ID CONSTANTS:');
    console.log('=====================================');
    
    // Direct access to constants
    console.log(`WIRELESS_BLUETOOTH_EARBUDS: ${PRODUCT_IDS.WIRELESS_BLUETOOTH_EARBUDS}`);
    console.log(`IPHONE_X: ${PRODUCT_IDS.IPHONE_X}`);
    console.log(`TECHNO_SPARK_40: ${PRODUCT_IDS.TECHNO_SPARK_40}`);
    
    // Access through ALL_PRODUCT_IDS object
    console.log('\n🔍 ALL_PRODUCT_IDS object:');
    console.log(PRODUCT_IDS.ALL_PRODUCT_IDS);
    
    // Validate specific known IDs
    console.log('\n✅ ID VALIDATION EXAMPLES:');
    console.log(`ID 1 (Wireless Bluetooth Earbuds): ${validateProductId(1)}`);
    console.log(`ID 7 (iPhone X): ${validateProductId(7)}`);
    console.log(`ID 999 (Invalid): ${validateProductId(999)}`);
  };

  const demonstrateAPIIntegration = () => {
    console.log('🌐 API INTEGRATION EXAMPLES:');
    console.log('===========================');
    
    // Example 1: Safe API call with validated ID
    const makeSafeAPICall = async (productName) => {
      const productId = getProductId(productName);
      if (!productId) {
        throw new Error(`Product "${productName}" not found`);
      }
      
      if (!validateProductId(productId)) {
        throw new Error(`Invalid product ID: ${productId}`);
      }
      
      // Now safe to make API call with validated ID
      console.log(`✅ Making API call to /api/products/${productId}`);
      return { success: true, productId, endpoint: `/api/products/${productId}` };
    };
    
    // Example usage
    makeSafeAPICall('iPhone X')
      .then(result => console.log('API Result:', result))
      .catch(error => console.error('API Error:', error.message));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        🆔 Product ID Integration Demo
      </h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          What This Demo Shows:
        </h2>
        <ul className="text-blue-800 space-y-1">
          <li>✅ Using correct product IDs from database</li>
          <li>✅ Safe product name-to-ID conversion</li>
          <li>✅ ID validation before API calls</li>
          <li>✅ Error handling for invalid products</li>
          <li>✅ Integration with existing form components</li>
        </ul>
      </div>

      {/* Product Selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select a Product:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableProducts.map((productName) => (
            <button
              key={productName}
              onClick={() => handleProductSelect(productName)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                selectedProduct === productName
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{productName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Details Display */}
      {productDetails && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">
            ✅ Product Details Found
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Original Name:</strong>
              <p className="text-gray-700">{productDetails.originalName}</p>
            </div>
            
            <div>
              <strong>Database ID:</strong>
              <p className="text-green-600 font-mono text-lg">{productDetails.productId}</p>
            </div>
            
            <div>
              <strong>Constant Name:</strong>
              <p className="text-gray-700 font-mono">{productDetails.constantName}</p>
            </div>
            
            <div>
              <strong>Retrieved Name:</strong>
              <p className="text-gray-700">{productDetails.retrievedName}</p>
            </div>
            
            <div className="md:col-span-2">
              <strong>Safe API Endpoint:</strong>
              <p className="text-blue-600 font-mono">{productDetails.apiEndpoint}</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Result */}
      {validationResult && (
        <div className={`border rounded-lg p-4 mb-6 ${
          validationResult.includes('✅') 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <p className={validationResult.includes('✅') ? 'text-green-800' : 'text-red-800'}>
            {validationResult}
          </p>
        </div>
      )}

      {/* Code Examples */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">💻 Code Examples:</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">1. Using Product Constants:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`import { PRODUCT_IDS } from '../utils/productIds';

const earbudsId = PRODUCT_IDS.WIRELESS_BLUETOOTH_EARBUDS; // 1
const iphoneId = PRODUCT_IDS.IPHONE_X; // 7`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">2. Safe Name-to-ID Conversion:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`import { getProductId, validateProductId } from '../utils/productIds';

const productName = "iPhone X";
const productId = getProductId(productName);

if (productId && validateProductId(productId)) {
  // Safe to use productId in API calls
  fetch(\`/api/products/\${productId}\`)
}`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">3. Form Integration:</h4>
            <pre className="bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`// In your form component
const handleSubmit = (formData) => {
  let productId = formData.productId;
  
  // Convert name to ID if needed
  if (typeof productId === 'string') {
    productId = getProductId(productId);
  }
  
  // Validate before submission
  if (!validateProductId(productId)) {
    throw new Error('Invalid product selected');
  }
  
  // Submit with validated ID
  submitForm({ ...formData, productId });
};`}
            </pre>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={demonstrateConstants}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔧 Test Constants
        </button>
        
        <button
          onClick={demonstrateAPIIntegration}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          🌐 Test API Integration
        </button>
        
        <button
          onClick={() => {
            setSelectedProduct('');
            setProductDetails(null);
            setValidationResult(null);
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          🔄 Reset Demo
        </button>
      </div>

      {/* Integration Benefits */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          🎯 Integration Benefits:
        </h3>
        <ul className="text-yellow-800 space-y-1 text-sm">
          <li>✅ <strong>Consistency:</strong> All components use the same product IDs</li>
          <li>✅ <strong>Safety:</strong> No more hardcoded IDs that can break</li>
          <li>✅ <strong>Maintainability:</strong> Easy to update when database changes</li>
          <li>✅ <strong>Debugging:</strong> Clear error messages for invalid IDs</li>
          <li>✅ <strong>Type Safety:</strong> Better IDE support with constants</li>
        </ul>
      </div>
    </div>
  );
};

export default ProductIDDemo;