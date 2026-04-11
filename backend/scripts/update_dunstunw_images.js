const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Product, FastFood, User, Category } = require('../models');

const specificMappings = {
    // FastFood
    'Classic Beef Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop',
    'Crispy Chicken Shawarma': 'https://images.unsplash.com/photo-1529193591184-b1d58b35ec16?q=80&w=800&auto=format&fit=crop',
    'Loaded Cheese Fries': 'https://images.unsplash.com/photo-1630384066272-17114e28755e?q=80&w=800&auto=format&fit=crop',
    'Margherita Pizza Slice': 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?q=80&w=800&auto=format&fit=crop',
    'Spicy Ramen Noodle Bowl': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800&auto=format&fit=crop',
    
    // Products
    'iPhone 14 Pro 256GB': 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?q=80&w=800&auto=format&fit=crop',
    'Sony WH-1000XM5 Wireless Headphones': 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop',
    'MacBook Air M2 13-inch': 'https://images.unsplash.com/photo-1611186871348-b1ec696e52c9?q=80&w=800&auto=format&fit=crop',
    'Nintendo Switch OLED Model': 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?q=80&w=800&auto=format&fit=crop',
    'Canon EOS R6 Mark II': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop',
    'Apple Watch Series 8': 'https://images.unsplash.com/photo-1434494878577-86c23bdd0639?q=80&w=800&auto=format&fit=crop',
    'Bose QuietComfort 45': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',
    'Nike Air Max 270': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
    'Nike Air Jordan 1 Retro High OG': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
    "Levi's 501 Original Fit Jeans": 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop',
    'Rolex Submariner Date 41mm': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
    'Ray-Ban Wayfarer Classic': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop',
    'Moleskine Classic Notebook': 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=800&auto=format&fit=crop',
    'JanSport SuperBreak Backpack': 'https://images.unsplash.com/photo-1553062407-98eeb94c6a62?q=80&w=800&auto=format&fit=crop'
};

const categoryFallbacks = {
    'Electronics & Appliances': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=800&auto=format&fit=crop',
    'Fashion & Design': 'https://images.unsplash.com/photo-1445205170230-053b830c6050?q=80&w=800&auto=format&fit=crop',
    'Home & Living': 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?q=80&w=800&auto=format&fit=crop',
    'Health & Beauty': 'https://images.unsplash.com/photo-1522335789203-aabd1fc04523?q=80&w=800&auto=format&fit=crop',
    'Supermarket & Supplies': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
    'Sports & Fitness': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop',
    'Baby & Kids': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800&auto=format&fit=crop'
};

const cache = {};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getOptimizedBuffer(url) {
    if (cache[url]) return cache[url];
    
    console.log(`Downloading ${url}...`);
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const buffer = Buffer.from(response.data);
        const optimized = await sharp(buffer)
            .resize(800)
            .webp({ quality: 80 })
            .toBuffer();
        
        cache[url] = optimized;
        return optimized;
    } catch (e) {
        console.error(`Failed to download ${url}: ${e.message}`);
        return null;
    }
}

async function updateAll() {
    const sellerEmail = 'dunstunw@gmail.com';
    const user = await User.findOne({ where: { email: sellerEmail } });
    const sellerId = user.id;

    // 1. Process FastFood
    const fastFoods = await FastFood.findAll({ where: { vendor: sellerId } });
    for (const ff of fastFoods) {
        const url = specificMappings[ff.name] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop';
        const buffer = await getOptimizedBuffer(url);
        if (buffer) {
            const filename = `ff_${ff.id}_${Date.now()}.webp`;
            const uploadPath = path.join(__dirname, '../public/uploads/other', filename);
            const dir = path.dirname(uploadPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(uploadPath, buffer);
            await ff.update({ mainImage: `/uploads/other/${filename}` });
            console.log(`Updated FastFood: ${ff.name}`);
        }
    }

    // 2. Process Products
    const products = await Product.findAll({ 
        where: { sellerId },
        include: [{ model: Category, as: 'category' }]
    });

    for (const p of products) {
        const url = specificMappings[p.name] || (p.category ? categoryFallbacks[p.category.name] : null) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop';
        const buffer = await getOptimizedBuffer(url);
        if (buffer) {
            const base64 = `data:image/webp;base64,${buffer.toString('base64')}`;
            await p.update({ coverImage: base64 });
            console.log(`Updated Product: ${p.name}`);
        }
        await sleep(200); // Small throttle
    }

    console.log('Complete update finished.');
    process.exit(0);
}

updateAll();
