const axios = require('axios');
const { PlatformConfig } = require('../../../database/models.registry');

/**
 * Intelligent Banner Content Generator
 * Dynamic multi-angle heuristic pools + Google Gemini / OpenAI integration.
 */
class HeroBannerAIService {
  static shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static async getAIConfig() {
    let geminiKey = process.env.GEMINI_API_KEY || '';
    let openaiKey = process.env.OPENAI_API_KEY || '';

    try {
      const configRecord = await PlatformConfig.findOne({ where: { key: 'ai_settings' } });
      if (configRecord && configRecord.value) {
        const val = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
        if (val.geminiApiKey) geminiKey = val.geminiApiKey;
        if (val.openaiApiKey) openaiKey = val.openaiApiKey;
      }
    } catch {
      // PlatformConfig lookup non-fatal
    }

    return { geminiKey, openaiKey };
  }

  static async suggest({ promoType = 'product', type = 'seller', items = [], bannerLocation = ['homepage'], currentValues = {} }) {
    const { geminiKey, openaiKey } = await this.getAIConfig();

    if (geminiKey) {
      try {
        const result = await this.callGemini(geminiKey, { promoType, type, items, bannerLocation, currentValues });
        if (result && result.headingSuggestions?.length) return { ...result, source: 'gemini' };
      } catch (err) {
        console.warn('[HeroBannerAIService] Gemini call failed, falling back to heuristic engine:', err.message);
      }
    }

    if (openaiKey) {
      try {
        const result = await this.callOpenAI(openaiKey, { promoType, type, items, bannerLocation, currentValues });
        if (result && result.headingSuggestions?.length) return { ...result, source: 'openai' };
      } catch (err) {
        console.warn('[HeroBannerAIService] OpenAI call failed, falling back to heuristic engine:', err.message);
      }
    }

    // Dynamic heuristic campus engine
    const heuristicResult = this.generateHeuristicSuggestions({ promoType, type, items, bannerLocation, currentValues });
    return { ...heuristicResult, source: 'campus_ai_engine' };
  }

