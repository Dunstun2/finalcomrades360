import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { useToast } from '../../components/ui/use-toast';
import {
  Star,
  Search,
  Filter,
  MessageSquare,
  Check,
  X,
  ArrowLeft,
  StarHalf,
  StarOff,
  ThumbsUp,
  AlertCircle,
  Clock
} from 'lucide-react';

// Mock data - replace with API calls
const mockReviews = [
  {
    id: 1,
    service: 'Home Cleaning Service',
    serviceId: 101,
    customer: {
      id: 1001,
      name: 'Alex Johnson',
      avatar: '',
      location: 'Nairobi',
    },
    rating: 5,
    date: '2023-11-15',
    comment: 'Excellent service! The cleaner was very thorough and professional. Will definitely book again.',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
      'https://images.unsplash.com/photo-1600566751982-8f5c9dcdf415',
    ],
    status: 'published',
    response: {
      text: 'Thank you for your kind words, Alex! We\'re thrilled to hear you had a great experience.',
      date: '2023-11-16',
    },
  },
  {
    id: 2,
    service: 'Car Wash',
    serviceId: 102,
    customer: {
      id: 1002,
      name: 'Sarah Williams',
      avatar: '',
      location: 'Mombasa',
    },
    rating: 4,
    date: '2023-11-10',
    comment: 'Good service overall, but they missed a few spots on the interior.',
    status: 'pending',
    response: null,
  },
  {
    id: 3,
    service: 'Tutoring - Mathematics',
    serviceId: 103,
    customer: {
      id: 1003,
      name: 'Michael Brown',
      avatar: '',
      location: 'Kisumu',
    },
    rating: 3,
    date: '2023-11-05',
    comment: 'The tutor was knowledgeable but often arrived late to sessions.',
    status: 'published',
    response: {
      text: 'We apologize for the inconvenience, Michael. We\'ve addressed the punctuality issue with the tutor.',
      date: '2023-11-06',
    },
  },
  {
    id: 4,
    service: 'Pet Grooming',
    serviceId: 104,
    customer: {
      id: 1004,
      name: 'Emily Davis',
      avatar: '',
      location: 'Nakuru',
    },
    rating: 2,
    date: '2023-10-28',
    comment: 'My dog came back with a small cut. Not happy with the service.',
    status: 'published',
    response: {
      text: 'We sincerely apologize for this incident. Our staff has been retrained on safety protocols.',
      date: '2023-10-29',
    },
  },
];

