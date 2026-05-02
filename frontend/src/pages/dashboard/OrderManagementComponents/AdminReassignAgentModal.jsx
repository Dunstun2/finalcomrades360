import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaTruck, FaExclamationTriangle, FaBox, FaUserCircle, FaCheckCircle } from 'react-icons/fa';
import { adminApi } from '../../../services/api';

export default function AdminReassignAgentModal({ isOpen, onClose, onSuccess }) {
  const [orderSearch, setOrderSearch] = useState('');
  const [order, setOrder] = useState(null);
  
  const [agentSearch, setAgentSearch] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [reason, setReason] = useState('');
  
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');

  // Auto-search agents when modal opens or search term changes
  useEffect(() => {
    if (isOpen && agentSearch.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchAgents();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [agentSearch, isOpen]);

  if (!isOpen) return null;

  const handleSearchOrder = async () => {
    if (!orderSearch.trim()) {
      setError('Please enter an Order ID.');
      return;
    }
    setLoadingOrder(true);
    setError('');
    setOrder(null);

    try {
      const res = await adminApi.adminGetOrder(orderSearch);
      const orderData = res.data.order || res.data;
      setOrder(orderData);
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found. Please verify the ID.');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleSearchAgents = async () => {
    setLoadingAgents(true);
    try {
      // Using getAllUsers with role=delivery_agent
      const res = await adminApi.getAllUsers({ 
        role: 'delivery_agent', 
        search: agentSearch,
        limit: 10
      });
      setAgents(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleReassign = async () => {
    if (!order || !selectedAgent) return;
    
    if (!reason.trim()) {
      setError('Please provide a reason for this reassignment.');
      return;
    }
    
    setLoadingSave(true);
    setError('');
    
    try {
      const res = await adminApi.adminReassignDeliveryAgent({
        orderId: order.id,
        newAgentId: selectedAgent.id,
        reason: reason.trim()
      });
      if (onSuccess) onSuccess(res.data.message || `Order #${order.id} reassigned to ${selectedAgent.name}.`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reassign delivery agent.');
    } finally {
      setLoadingSave(false);
    }
  };

  const closeModal = () => {
    setOrderSearch('');
    setOrder(null);
    setAgentSearch('');
    setAgents([]);
    setSelectedAgent(null);
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in-up my-auto">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <FaTruck className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Reassign Delivery Agent</h2>
              <p className="text-indigo-100 text-xs font-medium">Switch agents on a live delivery task</p>
            </div>
          </div>
          <button onClick={closeModal} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* 1. Order Search */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Step 1: Find Order</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchOrder()}
                placeholder="Enter Order ID"
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
              <button
                onClick={handleSearchOrder}
                disabled={loadingOrder || !orderSearch}
                className="bg-indigo-600 text-white px-5 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {loadingOrder ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaSearch />}
              </button>
            </div>
          </div>

          {order && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <FaBox />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Order #{order.orderNumber || order.id}</p>
                  <p className="text-sm font-black text-gray-800 capitalize">{order.status.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Current Agent</p>
                <p className="text-xs font-bold text-indigo-600">
                  {order.deliveryAgentId ? `ID: ${order.deliveryAgentId}` : 'Unassigned'}
                </p>
              </div>
            </div>
          )}

          {/* 2. Agent Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Step 2: Select New Agent</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
              {loadingAgents && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Agent Results List */}
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    selectedAgent?.id === agent.id 
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/10' 
                    : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${selectedAgent?.id === agent.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <FaUserCircle />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-800">{agent.name}</p>
                      <p className="text-[10px] text-gray-500">{agent.email} • {agent.phone}</p>
                    </div>
                  </div>
                  {selectedAgent?.id === agent.id && (
                    <FaCheckCircle className="text-indigo-600 text-lg" />
                  )}
                </button>
              ))}
              {agentSearch.length >= 2 && agents.length === 0 && !loadingAgents && (
                <p className="text-center py-4 text-xs text-gray-400 italic">No delivery agents found matching "{agentSearch}"</p>
              )}
              {agentSearch.length < 2 && agents.length === 0 && (
                <p className="text-center py-4 text-[10px] text-gray-400 uppercase font-bold tracking-widest">Type to search agents</p>
              )}
            </div>
          </div>

          {/* 3. Reason */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Step 3: Reason for Reassignment</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Previous agent is unreachable, vehicle breakdown, etc."
              rows="2"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
            ></textarea>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={closeModal}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleReassign}
            disabled={loadingSave || !order || !selectedAgent || !reason.trim()}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:hover:shadow-sm flex items-center justify-center min-w-[160px] bg-indigo-600 hover:bg-indigo-700"
          >
            {loadingSave ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Reassignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
