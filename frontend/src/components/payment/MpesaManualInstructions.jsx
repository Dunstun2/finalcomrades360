import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FaCopy, FaCheck } from 'react-icons/fa';

const MpesaManualInstructions = ({ amount, orderId = '', onScreenshotUpload, required = false }) => {
  const [config, setConfig] = useState({ paybill: '714888', accountNumber: '223052' });
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/platform/config/mpesa_manual_instructions');
        if (response.data?.success && response.data?.data) {
          const data = typeof response.data.data === 'string' 
            ? JSON.parse(response.data.data) 
            : response.data.data;
          setConfig(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error('Failed to load M-Pesa manual instructions config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.url) {
        setUploadedUrl(res.data.url);
        if (onScreenshotUpload) {
          onScreenshotUpload(res.data.url);
        }
      }
    } catch (err) {
      console.error('Failed to upload screenshot', err);
      alert('Failed to upload screenshot. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 rounded-full bg-green-500 mr-3 flex items-center justify-center text-white font-bold text-xs">
          M
        </div>
        <h4 className="font-semibold text-green-900">M-Pesa Payment Instructions</h4>
      </div>
      
      {loading ? (
        <div className="text-sm text-green-700 animate-pulse">Loading payment details...</div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-green-800">
            Please complete your payment using the details below:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded border border-green-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Paybill Number</p>
                <p className="text-lg font-bold text-gray-900 tracking-wider flex items-center gap-2">
                  {config.paybill}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => handleCopy(config.paybill, 'paybill')}
                className={`p-2 rounded transition-colors ${copiedField === 'paybill' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title="Copy Paybill"
              >
                {copiedField === 'paybill' ? <FaCheck size={14} /> : <FaCopy size={14} />}
              </button>
            </div>

            <div className="bg-white p-3 rounded border border-green-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Account Number</p>
                <p className="text-lg font-bold text-gray-900 tracking-wider flex items-center gap-2">
                  {config.accountNumber}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => handleCopy(config.accountNumber, 'account')}
                className={`p-2 rounded transition-colors ${copiedField === 'account' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title="Copy Account Number"
              >
                {copiedField === 'account' ? <FaCheck size={14} /> : <FaCopy size={14} />}
              </button>
            </div>
          </div>

          {amount && (
            <div className="bg-white p-3 rounded border border-green-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Exact Amount</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  KES {amount.toLocaleString()}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => handleCopy(amount.toString(), 'amount')}
                className={`p-2 rounded transition-colors ${copiedField === 'amount' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title="Copy Amount"
              >
                {copiedField === 'amount' ? <FaCheck size={14} /> : <FaCopy size={14} />}
              </button>
            </div>
          )}

          <div className="text-xs text-green-700 bg-green-100/50 p-2 rounded border border-green-200 mt-2">
            <span className="font-semibold block mb-1">Steps:</span>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open M-Pesa on your phone.</li>
              <li>Select Lipa na M-Pesa -&gt; Paybill.</li>
              <li>Enter Business Number <strong>{config.paybill}</strong>.</li>
              <li>Enter Account Number <strong>{config.accountNumber}</strong>.</li>
              <li>Enter Amount {amount ? <strong>KES {amount.toLocaleString()}</strong> : ''}.</li>
              <li>Enter M-Pesa PIN and confirm.</li>
            </ol>
          </div>

          <div className="mt-4 border-t border-green-200 pt-3">
            <label className="block text-sm font-medium text-green-900 mb-2">
              Upload Payment Screenshot {required ? '(Required for verification)' : '(Optional but recommended)'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 transition-all cursor-pointer"
              />
            </div>
            {uploading && <p className="text-xs text-green-600 mt-2 animate-pulse">Uploading screenshot...</p>}
            {uploadedUrl && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-100 p-2 rounded">
                <FaCheck /> Screenshot attached successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MpesaManualInstructions;
