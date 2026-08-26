const express = require('express');
const router = express.Router();
const { Product, BlogPost, Service, FastFood } = require('../models');

// Utility to ensure absolute URL
const makeAbsolute = (req, path) => {
  const base = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
};

// GET /sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  try {
    const urls = [];

    // Static pages
    const staticPaths = ['/', '/about', '/contact', '/blog', '/terms', '/privacy', '/faq', '/help'];
    staticPaths.forEach(p => urls.push({ loc: makeAbsolute(req, p), lastmod: new Date().toISOString() }));

    // Blog posts
    try {
      const posts = await BlogPost.findAll({ where: { status: 'published' }, order: [['publishedAt','DESC']], limit: 5000 });
      posts.forEach(post => {
        urls.push({ loc: makeAbsolute(req, `/blog/${post.slug}`), lastmod: post.publishedAt ? new Date(post.publishedAt).toISOString() : post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString() });
      });
    } catch (e) {
      console.warn('[sitemap] Failed to fetch BlogPost:', e.message);
    }

    // Products
    try {
      const products = await Product.findAll({ where: { status: 'active', visibilityStatus: 'visible' }, order: [['updatedAt','DESC']], limit: 10000 });
      products.forEach(p => {
        urls.push({ loc: makeAbsolute(req, `/product/${p.id}`), lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString() });
      });
    } catch (e) {
      console.warn('[sitemap] Failed to fetch Products:', e.message);
    }

    // Services and FastFood (if models exist)
    try {
      if (Service) {
        const services = await Service.findAll({ where: {}, order: [['updatedAt','DESC']], limit: 2000 });
        services.forEach(s => urls.push({ loc: makeAbsolute(req, `/service/${s.id}`), lastmod: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString() }));
      }
    } catch (e) { console.warn('[sitemap] Services skipped:', e.message); }

    try {
      if (FastFood) {
        const ff = await FastFood.findAll({ where: {}, order: [['updatedAt','DESC']], limit: 2000 });
        ff.forEach(f => urls.push({ loc: makeAbsolute(req, `/fastfood/${f.id}`), lastmod: f.updatedAt ? new Date(f.updatedAt).toISOString() : new Date().toISOString() }));
      }
    } catch (e) { console.warn('[sitemap] FastFood skipped:', e.message); }

    // Build XML
    const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
    urls.forEach(u => {
      xmlParts.push('  <url>');
      xmlParts.push(`    <loc>${u.loc}</loc>`);
      if (u.lastmod) xmlParts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      xmlParts.push('  </url>');
    });
    xmlParts.push('</urlset>');

    res.header('Content-Type', 'application/xml');
    return res.send(xmlParts.join('\n'));
  } catch (err) {
    console.error('[sitemap] Error building sitemap:', err.message);
    return res.status(500).send('Failed to generate sitemap');
  }
});

module.exports = router;