const ServiceReviews = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviews, setReviews] = useState(mockReviews);
  const [filteredReviews, setFilteredReviews] = useState(mockReviews);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Filter reviews based on search term, status, and rating
  useEffect(() => {
    let result = [...reviews];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(review =>
        review.service.toLowerCase().includes(term) ||
        review.customer.name.toLowerCase().includes(term) ||
        review.comment.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(review => review.status === statusFilter);
    }

    // Apply rating filter
    if (ratingFilter !== 'all') {
      const rating = parseInt(ratingFilter);
      result = result.filter(review => review.rating === rating);
    }

    // Apply tab filter
    if (activeTab === 'unresponded') {
      result = result.filter(review => !review.response);
    } else if (activeTab === 'needs_attention') {
      result = result.filter(review => review.rating <= 2);
    }

    setFilteredReviews(result);
  }, [searchTerm, statusFilter, ratingFilter, reviews, activeTab]);

  // Handle review response submission
  const handleSubmitResponse = (reviewId) => {
    if (!responseText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a response',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      const updatedReviews = reviews.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            response: {
              text: responseText,
              date: new Date().toISOString().split('T')[0],
            },
            status: 'published',
          };
        }
        return review;
      });

      setReviews(updatedReviews);
      setResponseText('');
      setSelectedReview(null);
      setIsSubmitting(false);

      toast({
        title: 'Success',
        description: 'Your response has been submitted',
      });
    }, 1000);
  };

  // Handle review status update
  const updateReviewStatus = (reviewId, status) => {
    const updatedReviews = reviews.map(review =>
      review.id === reviewId ? { ...review, status } : review
    );

    setReviews(updatedReviews);

    toast({
      title: 'Status Updated',
      description: `Review has been ${status}`,
    });
  };

  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= rating ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <Star className="h-4 w-4 text-gray-300" />
            )}
          </span>
        ))}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            className="mb-2 p-0 h-auto"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Service Reviews & Ratings</h1>
          <p className="text-gray-600">Manage and respond to customer reviews</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search reviews..."
              className="pl-9 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Total Reviews</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{reviews.length}</h3>
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Average Rating</p>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">4.2</h3>
                <div className="flex items-center mt-1">
                  {renderStars(4)}
                  <span className="ml-2 text-sm text-gray-500">(4.2/5)</span>
                </div>
              </div>
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Pending Response</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">
                {reviews.filter(r => !r.response).length}
              </h3>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Needs Attention</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">
                {reviews.filter(r => r.rating <= 2).length}
              </h3>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-4 mb-6 border-b">
        <button
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'all'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('all')}
        >
          All Reviews
        </button>
        <button
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'unresponded'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('unresponded')}
        >
          Unresponded
          {reviews.filter(r => !r.response).length > 0 && (
            <span className="ml-1.5 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {reviews.filter(r => !r.response).length}
            </span>
          )}
        </button>
        <button
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'needs_attention'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('needs_attention')}
        >
          Needs Attention
          {reviews.filter(r => r.rating <= 2).length > 0 && (
            <span className="ml-1.5 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {reviews.filter(r => r.rating <= 2).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-3 md:space-y-0">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by:</span>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setRatingFilter('all');
              setSearchTerm('');
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try adjusting your search or filter to find what you\'re looking for.'
                : 'There are no reviews matching the selected filters.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={review.customer.avatar} />
                      <AvatarFallback>
                        {review.customer.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{review.customer.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(review.date)} • {review.customer.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        review.status === 'published' ? 'default' :
                          review.status === 'pending' ? 'secondary' : 'destructive'
                      }
                      className="capitalize"
                    >
                      {review.status}
                    </Badge>
                    {review.rating <= 2 && (
                      <Badge variant="destructive" className="flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" /> Needs Attention
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{review.service}</h4>
                  <div className="flex items-center">
                    {renderStars(review.rating)}
                    <span className="ml-2 text-sm font-medium text-gray-900">{review.rating}.0</span>
                  </div>
                </div>

                <p className="mt-2 text-gray-700">{review.comment}</p>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="mt-3 flex space-x-2 overflow-x-auto pb-2">
                    {review.images.map((img, idx) => (
                      <div key={idx} className="flex-shrink-0">
                        <img
                          src={img}
                          alt={`Review ${review.id} - ${idx + 1}`}
                          className="h-20 w-20 rounded-md object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Response Section */}
                {review.response ? (
                  <div className="mt-4 pl-4 border-l-4 border-blue-200 bg-blue-50 p-3 rounded-r-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-sm text-blue-800">Your Response</span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(review.response.date)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{review.response.text}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setSelectedReview(review);
                          setResponseText(review.response.text);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReview(selectedReview?.id === review.id ? null : review)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {selectedReview?.id === review.id ? 'Cancel' : 'Respond to Review'}
                    </Button>
                  </div>
                )}

                {/* Response Form */}
                {selectedReview?.id === review.id && (
                  <div className="mt-4 border-t pt-4">
                    <Textarea
                      placeholder="Type your response here..."
                      className="min-h-[100px]"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedReview(null)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSubmitResponse(review.id)}
                        disabled={isSubmitting || !responseText.trim()}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Response'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      // Navigate to service details
                      navigate(`/services/${review.serviceId}`);
                    }}
                  >
                    View Service
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  {review.status !== 'published' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => updateReviewStatus(review.id, 'published')}
                    >
                      <Check className="h-4 w-4 mr-1" /> Publish
                    </Button>
                  )}

                  {review.status !== 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => updateReviewStatus(review.id, 'rejected')}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  )}

                  {review.status === 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateReviewStatus(review.id, 'published')}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ServiceReviews;
