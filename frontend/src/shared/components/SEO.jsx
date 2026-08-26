import React from 'react';
import { Helmet } from 'react-helmet-async';
import { usePlatform } from '@/contexts/PlatformContext';

const buildOrganizationSchema = ({ siteName, siteUrl, logo }) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  logo: logo || undefined
});

const SEO = ({
  title,
  description,
  image,
  url,
  keywords,
  siteName,
  logo,
  schema
}) => {
  const canonical = url || (typeof window !== 'undefined' ? window.location.href : undefined);
  const { settings } = usePlatform();

  // Attempt to find a per-page override based on current path or page type
  const seoPages = settings?.seo_pages || {};
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  let override = null;
  if (pathname && seoPages[pathname]) {
    override = seoPages[pathname];
  } else if ((pathname === '/' || pathname === '') && seoPages.homepage) {
    override = seoPages.homepage;
  } else {
    // Common template keys: product, category, blog
    Object.keys(seoPages).some(k => {
      if (k === 'product' && pathname.startsWith('/product')) { override = seoPages[k]; return true; }
      if (k === 'category' && pathname.startsWith('/category')) { override = seoPages[k]; return true; }
      if (k === 'blog' && pathname.startsWith('/blog')) { override = seoPages[k]; return true; }
      return false;
    });
  }

  // Merge overrides
  const finalTitle = (override && override.title) || title;
  const finalDescription = (override && override.description) || description;
  const finalKeywords = (override && override.keywords) || keywords;

  const orgSchema = buildOrganizationSchema({ siteName, siteUrl: (typeof window !== 'undefined' ? window.location.origin : ''), logo });

  return (
    <Helmet>
      {finalTitle && <title>{finalTitle}</title>}
      {finalDescription && <meta name="description" content={finalDescription} />}
      {finalKeywords && <meta name="keywords" content={finalKeywords} />}

      {/* Open Graph */}
      {finalTitle && <meta property="og:title" content={finalTitle} />}
      {finalDescription && <meta property="og:description" content={finalDescription} />}
      {image && <meta property="og:image" content={image} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      {finalTitle && <meta name="twitter:title" content={finalTitle} />}
      {finalDescription && <meta name="twitter:description" content={finalDescription} />}
      {image && <meta name="twitter:image" content={image} />}

      {canonical && <link rel="canonical" href={canonical} />}

      {/* JSON-LD: Organization + optional page schema */}
      <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </Helmet>
  );
};

export default SEO;