  static async callGemini(apiKey, { promoType, type, items, bannerLocation, currentValues }) {
    const itemNames = items.map(i => i.name).filter(Boolean).join(', ') || 'Campus products';
    const isFood = promoType === 'fastfood' || (Array.isArray(bannerLocation) && bannerLocation.includes('fastfood'));
    const angles = [
      'High urgency, limited time flash deals and FOMO',
      'Student budget savings, value and smart shopping',
      'Hostel delivery speed, convenience and comfort',
      'Campus popularity, trending and social proof',
      'Exclusive comrade discounts and rewards'
    ];
    const chosenAngle = angles[Math.floor(Math.random() * angles.length)];

    const prompt = `You are an elite marketing copywriter for "Comrades360", a university campus e-commerce and fast food delivery marketplace in Kenya.
Marketing Angle: ${chosenAngle}
Context:
- Type: ${type} promotion
- Category: ${isFood ? 'Fast Food / Dining' : 'Student Products & Electronics'}
- Featured Items: ${itemNames}
- Placement: ${Array.isArray(bannerLocation) ? bannerLocation.join(', ') : bannerLocation}
- Avoid duplicating existing title: "${currentValues.title || ''}"

Generate FRESH, CREATIVE, and DIVERSE banner copy tailored for university students (comrades).
Respond ONLY with a valid JSON object matching this exact structure:
{
  "headingSuggestions": ["Short punchy uppercase heading 1", "Heading 2", "Heading 3", "Heading 4"],
  "shortDescriptionSuggestions": [
    "Engaging 1-2 sentence description emphasizing convenience, hostel delivery, or savings.",
    "Alternative description 2.",
    "Alternative description 3."
  ],
  "eyebrowSuggestions": ["🔥 EXCLUSIVE DEAL", "⚡ FLASH SALE", "✨ NEW LAUNCH", "🎓 STUDENT SPECIAL", "🚀 HOT DROP"],
  "ctaSuggestions": ["Shop Now", "Order Now", "Claim Deal", "Explore Menu"],
  "trustBadgeSets": [
    [
      { "icon": "📍", "text": "Hostel Delivery" },
      { "icon": "⚡", "text": "Instant M-Pesa" },
      { "icon": "🛡️", "text": "Verified Quality" }
    ],
    [
      { "icon": "💰", "text": "Student Discount" },
      { "icon": "⭐", "text": "Campus Favorite" },
      { "icon": "🚀", "text": "Quick Dropoff" }
    ]
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.85
      }
    }, { timeout: 7000 });

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return JSON.parse(text);
  }

  static async callOpenAI(apiKey, { promoType, type, items, bannerLocation, currentValues }) {
    const itemNames = items.map(i => i.name).filter(Boolean).join(', ') || 'Campus products';
    const isFood = promoType === 'fastfood' || (Array.isArray(bannerLocation) && bannerLocation.includes('fastfood'));
    const angles = [
      'High urgency, limited time flash deals and FOMO',
      'Student budget savings, value and smart shopping',
      'Hostel delivery speed, convenience and comfort',
      'Campus popularity, trending and social proof'
    ];
    const chosenAngle = angles[Math.floor(Math.random() * angles.length)];

    const prompt = `You are a high-conversion marketing copywriter for "Comrades360", a university campus marketplace.
Focus Angle: ${chosenAngle}
- Category: ${isFood ? 'Fast Food / Dining' : 'Student Products & Electronics'}
- Items: ${itemNames}

Return a fresh JSON object with:
- "headingSuggestions": 4 punchy uppercase banner headings
- "shortDescriptionSuggestions": 3 compelling 1-2 sentence descriptions
- "eyebrowSuggestions": 5 badges with emojis (e.g. 🔥 LIMITED DROP)
- "ctaSuggestions": 4 action button labels
- "trustBadgeSets": 2 sets of EXACTLY 3 badges each with {"icon": emoji, "text": max 22 chars}`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.85
    }, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 7000
    });

    const text = res.data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty OpenAI response');
    return JSON.parse(text);
  }

  /**
   * Smart Contextual Algorithmic Generator with dynamic shuffling
   */
  static generateHeuristicSuggestions({ promoType, type, items, bannerLocation, currentValues }) {
    const isFood = promoType === 'fastfood' || (Array.isArray(bannerLocation) && bannerLocation.includes('fastfood'));
    const isServices = Array.isArray(bannerLocation) && bannerLocation.includes('services');
    const isBlog = Array.isArray(bannerLocation) && bannerLocation.includes('blog');
    const firstItem = items && items[0] ? items[0] : null;
    const rawName = firstItem ? firstItem.name : '';
    const itemName = rawName.length > 28 ? rawName.slice(0, 25) + '...' : rawName;
    const discount = firstItem && firstItem.discountPercentage ? `${firstItem.discountPercentage}% OFF` : '';

    if (isFood) {
      const headingPool = [
        itemName ? `🔥 CRAVING ${itemName.toUpperCase()}?` : '🍔 SIZZLING CAMPUS BITES',
        itemName ? `⚡ ${itemName.toUpperCase()} DORM DROP` : '⚡ FRESH, HOT & DORM READY',
        itemName ? `✨ BEST ${itemName.toUpperCase()} ON CAMPUS` : '🍕 TASTE THE CAMPUS FAVORITES',
        '🚀 20-MIN HOSTEL FOOD DROP',
        itemName ? `😋 FEAST ON ${itemName.toUpperCase()}` : '🍟 LATE NIGHT STUDY BITES',
        '🌟 CAMPUS FLAVORS DELIVERED',
        itemName ? `🔥 SIZZLING ${itemName.toUpperCase()} SPECIAL` : '🥪 SPEEDY CAMPUS MEALS',
        '💥 UNBEATABLE FOOD COMBOS',
        '🍗 CRISPY, TASTY & DELIVERED',
        '🍜 COMRADE COMFORT MEALS'
      ];

      const descPool = [
        `Satisfy your hunger with freshly prepared ${itemName || 'meals'} delivered straight to your hostel hall in under 20 minutes.`,
        `Crispy, flavorful, and comrade-approved! Order your favorite campus meals with instant M-Pesa payment and swift doorstep drop.`,
        `Study fuel at student-friendly prices. Freshly prepared, hygienically packed, and delivered right to your room.`,
        `Craving good food after long lectures? Get hot meals cooked to perfection and dropped at your hostel entrance.`,
        `Skip the cooking hassle. Indulge in campus-favorite dishes with verified hygiene and lightning-fast hostel dispatch.`,
        `Delicious, affordable, and comrade-tested. Enjoy hot meals without putting a dent in your semester budget.`
      ];

      const eyebrowPool = [
        '🍔 CHEF RECOMMENDED',
        '🔥 FRESH OFF THE GRILL',
        '⚡ 20-MIN HOSTEL DROP',
        '✨ TASTY CAMPUS PICK',
        '🍕 CRAZY MEAL COMBO',
        '🍗 POPULAR ON CAMPUS',
        '🕒 LATE NIGHT FUEL',
        '🚀 SIZZLING HOT DEAL',
        '🥪 QUICK BITE SPECIAL',
        '⭐ 5-STAR TASTE'
      ];

      const ctaPool = [
        'Order Now',
        'Satisfy Cravings',
        'Get Food Now',
        'View Hot Menu',
        'Claim Meal Deal',
        'Order to Hostel',
        'Taste Today'
      ];

      const badgeSetsPool = [
        [
          { icon: '🔥', text: 'Freshly Cooked' },
          { icon: '⚡', text: '20-Min Delivery' },
          { icon: '🥗', text: 'Hygiene Certified' }
        ],
        [
          { icon: '📍', text: 'Direct to Hostel' },
          { icon: '📱', text: 'Instant M-Pesa' },
          { icon: '⭐', text: 'Campus Favorite' }
        ],
        [
          { icon: '💰', text: 'Student Friendly' },
          { icon: '🥤', text: 'Combo Specials' },
          { icon: '🛡️', text: 'Verified Kitchen' }
        ],
        [
          { icon: '🚀', text: 'Express Drop' },
          { icon: '🍗', text: 'Hot & Crispy' },
          { icon: '😋', text: 'Comrade Approved' }
        ],
        [
          { icon: '🕒', text: 'Late Night Ready' },
          { icon: '🛵', text: 'Hostel Courrier' },
          { icon: '💳', text: 'Zero Hidden Fees' }
        ]
      ];

      return {
        headingSuggestions: this.shuffleArray(headingPool).slice(0, 4),
        shortDescriptionSuggestions: this.shuffleArray(descPool).slice(0, 3),
        eyebrowSuggestions: this.shuffleArray(eyebrowPool).slice(0, 5),
        ctaSuggestions: this.shuffleArray(ctaPool).slice(0, 4),
        trustBadgeSets: this.shuffleArray(badgeSetsPool).slice(0, 3)
      };
    }

    if (isServices) {
      const headingPool = [
        '🛠️ TRUSTED CAMPUS SERVICES',
        '⚡ FAST & VERIFIED CAMPUS PROS',
        '🎓 MADE BY STUDENTS FOR STUDENTS',
        '🚀 RELIABLE HELP AT YOUR DOORSTEP',
        '💡 SMART CAMPUS ASSISTANCE',
        '⭐ TOP-RATED CAMPUS SPECIALISTS',
        '🤝 CONVENIENT DORM SERVICES'
      ];

      const descPool = [
        'Get your laundry, tech repairs, printing, and styling done by verified campus pros without leaving your hostel.',
        'Quality campus service providers vetted for safety, speed, and student-friendly pricing.',
        'Skip the hassle — book top-rated campus specialists with guaranteed satisfaction and quick turnaround.',
        'Professional, affordable, and on-time student services designed specifically for university life.'
      ];

      const eyebrowPool = [
        '⭐ TOP-RATED PROS',
        '⚡ SAME-DAY SERVICE',
        '🛡️ 100% VERIFIED',
        '🎓 STUDENT DISCOUNTS',
        '✨ RECOMMENDED',
        '🚀 FAST DISPATCH'
      ];

      const ctaPool = [
        'Book Service',
        'Explore Services',
        'Find a Pro',
        'Get Help Today',
        'Book Now'
      ];

      const badgeSetsPool = [
        [
          { icon: '🛡️', text: 'Verified Providers' },
          { icon: '⚡', text: 'Same-Day Response' },
          { icon: '💰', text: 'Student Friendly' }
        ],
        [
          { icon: '📍', text: 'Hostel Coverage' },
          { icon: '⭐', text: 'Top Rated Pros' },
          { icon: '🔒', text: 'Safe & Secure' }
        ],
        [
          { icon: '🤝', text: 'Student Backed' },
          { icon: '🕒', text: 'Fast Turnaround' },
          { icon: '✅', text: 'Quality Guaranteed' }
        ]
      ];

      return {
        headingSuggestions: this.shuffleArray(headingPool).slice(0, 4),
        shortDescriptionSuggestions: this.shuffleArray(descPool).slice(0, 3),
        eyebrowSuggestions: this.shuffleArray(eyebrowPool).slice(0, 5),
        ctaSuggestions: this.shuffleArray(ctaPool).slice(0, 4),
        trustBadgeSets: this.shuffleArray(badgeSetsPool).slice(0, 3)
      };
    }

    if (isBlog) {
      const headingPool = [
        '📰 INSPIRING COMRADE STORIES',
        '💡 CAMPUS HUSTLE & CAREER TIPS',
        '✨ LATEST ARTICLES & INSIGHTS',
        '🚀 REAL ADVICE BY STUDENTS FOR STUDENTS',
        '🎓 LEVEL UP YOUR SEMESTER',
        '🌟 STORIES THAT EMPOWER COMRADES'
      ];

      const descPool = [
        'Discover actionable business ideas, campus life tips, and career opportunities from the Comrades360 community.',
        'Read real experiences, study hacks, and entrepreneurship insights written by fellow students.',
        'Stay informed and inspired with stories, trends, and resources designed to help university students succeed.'
      ];

      const eyebrowPool = [
        '📰 FEATURED READ',
        '💡 CAMPUS INSIGHTS',
        '✨ MUST READ',
        '🎓 STUDENT LIFE',
        '🚀 TRENDING STORY',
        '🌟 COMRADE SPOTLIGHT'
      ];

      const ctaPool = [
        'Read Article',
        'Explore Stories',
        'Read Now',
        'Discover More',
        'Join the Discussion'
      ];

      const badgeSetsPool = [
        [
          { icon: '📰', text: 'Weekly Updates' },
          { icon: '💡', text: 'Actionable Advice' },
          { icon: '🎓', text: 'Student Centric' }
        ],
        [
          { icon: '✍️', text: 'Community Authors' },
          { icon: '🔥', text: 'Trending Topics' },
          { icon: '🚀', text: 'Career Boost' }
        ],
        [
          { icon: '🌟', text: 'Inspiring Stories' },
          { icon: '⚡', text: 'Quick Reads' },
          { icon: '🤝', text: 'By Comrades' }
        ]
      ];

      return {
        headingSuggestions: this.shuffleArray(headingPool).slice(0, 4),
        shortDescriptionSuggestions: this.shuffleArray(descPool).slice(0, 3),
        eyebrowSuggestions: this.shuffleArray(eyebrowPool).slice(0, 5),
        ctaSuggestions: this.shuffleArray(ctaPool).slice(0, 4),
        trustBadgeSets: this.shuffleArray(badgeSetsPool).slice(0, 3)
      };
    }

    // Default Products / Tech / Fashion / General
    const headingPool = [
      itemName
        ? (discount ? `🔥 ${discount} ON ${itemName.toUpperCase()}` : `🔥 GET ${itemName.toUpperCase()} TODAY`)
        : '🔥 MEGA CAMPUS SAVINGS',
      '⚡ UNBEATABLE STUDENT DISCOUNTS',
      itemName ? `✨ PREMIUM ${itemName.toUpperCase()}` : '🎒 DORM & SEMESTER ESSENTIALS',
      '🚀 TOP RATED CAMPUS DROP',
      itemName ? `💥 LIMITED STOCK: ${itemName.toUpperCase()}` : '💥 CRAZY PRICE SLASH',
      '🎓 EXCLUSIVE STUDENT DROP',
      '🌟 BESTSELLERS IN CAMPUS',
      itemName ? `⚡ GRAB YOUR ${itemName.toUpperCase()}` : '⚡ 24H FLASH DEALS',
      '🛡️ GENUINE STUDENT GEAR',
      '📦 DIRECT HOSTEL DISPATCH'
    ];

    const descPool = [
      `Score verified ${itemName || 'campus essentials'} at student-friendly prices with rapid doorstep delivery across all hostels.`,
      `Upgrade your semester setup with genuine products, instant M-Pesa checkout, and guaranteed campus warranty.`,
      `Top-selling student gear at prices that protect your pocket. Verified sellers, pristine quality, and quick hostel drop.`,
      `Don't settle for less. Enjoy premium quality gadgets and dorm essentials backed by student reviews and fast delivery.`,
      `Handpicked campus deals curated for smart students. Save big, checkout securely, and get it delivered today.`,
      `Authentic items with hassle-free returns and direct-to-dorm delivery across all university residences.`
    ];

    const eyebrowPool = [
      '🔥 LIMITED EDITION',
      '⚡ 24H FLASH SALE',
      '✨ CAMPUS EXCLUSIVE',
      '🎓 STUDENT SPECIAL',
      '🚀 HOT NEW DROP',
      '💥 PRICE DROP',
      '⭐ BESTSELLER',
      '🛡️ 100% GENUINE',
      '🎒 DORM ESSENTIAL',
      '🏷️ EXCLUSIVE DEAL'
    ];

    const ctaPool = [
      'Shop Now',
      'Claim Deal',
      'Buy Now',
      'Explore Collection',
      'Grab Offer',
      'Order Today',
      'View Deal'
    ];

    const badgeSetsPool = [
      [
        { icon: '📍', text: 'Hostel Delivery' },
        { icon: '⚡', text: 'Instant M-Pesa' },
        { icon: '🛡️', text: '100% Genuine' }
      ],
      [
        { icon: '💰', text: 'Student Discount' },
        { icon: '⭐', text: 'Campus Favorite' },
        { icon: '🔄', text: 'Easy 7-Day Returns' }
      ],
      [
        { icon: '🚀', text: 'Same-Day Drop' },
        { icon: '🔒', text: 'Secure Checkout' },
        { icon: '🎓', text: 'Verified Seller' }
      ],
      [
        { icon: '📦', text: 'Safe Packaging' },
        { icon: '⚡', text: 'Express Delivery' },
        { icon: '💎', text: 'Top Student Pick' }
      ],
      [
        { icon: '🤝', text: 'Comrade Verified' },
        { icon: '🏷️', text: 'Best Price Promise' },
        { icon: '📍', text: 'Doorstep Delivery' }
      ]
    ];

    return {
      headingSuggestions: this.shuffleArray(headingPool).slice(0, 4),
      shortDescriptionSuggestions: this.shuffleArray(descPool).slice(0, 3),
      eyebrowSuggestions: this.shuffleArray(eyebrowPool).slice(0, 5),
      ctaSuggestions: this.shuffleArray(ctaPool).slice(0, 4),
      trustBadgeSets: this.shuffleArray(badgeSetsPool).slice(0, 3)
    };
  }
}

module.exports = HeroBannerAIService;
