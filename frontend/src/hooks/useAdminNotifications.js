import { useState, useEffect } from 'react';
import { getSocket } from '@/shared/services/socket';
import { toast } from 'react-toastify';

export const useAdminNotifications = (isAdmin = false) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;

    const socket = getSocket();
    
    // Listen for new payment verification requests
    const handleNewPaymentVerification = (data) => {
      console.log('🔔 New payment verification needed:', data);
      
      // Show toast notification
      toast.info(
        `New payment verification needed: Order #${data.orderNumber || data.orderId}`,
        {
          autoClose: 10000, // 10 seconds
          onClick: () => {
            // Navigate to payment verification page
            window.location.href = '/admin/payment-verification';
          }
        }
      );

      // Update pending count
      setPendingCount(prev => prev + 1);
      
      // Add to notifications list
      setNotifications(prev => [{
        id: Date.now(),
        type: 'payment_verification',
        message: `New payment verification for Order #${data.orderNumber || data.orderId}`,
        data: data,
        timestamp: new Date()
      }, ...prev.slice(0, 9)]); // Keep only last 10 notifications
    };

    socket.on('admin:new_payment_verification', handleNewPaymentVerification);

    // Cleanup
    return () => {
      socket.off('admin:new_payment_verification', handleNewPaymentVerification);
    };
  }, [isAdmin]);

  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setPendingCount(prev => Math.max(0, prev - 1));
  };

  const clearAll = () => {
    setNotifications([]);
    setPendingCount(0);
  };

  return {
    pendingCount,
    notifications,
    markAsRead,
    clearAll
  };
};