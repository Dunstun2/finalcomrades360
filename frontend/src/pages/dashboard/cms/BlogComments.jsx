import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trash2,
  User,
  Mail,
  Calendar,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import api from '../../../shared/services/api';
import { toast } from 'react-toastify';

const BlogComments = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  useEffect(() => {
    fetchPostAndComments();
  }, [slug]);

  const fetchPostAndComments = async () => {
    try {
      setLoading(true);

      // Fetch post details by slug
      const postRes = await api.get(`/cms/blog/${slug}`);
      setPost(postRes.data.post);

      // Fetch ALL comments for this post (admin endpoint includes all statuses)
      const commentsRes = await api.get(`/cms/blog/${slug}/comments/admin`);
      setComments(commentsRes.data.comments || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commentId) => {
    if (!window.confirm('Approve this comment?')) return;

    try {
      setProcessing(commentId);
      await api.put(`/cms/blog/comments/${commentId}/approve`);
      toast.success('Comment approved');
      fetchPostAndComments();
    } catch (error) {
      console.error('Error approving comment:', error);
      toast.error('Failed to approve comment');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (commentId) => {
    if (!window.confirm('Reject this comment? It will remain in the database but won\'t be visible.')) return;

    try {
      setProcessing(commentId);
      await api.put(`/cms/blog/comments/${commentId}/reject`);
      toast.success('Comment rejected');
      fetchPostAndComments();
    } catch (error) {
      console.error('Error rejecting comment:', error);
      toast.error('Failed to reject comment');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Permanently delete this comment? This action cannot be undone.')) return;

    try {
      setProcessing(commentId);
      await api.delete(`/cms/blog/comments/${commentId}`);
      toast.success('Comment deleted');
      fetchPostAndComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };
    const config = styles[status] || styles.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
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

  const filteredComments = comments.filter(comment => {
    if (filter === 'all') return true;
    return comment.status === filter;
  });

  const pendingCount = comments.filter(c => c.status === 'pending').length;
  const approvedCount = comments.filter(c => c.status === 'approved').length;
  const rejectedCount = comments.filter(c => c.status === 'rejected').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Blog post not found</h3>
          <button
            onClick={() => navigate('/dashboard/cms/blog')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Blog Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/cms/blog')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Blog Management
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              {post.featuredImage && (
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h1>
                <p className="text-gray-600 mb-4">{post.summary}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {post.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {comments.length} total comments
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All ({comments.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'approved'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'rejected'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>

        {/* Comments List */}
        {filteredComments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No comments</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No comments have been submitted yet.'
                : `No ${filter} comments.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{comment.authorName}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="w-3 h-3" />
                          <span>{comment.authorEmail}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(comment.createdAt)}
                      </span>
                      {getStatusBadge(comment.status)}
                    </div>
                  </div>
                </div>

                {/* Comment Content */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>

                {/* Comment Actions */}
                <div className="flex items-center gap-2">
                  {comment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(comment.id)}
                        disabled={processing === comment.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(comment.id)}
                        disabled={processing === comment.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {comment.status === 'rejected' && (
                    <button
                      onClick={() => handleApprove(comment.id)}
                      disabled={processing === comment.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                  {comment.status === 'approved' && (
                    <button
                      onClick={() => handleReject(comment.id)}
                      disabled={processing === comment.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={processing === comment.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogComments;
