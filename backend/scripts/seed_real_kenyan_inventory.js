const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Product, FastFood, User, Category, Subcategory } = require('../models');

async function getOptimizedImage(url, destPath = null) {
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
        
        if (destPath) {
            fs.writeFileSync(destPath, optimized);
            return true;
        }
        return `data:image/webp;base64,${optimized.toString('base64')}`;
    } catch (e) {
        console.error(`Failed to process image ${url}: ${e.message}`);
        return null;
    }
}

const productData = [
  // Electronics
  { name: 'Refurbished HP EliteBook 840 G5', categoryId: 3, subcategoryId: 11, price: 35000, description: 'Business-class laptop with Intel Core i5, 8GB RAM, and 256GB SSD. Perfect for students and professionals.', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop' },
  { name: 'Tecno Spark 10 Pro (256GB/8GB)', categoryId: 3, subcategoryId: 15, price: 19500, description: 'Powerful smartphone with 32MP selfie camera and 5000mAh battery. The ultimate Kenyan favorite.', url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop' },
  { name: 'Sony MHC-V02 High Power Audio', categoryId: 3, subcategoryId: 21, price: 28000, description: 'Fill the room with thumping bass. Features Bluetooth connectivity and Jet Bass Booster.', url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=800&auto=format&fit=crop' },
  { name: 'Ramtons 2-Burner Gas Cooker', categoryId: 3, subcategoryId: 22, price: 4500, description: 'Durable stainless steel table-top cooker. Efficient gas consumption for Kenyan households.', url: 'https://images.unsplash.com/photo-1584990344313-255d4948f95c?q=80&w=800&auto=format&fit=crop' },
  { name: 'Safaricom 4G Home Router', categoryId: 3, subcategoryId: 23, price: 6000, description: 'Plug and play internet for your home. High-speed 4G connectivity across Kenya.', url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=800&auto=format&fit=crop' },
  
  // Fashion
  { name: 'Casual African Print Shirt', categoryId: 4, subcategoryId: 12, price: 1800, description: 'Handmade short-sleeve shirt with authentic Kitenge patterns. Stylish and cultural.', url: 'https://images.unsplash.com/photo-1593032465175-481ac7f402a1?q=80&w=800&auto=format&fit=crop' },
  { name: 'Ankara Maxi Dress with Headwrap', categoryId: 4, subcategoryId: 16, price: 3500, description: 'Stunning full-length dress for special occasions. Comes with a matching headwrap.', url: 'https://images.unsplash.com/photo-1589156229687-496a31ad1d1f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Bata Toughees School Shoes', categoryId: 4, subcategoryId: 17, price: 2200, description: 'Durable black leather school shoes. The classic choice for Kenyan students.', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop' },
  { name: 'Maasai Beaded Jewelry Set', categoryId: 4, subcategoryId: 18, price: 1200, description: 'Authentic handcrafted Choker and Bracelet set. Vibrant colors representing Kenyan heritage.', url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop' },
  { name: 'Handwoven Sisal Kiondo Bag', categoryId: 4, subcategoryId: 19, price: 2500, description: 'Traditional Kiondo weave with modern leather trim. Durable and eco-friendly.', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop' },
  
  // Home & Living
  { name: 'Cypress Wood Double Bed', categoryId: 5, subcategoryId: 24, price: 22000, description: 'Solid wood bed frame with mahogany finish. Locally crafted for comfort and durability.', url: 'https://images.unsplash.com/photo-1505693419148-ad19139933f3?q=80&w=800&auto=format&fit=crop' },
  { name: 'Velvex Luxury Towel Set', categoryId: 5, subcategoryId: 25, price: 1800, description: 'Highly absorbent cotton towels. Includes one large bath towel and one hand towel.', url: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?q=80&w=800&auto=format&fit=crop' },
  { name: 'Kisii Soapstone Candle Holder', categoryId: 5, subcategoryId: 26, price: 850, description: 'Hand-carved decorative piece from genuine Kisii soapstone. Aesthetic and unique.', url: 'https://images.unsplash.com/photo-1526434426615-1abe81efcb0b?q=80&w=800&auto=format&fit=crop' },
  { name: 'Philips LED Rechargeable Lamp', categoryId: 5, subcategoryId: 27, price: 1400, description: 'Bright LED lamp with long-lasting battery. Reliable for lighting during power outages.', url: 'https://images.unsplash.com/photo-1507473885765-e6ed657f9971?q=80&w=800&auto=format&fit=crop' },
  { name: 'Kenyan Red Garden Chairs', categoryId: 5, subcategoryId: 28, price: 1100, description: 'Durable all-weather plastic chairs. The iconic seating for Kenyan outdoor gatherings.', url: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5dd?q=80&w=800&auto=format&fit=crop' },
  
  // Health & Beauty
  { name: 'Nice & Lovely Aloe Body Lotion', categoryId: 6, subcategoryId: 29, price: 450, description: 'Enriched with Aloe Vera and Glycerine for 24-hour skin hydration.', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop' },
  { name: 'Black Opal True Color Foundation', categoryId: 6, subcategoryId: 30, price: 1950, description: 'High-coverage foundation specifically formulated for African skin tones.', url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=800&auto=format&fit=crop' },
  { name: 'Chris Adams Active Man Perfume', categoryId: 6, subcategoryId: 31, price: 2500, description: 'Long-lasting woody and spicy fragrance. A popular choice for Kenyan men.', url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=800&auto=format&fit=crop' },
  { name: 'TCB Naturals Herbal Hair Food', categoryId: 6, subcategoryId: 32, price: 420, description: 'Nourishes the scalp and promotes healthy hair growth. Essential for natural hair.', url: 'https://images.unsplash.com/photo-1527799822340-374ee6f36aec?q=80&w=800&auto=format&fit=crop' },
  { name: 'Dettol Cool Soap (3-pack)', categoryId: 6, subcategoryId: 33, price: 550, description: 'Antibacterial soap with menthol for a refreshing, germ-free wash.', url: 'https://images.unsplash.com/photo-1600857062241-99e5ed7f4cc0?q=80&w=800&auto=format&fit=crop' },
  
  // Supermarket
  { name: 'Santa Lucia Spaghetti 500g', categoryId: 7, subcategoryId: 34, price: 120, description: 'High-quality durum wheat pasta. Cooks in just 8 minutes.', url: 'https://images.unsplash.com/photo-1551462147-3a900cad94fa?q=80&w=800&auto=format&fit=crop' },
  { name: 'Menengai Cream Bar Soap 800g', categoryId: 7, subcategoryId: 35, price: 210, description: 'Traditional multi-purpose laundry and bathing soap. Tough on stains, gentle on skin.', url: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=800&auto=format&fit=crop' },
  { name: 'Blue Band Margarine 250g', categoryId: 7, subcategoryId: 36, price: 240, description: 'Fortified with vitamins. The essential companion for Kenyan breakfast bread.', url: 'https://images.unsplash.com/photo-1628191010210-a59de33e5941?q=80&w=800&auto=format&fit=crop' },
  { name: 'Huggies Soft & Dry Size 3', categoryId: 7, subcategoryId: 37, price: 1450, description: 'Soft and breathable diapers with up to 12 hours of leakage protection.', url: 'https://images.unsplash.com/photo-1584905066893-7d5c142ba4ee?q=80&w=800&auto=format&fit=crop' },
  { name: 'Ketepa Pride Tea Bags (100s)', categoryId: 7, subcategoryId: 38, price: 350, description: '100% Kenyan tea. Rich flavor and aroma for the perfect cup of tea.', url: 'https://images.unsplash.com/photo-1544787210-2211d7c309c7?q=80&w=800&auto=format&fit=crop' },
  
  // Sports
  { name: 'Cast Iron Dumbbells 20kg Set', categoryId: 8, subcategoryId: 39, price: 8500, description: 'Adjustable weight set for home gym. Durable and reliable for strength training.', url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop' },
  { name: 'Butterfly Kerosene Stove', categoryId: 8, subcategoryId: 40, price: 1800, description: 'Classic camping stove. Portable and easy to use with kerosene fuel.', url: 'https://images.unsplash.com/photo-1496080174650-637e3f22fa03?q=80&w=800&auto=format&fit=crop' },
  { name: 'Harambee Stars Support Jersey', categoryId: 8, subcategoryId: 41, price: 2500, description: 'Official style replica jersey. Support Kenya\'s national football team.', url: 'https://images.unsplash.com/photo-1517466787929-bc90288809a7?q=80&w=800&auto=format&fit=crop' },
  { name: 'Raleigh 26 inch Mountain Bike', categoryId: 8, subcategoryId: 42, price: 15000, description: 'Standard mountain bike with front suspension. Ideal for Kenyan terrains.', url: 'https://images.unsplash.com/photo-1485965120184-e220ac18429e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Pro Swimming Goggles & Cap', categoryId: 8, subcategoryId: 43, price: 1600, description: 'Anti-fog goggles and silicone cap set. Reliable for training and leisure.', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=800&auto=format&fit=crop' },
  
  // Baby & Kids
  { name: 'African Cloth Doll (Handmade)', categoryId: 9, subcategoryId: 44, price: 950, description: 'Beautifully crafted soft doll wearing traditional Kitenge fabric.', url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800&auto=format&fit=crop' },
  { name: 'Fluffy Hooded Baby Romper', categoryId: 9, subcategoryId: 45, price: 1200, description: 'Warm and comfortable romper with hood. Perfect for cold Kenyan mornings.', url: 'https://images.unsplash.com/photo-1522778147829-047360bdc7f6?q=80&w=800&auto=format&fit=crop' },
  { name: 'Foldable Lightweight Stroller', categoryId: 9, subcategoryId: 46, price: 12500, description: 'Easy to fold and transport. Smooth wheels for urban pavements.', url: 'https://images.unsplash.com/photo-1591338600616-a28130fddec5?q=80&w=800&auto=format&fit=crop' },
  { name: 'Mahogany Finish Baby Cot', categoryId: 9, subcategoryId: 47, price: 18000, description: 'Traditional wooden cot with adjustable height. Locally manufactured.', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop' },
  { name: 'Kasuku Exercise Books (Doz)', categoryId: 9, subcategoryId: 48, price: 650, description: '12-pack of A5 exercise books. The essential school requirement in Kenya.', url: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=800&auto=format&fit=crop' }
];

const fastFoodData = [
  { name: 'Chips Mwitu Portion', price: 50, description: 'Classic roadside-style deep-fried potatoes. Hot and crispy.', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=800&auto=format&fit=crop' },
  { name: 'Beef Samosas (Pair)', price: 80, description: 'Crispy pastry filled with spiced minced beef. A Kenyan snack staple.', url: 'https://images.unsplash.com/photo-1601050638911-c3260aa7b5ff?q=80&w=800&auto=format&fit=crop' },
  { name: 'Spiced Potato Bhajias', price: 150, description: 'Potatoes dipped in spiced gram flour batter and deep-fried.', url: 'https://images.unsplash.com/photo-1606471191009-63994c53433b?q=80&w=800&auto=format&fit=crop' },
  { name: 'Smokie Pasua with Kachumbari', price: 60, description: 'Grilled smoked sausage split and filled with fresh tomato and onion salad.', url: 'https://images.unsplash.com/photo-1541214113241-21578d2d9b62?q=80&w=800&auto=format&fit=crop' },
  { name: 'Nyama Choma Platter (Half Kg)', price: 750, description: 'Succulent flame-grilled goat meat served with kachumbari.', url: 'https://images.unsplash.com/photo-1527324688151-0e627063f2b1?q=80&w=800&auto=format&fit=crop' },
  { name: 'Chips Mayai (Zege)', price: 180, description: 'Kenyan comfort food: Fries mixed with eggs and fried into an omelette.', url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=800&auto=format&fit=crop' },
  { name: 'Masala Chips', price: 250, description: 'Crispy fries tossed in a spicy, tangy tomato-based masala sauce.', url: 'https://images.unsplash.com/photo-1510693358055-6b5cf0bf4120?q=80&w=800&auto=format&fit=crop' },
  { name: 'Sweet Mandazi (3pcs)', price: 60, description: 'Light and airy Kenyan donuts. Perfect for breakfast or snack.', url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=800&auto=format&fit=crop' },
  { name: 'Rolled Chapatis (2pcs)', price: 100, description: 'Soft and layered Kenyan flatbread. Great on its own or with stew.', url: 'https://images.unsplash.com/photo-1589135398302-28a635848bb2?q=80&w=800&auto=format&fit=crop' },
  { name: 'Java Style Beef Burger', price: 850, description: 'Juicy 200g beef patty with lettuce, tomatoes, and home fries.', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop' }
];

async function seed() {
    const sellerId = 1;

    console.log('Cleaning up existing data for seller 1...');
    await Product.destroy({ where: { sellerId } });
    await FastFood.destroy({ where: { vendor: sellerId } });

    console.log('Seeding products...');
    for (const p of productData) {
        console.log(`Seeding Product: ${p.name}`);
        const coverImage = await getOptimizedImage(p.url);
        await Product.create({
            name: p.name,
            description: p.description,
            price: p.price,
            sellerId,
            categoryId: p.categoryId,
            subcategoryId: p.subcategoryId,
            coverImage,
            status: 'active',
            reviewStatus: 'approved',
            inventory: 100,
            stockQuantity: 100,
            isApproved: true,
            approved: true
        });
    }

    console.log('Seeding fast food...');
    for (const ff of fastFoodData) {
        console.log(`Seeding FastFood: ${ff.name}`);
        const filename = `${ff.name.replace(/\s+/g, '_').toLowerCase()}.webp`;
        const uploadPath = path.join(__dirname, '../public/uploads/other', filename);
        const dir = path.dirname(uploadPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const success = await getOptimizedImage(ff.url, uploadPath);
        if (success) {
            await FastFood.create({
                name: ff.name,
                category: 'Kenyan Cuisines',
                shortDescription: ff.description.substring(0, 100),
                description: ff.description,
                basePrice: ff.price,
                displayPrice: ff.price,
                vendor: sellerId,
                categoryId: 1, // Traditional category for Fast Food
                preparationTimeMinutes: 20,
                deliveryTimeEstimateMinutes: 40,
                mainImage: `/uploads/other/${filename}`,
                status: 'active',
                reviewStatus: 'approved',
                approved: true,
                isAvailable: true,
                deliveryFeeType: 'fixed'
            });
        }
    }

    console.log('Seeding complete.');
    process.exit(0);
}

seed();
