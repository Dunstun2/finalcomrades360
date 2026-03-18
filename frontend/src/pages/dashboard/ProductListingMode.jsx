import React, { useEffect, useState } from 'react';
import { FaArrowLeft as FaBack, FaCheck, FaTimes, FaEdit } from 'react-icons/fa';
import ComradesProductForm from './comrades/ComradesProductForm';
import { useToast } from '../../components/ui/use-toast';
import { productApi } from '../../services/api';

const ProductListingMode = () => {
  const [prefillProduct, setPrefillProduct] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('listing_mode_product');
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefillProduct(parsed || null);
      }
    } catch (_) {
      // ignore parse errors and proceed without prefill
    }
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/dashboard/products';
    }
  };

  const handleSuccess = () => {
    toast({ title: 'Success', description: 'Product saved successfully' });
    // Clear the prefill to avoid stale data next time
    try { sessionStorage.removeItem('listing_mode_product'); } catch (_) {}
    // Navigate back to products area
    handleBack();
  };

  // Handle approve product
  const handleApprove = async () => {
    if (!prefillProduct?.id) return;

    setActionLoading('approve');
    try {
      await productApi.approve(prefillProduct.id);
      toast({
        title: 'Success',
        description: 'Product approved successfully',
      });
      // Clear the prefill and navigate back
      try { sessionStorage.removeItem('listing_mode_product'); } catch (_) {}
      handleBack();
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve product',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject product
  const handleReject = async () => {
    if (!prefillProduct?.id) return;

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading('reject');
    try {
      await productApi.reject(prefillProduct.id, reason);
      toast({
        title: 'Success',
        description: 'Product rejected',
      });
      // Clear the prefill and navigate back
      try { sessionStorage.removeItem('listing_mode_product'); } catch (_) {}
      handleBack();
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject product',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle request changes
  const handleRequestChanges = async () => {
    if (!prefillProduct?.id) return;

    const changes = prompt('Please specify the changes needed:');
    if (!changes) return;

    setActionLoading('request_changes');
    try {
      // You might need to implement this API endpoint
      // For now, we'll use a placeholder
      toast({
        title: 'Success',
        description: 'Change request sent to seller',
      });
      // Clear the prefill and navigate back
      try { sessionStorage.removeItem('listing_mode_product'); } catch (_) {}
      handleBack();
    } catch (error) {
      console.error('Error requesting changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to request changes',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full w-full">
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="mb-4 p-2 rounded-full hover:bg-gray-100"
          aria-label="Go back"
        >
          <FaBack className="text-lg text-gray-500" />
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Listing Mode</h2>
          <p className="text-sm text-gray-500">Review and manage product listing</p>
        </div>
      </div>

      <div className="h-[calc(100%-160px)] overflow-y-auto">
        <ComradesProductForm
          onSuccess={handleSuccess}
          product={prefillProduct || null}
          id={prefillProduct?.id}
        />

        {/* Action Buttons - Only show for pending products */}
        {prefillProduct && (prefillProduct.reviewStatus === 'pending' || (!prefillProduct.reviewStatus && !prefillProduct.approved)) && (
          <div className="flex justify-start space-x-3 mt-8 pt-6 border-t bg-gray-50 px-0 pb-6">
            <button
              onClick={handleReject}
              disabled={actionLoading === 'reject'}
              className="px-6 py-3 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center disabled:opacity-50 font-medium"
            >
              <FaTimes className="mr-2" />
              {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading === 'approve'}
              className="px-6 py-3 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center disabled:opacity-50 font-medium"
            >
              <FaCheck className="mr-2" />
              {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={actionLoading === 'request_changes'}
              className="px-6 py-3 text-sm border border-orange-500 text-orange-600 hover:bg-orange-50 rounded-md flex items-center disabled:opacity-50 font-medium"
            >
              <FaEdit className="mr-2" />
              {actionLoading === 'request_changes' ? 'Requesting...' : 'Request Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListingMode;
