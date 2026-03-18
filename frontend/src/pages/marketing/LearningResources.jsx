import React, { useState } from 'react';
import { 
  FaPlay, 
  FaDownload, 
  FaBookmark, 
  FaStar, 
  FaVideo, 
  FaFilePdf, 
  FaBook, 
  FaAward,
  FaGraduationCap,
  FaUsers,
  FaCertificate,
  FaTrophy,
  FaChevronRight,
  FaClock
} from 'react-icons/fa';

const LearningResources = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [bookmarked, setBookmarked] = useState(new Set());

  const categories = [
    { id: 'all', name: 'All Resources', icon: <FaBook className="w-4 h-4" /> },
    { id: 'tutorials', name: 'Video Tutorials', icon: <FaVideo className="w-4 h-4" /> },
    { id: 'guides', name: 'Written Guides', icon: <FaFilePdf className="w-4 h-4" /> },
    { id: 'templates', name: 'Templates', icon: <FaDownload className="w-4 h-4" /> },
    { id: 'certifications', name: 'Certifications', icon: <FaCertificate className="w-4 h-4" /> }
  ];

  const resources = [
    {
      id: 1,
      title: 'Getting Started with Product Marketing',
      description: 'Learn the fundamentals of promoting products effectively to maximize your earnings.',
      category: 'tutorials',
      type: 'Video',
      duration: '15 min',
      difficulty: 'Beginner',
      rating: 4.8,
      downloads: 1250,
      thumbnail: '/placeholder.jpg',
      author: 'Sarah Marketing',
      tags: ['basics', 'product promotion', 'beginners']
    },
    {
      id: 2,
      title: 'Social Media Marketing Strategy',
      description: 'Comprehensive guide on creating effective social media campaigns for product promotion.',
      category: 'guides',
      type: 'PDF Guide',
      duration: '25 min read',
      difficulty: 'Intermediate',
      rating: 4.9,
      downloads: 890,
      thumbnail: '/placeholder.jpg',
      author: 'David Content',
      tags: ['social media', 'strategy', 'marketing']
    },
    {
      id: 3,
      title: 'Email Marketing Templates',
      description: 'Ready-to-use email templates for different product categories and target audiences.',
      category: 'templates',
      type: 'Template Pack',
      duration: '5 min setup',
      difficulty: 'Beginner',
      rating: 4.7,
      downloads: 2100,
      thumbnail: '/placeholder.jpg',
      author: 'Grace Design',
      tags: ['email', 'templates', 'automation']
    },
    {
      id: 4,
      title: 'Advanced Commission Optimization',
      description: 'Learn advanced strategies to increase your commission rates and conversion rates.',
      category: 'tutorials',
      type: 'Video Course',
      duration: '45 min',
      difficulty: 'Advanced',
      rating: 4.6,
      downloads: 445,
      thumbnail: '/placeholder.jpg',
      author: 'James Analytics',
      tags: ['commission', 'optimization', 'advanced']
    },
    {
      id: 5,
      title: 'Certified Digital Marketer',
      description: 'Complete certification program for digital marketing excellence.',
      category: 'certifications',
      type: 'Certification',
      duration: '4 weeks',
      difficulty: 'Advanced',
      rating: 4.9,
      downloads: 156,
      thumbnail: '/placeholder.jpg',
      author: 'Comrades360 Academy',
      tags: ['certification', 'digital marketing', 'excellence']
    },
    {
      id: 6,
      title: 'Product Photography Tips',
      description: 'Learn how to take compelling product photos that drive conversions.',
      category: 'guides',
      type: 'Photo Guide',
      duration: '20 min read',
      difficulty: 'Intermediate',
      rating: 4.5,
      downloads: 678,
      thumbnail: '/placeholder.jpg',
      author: 'Mike Photography',
      tags: ['photography', 'product images', 'conversions']
    }
  ];

  const contests = [
    {
      id: 1,
      title: 'January Top Marketer Challenge',
      description: 'Compete with other marketers for the highest conversion rate this month.',
      prize: 'KES 10,000 + Gold Badge',
      deadline: '2024-01-31',
      participants: 47,
      status: 'active'
    },
    {
      id: 2,
      title: 'Social Media Mastery Contest',
      description: 'Showcase your best social media marketing campaigns.',
      prize: 'Premium Feature Access + KES 5,000',
      deadline: '2024-02-15',
      participants: 23,
      status: 'active'
    }
  ];

  const toggleBookmark = (resourceId) => {
    const newBookmarked = new Set(bookmarked);
    if (newBookmarked.has(resourceId)) {
      newBookmarked.delete(resourceId);
    } else {
      newBookmarked.add(resourceId);
    }
    setBookmarked(newBookmarked);
  };

  const filteredResources = activeCategory === 'all' 
    ? resources 
    : resources.filter(resource => resource.category === activeCategory);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Learning Resources</h1>
            <p className="text-gray-600">Master the art of digital marketing and increase your earnings</p>
          </div>
          <div className="flex items-center space-x-2">
            <FaAward className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Your Level</p>
              <p className="text-lg font-bold text-gray-800">Gold Marketer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Contests */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg shadow p-6 text-white">
        <h2 className="text-xl font-bold mb-4">🚀 Active Contests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contests.map((contest) => (
            <div key={contest.id} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="font-semibold mb-2">{contest.title}</h3>
              <p className="text-sm mb-2 opacity-90">{contest.description}</p>
              <div className="flex justify-between items-center text-sm">
                <span>🏆 {contest.prize}</span>
                <span>👥 {contest.participants} participants</span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs">⏰ Ends: {contest.deadline}</span>
                  <button className="bg-white text-purple-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100">
                    Join Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon}
              <span className="ml-2">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <div key={resource.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img 
                src={resource.thumbnail} 
                alt={resource.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => toggleBookmark(resource.id)}
                  className={`p-2 rounded-full backdrop-blur-sm ${
                    bookmarked.has(resource.id) 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-white/80 text-gray-600 hover:bg-white'
                  }`}
                >
                  <FaBookmark className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  getDifficultyColor(resource.difficulty)
                }`}>
                  {resource.difficulty}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-blue-600 font-medium">{resource.type}</span>
                <div className="flex items-center text-yellow-500">
                  <FaStar className="w-3 h-3 fill-current" />
                  <span className="text-xs ml-1">{resource.rating}</span>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{resource.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{resource.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span className="flex items-center">
                  <FaClock className="w-3 h-3 mr-1" />
                  {resource.duration}
                </span>
                <span>by {resource.author}</span>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {resource.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500">
                  <FaDownload className="w-3 h-3 mr-1" />
                  {resource.downloads}
                </div>
                <button className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Access Resource
                  <FaChevronRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Learning Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">8</div>
            <div className="text-sm text-gray-600">Completed Courses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">12</div>
            <div className="text-sm text-gray-600">Resources Bookmarked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">2</div>
            <div className="text-sm text-gray-600">Certifications</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">3</div>
            <div className="text-sm text-gray-600">Contest Wins</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningResources;