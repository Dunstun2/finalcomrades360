import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Lightbulb, Target, Heart, Award } from 'lucide-react';
import { cmsApi } from '../../services/api';
import { usePlatform } from '../../contexts/PlatformContext';
import { resolveImageUrl } from '../../utils/imageUtils';
import Footer from '../../shared/components/Footer';

const AboutPage = () => {
  const { settings } = usePlatform();
  const [aboutContent, setAboutContent] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const siteName = settings.platform?.siteName || 'Comrades360';
  const siteLogo = settings.platform?.siteLogo;

  useEffect(() => {
    const fetchAboutPageData = async () => {
      setLoading(true);
      try {
        const contentResponse = await cmsApi.getAboutPage();
        setAboutContent(contentResponse.data?.content || null);

        const teamResponse = await cmsApi.getTeamMembers();
        const activeMembers = teamResponse.data?.team?.filter(m => m.isActive) || [];
        setTeamMembers(activeMembers);
      } catch (err) {
        console.error('Error fetching about page:', err);
        if (err.response?.status !== 404) {
          setError('Failed to load about page. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAboutPageData();
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading about page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Error Loading Page</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Brand identity */}
      <header className="pt-6 pb-4 md:pt-8 md:pb-6 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">Back</span>
            </button>

            {/* Logo and Title */}
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-1">
              {siteLogo ? (
                <img
                  src={resolveImageUrl(siteLogo)}
                  alt={siteName}
                  className="h-24 w-24 md:h-40 md:w-40 object-contain shrink-0"
                />
              ) : (
                <div className="h-24 w-24 md:h-40 md:w-40 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-4xl md:text-6xl font-extrabold shrink-0">
                  {siteName.charAt(0)}
                </div>
              )}
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                <span className="text-gray-900 dark:text-white">Comrades</span>
                <span className="text-blue-600 dark:text-blue-400">360</span>
              </h1>
            </div>

            {/* Spacer for symmetry */}
            <div className="w-[100px] sm:w-[120px]"></div>
          </div>
        </div>
      </header>



      {/* Main Content */}
      {aboutContent ? (
        <section className="py-8 md:py-12 bg-white dark:bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Story Card */}
              {aboutContent.brandStory && (
                <div className="group relative bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Story</h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {aboutContent.brandStory}
                    </p>
                  </div>
                </div>
              )}

              {/* Values Card */}
              {aboutContent.values && (
                <div className="group relative bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Values</h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {aboutContent.values}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Vision Card */}
              {aboutContent.vision && (
                <div className="group relative bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-8 border border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Vision</h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {aboutContent.vision}
                    </p>
                  </div>
                </div>
              )}

              {/* Mission Card */}
              {aboutContent.mission && (
                <div className="group relative bg-green-50 dark:bg-green-900/20 rounded-2xl p-8 border border-green-200 dark:border-green-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {aboutContent.mission}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Info Card */}
            {aboutContent.additionalInfo && (
              <div className="group relative bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">More About Us</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {aboutContent.additionalInfo}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="py-20 md:py-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xl text-gray-600 dark:text-gray-400">Coming soon...</p>
          </div>
        </section>
      )}

      {/* Team Section */}
      {teamMembers.length > 0 && (
        <section className="py-12 md:py-16 bg-gray-50 dark:bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-6xl font-bold mb-4">
                <span className="text-gray-900 dark:text-white">Comrades</span>
                <span className="text-blue-600 dark:text-blue-400">360</span>
                {' '}
                <span className="text-yellow-500 dark:text-yellow-400">Team</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member, idx) => (
                <div
                  key={member.id}
                  className="group relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Photo */}
                  <div className="w-full h-48 bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=3b82f6&color=fff&size=200`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 text-blue-600 dark:text-blue-400">
                        <div className="w-16 h-16 rounded-full bg-blue-200/70 dark:bg-slate-600 flex items-center justify-center font-bold text-2xl text-blue-700 dark:text-blue-300 mb-1">
                          {member.name ? member.name.charAt(0).toUpperCase() : '👤'}
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{member.name}</h3>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">{member.position}</p>
                    {member.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 leading-relaxed">
                        {member.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;
