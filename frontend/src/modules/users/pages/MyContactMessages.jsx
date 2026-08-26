import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaCalendarAlt, FaReply, FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import api from '../../../shared/services/api';
import { toast } from 'react-toastify';

const MyContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contact/my-messages');
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      setSending(true);
      await api.post(`/contact/${selectedMessage.id}/reply`, {
        content: replyText
      });
      
      toast.success('Reply sent successfully');
      setReplyText('');
      fetchMessages();
      
      // Update selected message
      const response = await api.get('/contact/my-messages');
      const updated = response.data.messages?.find(m => m.id === selectedMessage.id);
      if (updated) {
        setSelectedMessage(updated);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'replied':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Contact Messages</h1>
        <p className="text-gray-600">View and respond to messages from your contact form submissions</p>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FaEnvelope className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-600">You haven't sent any contact messages yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Messages ({messages.length})</h2>
            {messages.map((message) => (
              <div
                key={message.id}
                onClick={() => setSelectedMessage(message)}
                className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border-2 ${
                  selectedMessage?.id === message.id ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {message.subject || 'No Subject'}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <FaCalendarAlt className="mr-1" />
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(message.status)}`}>
                    {message.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
                {message.replies?.length > 0 && (
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <FaReply className="mr-1" />
                    {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Message Detail & Conversation */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedMessage.subject || 'No Subject'}
                  </h2>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedMessage.status)}`}>
                    {selectedMessage.status}
                  </span>
                </div>

                {/* Conversation Thread */}
                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {/* Original Message */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-blue-900">You</p>
                      <p className="text-xs text-gray-500">{formatDate(selectedMessage.createdAt)}</p>
                    </div>
                    <p className="text-sm text-gray-800">{selectedMessage.message}</p>
                  </div>

                  {/* Replies */}
                  {selectedMessage.replies?.map((reply) => (
                    <div
                      key={reply.id}
                      className={`${
                        reply.isAdminReply
                          ? 'bg-green-50 border-l-4 border-green-500'
                          : 'bg-blue-50 border-l-4 border-blue-500'
                      } p-4 rounded`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {reply.isAdminReply ? (
                            <span className="flex items-center">
                              <FaCheckCircle className="text-green-600 mr-1" />
                              Support Team
                            </span>
                          ) : (
                            'You'
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(reply.createdAt)}</p>
                      </div>
                      <p className="text-sm text-gray-800">{reply.content}</p>
                    </div>
                  ))}

                  {/* Legacy admin response */}
                  {selectedMessage.adminResponse && !selectedMessage.replies?.length && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-semibold text-green-900 flex items-center">
                          <FaCheckCircle className="mr-1" />
                          Support Team (Admin)
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedMessage.respondedAt ? formatDate(selectedMessage.respondedAt) : 'Unknown'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-800">{selectedMessage.adminResponse}</p>
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {selectedMessage.status !== 'closed' && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Send a Reply</label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows="3"
                      placeholder="Type your message here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {sending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                )}

                {selectedMessage.status === 'closed' && (
                  <div className="border-t pt-4">
                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">This conversation has been closed</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <FaEnvelope className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Select a message to view the conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyContactMessages;
