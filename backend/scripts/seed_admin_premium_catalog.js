const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Product, FastFood, User, Subcategory, Category } = require('../models');

async function getOptimizedBuffer(url) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        const buffer = Buffer.from(response.data);
        return await sharp(buffer)
            .resize(800)
            .webp({ quality: 80 })
            .toBuffer();
    } catch (e) {
        console.error(`Failed to process image ${url}: ${e.message}`);
        return null;
    }
}

const fastFoodData = [
    {
        name: 'Grilled Beef Mishkaki',
        description: 'Tender beef cubes marinated in traditional spices and grilled to perfection.',
        price: 450,
        urls: [
            'https://images.unsplash.com/photo-1594968973184-9140fa307769?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Fried Tilapia & Brown Ugali',
        description: 'Fresh Lake Victoria tilapia deep-fried and served with nutritious brown ugali and sukuma wiki.',
        price: 750,
        urls: [
            'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Chicken Tikka Platter',
        description: 'Flavorful bone-in chicken tikka served with garlic naan and fresh salad.',
        price: 650,
        urls: [
            'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Mutton Pilau Deluxe',
        description: 'Aromatic rice dish cooked in a potent mix of cloves, cardamom, and cinnamon with juicy mutton pieces.',
        price: 550,
        urls: [
            'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Kienyeji Chicken Stew',
        description: 'Organic free-range chicken slowly simmered in a rich tomato and onion gravy.',
        price: 850,
        urls: [
            'https://images.unsplash.com/photo-1547524513-596bac1195d4?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Sausage & Egg Combo',
        description: 'Classic breakfast or snack combo featuring two jumbo sausages and a fluffy egg.',
        price: 250,
        urls: [
            'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1550507992-eb63ffee0847?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Beef Burger with Avocado',
        description: 'Juicy 100% beef patty topped with fresh Kenyan avocado, cheese, and caramelized onions.',
        price: 600,
        urls: [
            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Strawberry Thick Shake',
        description: 'Creamy milkshake blended with fresh strawberries and premium vanilla ice cream.',
        price: 350,
        urls: [
            'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1626264323419-f03316938382?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Garlic Potato Wedges',
        description: 'Crispy oven-baked potato wedges seasoned with fresh garlic and rosemary.',
        price: 200,
        urls: [
            'https://images.unsplash.com/photo-1573082844439-0824fe11bb3b?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1623238914276-0852d899997e?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Mixed Fruit Salad',
        description: 'Refreshing bowl of seasonal Kenyan fruits: Watermelon, Pineapple, Banana, and Mango.',
        price: 150,
        urls: [
            'https://images.unsplash.com/photo-1519996529931-28324d5a630e?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=800&auto=format&fit=crop'
        ]
    }
];

const productData = [
    {
        name: 'HP Pavilion 15 (Core i7, 16GB)',
        description: 'Powerful performance laptop for students and professionals. Intel Core i7, 512GB SSD.',
        price: 85000,
        subcategoryId: 5, // Laptops & Computing
        urls: [
            'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Samsung Galaxy A54 5G',
        description: 'Vibrant 6.4-inch display, 50MP triple camera, and long-lasting battery.',
        price: 48000,
        subcategoryId: 4, // Smartphones & Tablets
        urls: [
            'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'JBL Pulse 5 LED Bluetooth Speaker',
        description: 'Eye-catching 360-degree light show that syncs to the beat of your music.',
        price: 18500,
        subcategoryId: 6, // Television & Audio
        urls: [
            'https://images.unsplash.com/photo-1589003077984-844a0d63f974?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1626264323419-f03316938382?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Sony WH-1000XM4 Noise Cancelling',
        description: 'Industry-leading noise cancellation technology with premium sound quality.',
        price: 32000,
        subcategoryId: 6, // Television & Audio
        urls: [
            'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Nike Air Max 270 Trainers',
        description: 'Iconic style with a big Air unit to give you a cushioned ride.',
        price: 12500,
        subcategoryId: 11, // Shoes & Footwear
        urls: [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Levi\'s 501 Original Fit Jeans',
        description: 'The blueprint for every pair of jeans in existence. Timeless and durable.',
        price: 6500,
        subcategoryId: 9, // Men's Clothing
        urls: [
            'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Vintage Leather Laptop Bag',
        description: 'Handcrafted genuine leather bag with multiple compartments for protection.',
        price: 8500,
        subcategoryId: 13, // Bags & Accessories
        urls: [
            'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Fossil Gen 6 Smartwatch',
        description: 'Classic Fossil design with updated tech: SpO2, Heart Rate, and Faster Charging.',
        price: 24500,
        subcategoryId: 12, // Watches & Jewelry
        urls: [
            'https://images.unsplash.com/photo-1508685096489-7aac29a45831?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Ramtons Front Load Washer (7kg)',
        description: 'Efficient and quiet washing machine with 15 programs for every fabric type.',
        price: 55000,
        subcategoryId: 7, // Kitchen Appliances
        urls: [
            'https://images.unsplash.com/photo-1582733775062-49c13b19defe?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Philips Air Fryer XL (6.2L)',
        description: 'Fry with up to 90% less fat. NutriU app for healthy everyday recipes.',
        price: 22000,
        subcategoryId: 7, // Kitchen Appliances
        urls: [
            'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1551218808-94e220e03ca9?q=80&w=800&auto=format&fit=crop' 
        ]
    },
    {
        name: 'Mika 3-Burner Gas Cooker',
        description: 'Full glass finish, auto-ignition, and heavy-duty pan support.',
        price: 18500,
        subcategoryId: 7, // Kitchen Appliances
        urls: [
            'https://images.unsplash.com/photo-1520699049698-acd2fccb8cc8?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Marble Top Coffee Table',
        description: 'Modern minimalist design with white marble top and gold-finished metal frame.',
        price: 32000,
        subcategoryId: 24, // Furniture
        urls: [
            'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Maybelline Fit Me Foundation',
        description: 'Matte and poreless foundation for normal to oily skin. Matches natural tone.',
        price: 1650,
        subcategoryId: 30, // Makeup & Cosmetics
        urls: [
            'https://images.unsplash.com/photo-1617228570114-1e5828de6841?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Nivea Radiant & Beauty Lotion',
        description: 'Specially formulated for melanin-rich skin with 5 natural oils and vitamins.',
        price: 950,
        subcategoryId: 29, // Skin Care
        urls: [
            'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Colgate Optic White (100ml)',
        description: 'Removes 5x more surface stains with micro-cleansing crystals.',
        price: 450,
        subcategoryId: 36, // Personal Care
        urls: [
            'https://images.unsplash.com/photo-1559594861-16322204bb3c?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1558236714-d112d7b876fc?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Indomie Chicken (Pack of 5)',
        description: 'Kenya\'s favorite instant noodles. Quick and easy student meal.',
        price: 260,
        subcategoryId: 38, // Breakfast & Snacks
        urls: [
            'https://images.unsplash.com/photo-1612927601601-6638404737ce?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Ariel Auto Washing Powder (1kg)',
        description: 'Tough on stains, fresh on clothes. Best for automatic machines.',
        price: 480,
        subcategoryId: 35, // Household Cleaning
        urls: [
            'https://images.unsplash.com/photo-1564419320461-6870880221ad?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Wilson Federer Pro Tennis Racket',
        description: 'Built for precision and control. Perfect for intermediate players.',
        price: 12000,
        subcategoryId: 41, // Team Sports Gear
        urls: [
            'https://images.unsplash.com/photo-1617083275225-6458bc442f38?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1622279457486-62dcc4a4bd13?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Pampers Baby-Dry Size 4 (60 pcs)',
        description: 'Up to 12 hours of overnight dryness. Double leak-guard barriers.',
        price: 2350,
        subcategoryId: 37, // Baby Supplies
        urls: [
            'https://images.unsplash.com/photo-1590642916589-592bca10dfbf?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1544126592-807daf21565c?q=80&w=800&auto=format&fit=crop'
        ]
    },
    {
        name: 'Fisher-Price Learning Table',
        description: 'Encourage early development with music, lights, and hands-on activities.',
        price: 7500,
        subcategoryId: 44, // Kids' Toys
        urls: [
            'https://images.unsplash.com/photo-1545558014-8692077e9b5c?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1533512900330-acd9ae8182b8?q=80&w=800&auto=format&fit=crop'
        ]
    }
];

async function seed() {
    try {
        const targetEmails = ['dunstunw@gmail.com', 'dunstunwambutsi20@gmail.com'];
        let accountIndex = 0;
        
        for (const email of targetEmails) {
            const user = await User.findOne({ where: { email } });
            if (!user) {
                console.warn(`User ${email} not found, skipping.`);
                continue;
            }

            console.log(`\n--- Starting premium seed for ${email} (User ID: ${user.id}) ---`);

            // Clean existing items first (from previous seeds)
            await Product.destroy({ where: { sellerId: user.id } });
            await FastFood.destroy({ where: { vendor: user.id } });

            // Seed Fast Food
            console.log('Seeding Fast Food (10 items)...');
            for (const ff of fastFoodData) {
                // Prefix name for subsequent accounts to avoid uniqueness errors within 32 chars
                const ffName = accountIndex > 0 ? `V2 ${ff.name}` : ff.name;
                console.log(`Processing ${ffName} for ${email}...`);
                const images = [];
                for (let i = 0; i < ff.urls.length; i++) {
                    const buffer = await getOptimizedBuffer(ff.urls[i]);
                    if (buffer) {
                        const filename = `${ff.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}_${Date.now()}.webp`;
                        const uploadPath = path.join(__dirname, '../uploads/fastfood', filename);
                        
                        if (!fs.existsSync(path.dirname(uploadPath))) {
                            fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
                        }
                        
                        fs.writeFileSync(uploadPath, buffer);
                        images.push(`/uploads/fastfood/${filename}`);
                    }
                }

                if (images.length > 0) {
                    await FastFood.create({
                        name: ffName,
                        category: 'Kenyan Cuisines',
                        shortDescription: ff.description.substring(0, 100),
                        description: ff.description,
                        basePrice: ff.price,
                        displayPrice: ff.price,
                        vendor: user.id,
                        categoryId: 1, 
                        preparationTimeMinutes: 20,
                        deliveryTimeEstimateMinutes: 40,
                        mainImage: images[0],
                        galleryImages: images.slice(1),
                        status: 'active',
                        reviewStatus: 'approved',
                        approved: true,
                        hasBeenApproved: true,
                        isAvailable: true,
                        isActive: true,
                        deliveryFeeType: 'fixed',
                        deliveryFee: 50,
                        kitchenVendor: "Admin Premium Kitchen",
                        vendorLocation: "Student Center Plaza, Wing B",
                        vendorLat: -1.2921,
                        vendorLng: 36.8219,
                        availabilityDays: [
                            { day: 'All Days', available: true, from: '08:00', to: '21:00' }
                        ]
                    });
                }
            }

            // Seed Products
            console.log('Seeding Products (20 items)...');
            for (const p of productData) {
                // Prefix name for subsequent accounts (Product has global uniqueness hook)
                const productName = accountIndex > 0 ? `V2 ${p.name}` : p.name;
                console.log(`Processing ${productName} for ${email}...`);
                const images = [];
                for (let i = 0; i < p.urls.length; i++) {
                    const buffer = await getOptimizedBuffer(p.urls[i]);
                    if (buffer) {
                        const filename = `${p.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}_${Date.now()}.webp`;
                        const uploadPath = path.join(__dirname, '../uploads/products', filename);
                        
                        if (!fs.existsSync(path.dirname(uploadPath))) {
                            fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
                        }
                        
                        fs.writeFileSync(uploadPath, buffer);
                        images.push(`/uploads/products/${filename}`);
                    }
                }

                if (images.length > 0) {
                    const subcat = await Subcategory.findByPk(p.subcategoryId);
                    if (!subcat) {
                        console.warn(`Subcategory ${p.subcategoryId} not found for ${p.name}, skipping.`);
                        continue;
                    }

                    await Product.create({
                        name: productName,
                        shortDescription: p.description.substring(0, 100),
                        description: p.description,
                        basePrice: p.price,
                        displayPrice: p.price,
                        sellerId: user.id,
                        subcategoryId: p.subcategoryId,
                        categoryId: subcat.categoryId,
                        coverImage: images[0],
                        galleryImages: images.slice(1),
                        status: 'active',
                        reviewStatus: 'approved',
                        approved: true,
                        hasBeenApproved: true,
                        isActive: true,
                        visibilityStatus: 'visible',
                        stock: 50,
                        condition: 'New',
                        deliveryMethod: 'Student Center Pickup',
                        deliveryFeeType: 'fixed',
                        deliveryFee: 100
                    });
                }
            }
            accountIndex++;
        }

        console.log('\n✅ Premium seeding complete for all target accounts.');
        process.exit(0);
    } catch (error) {
        console.error('Premium seeding failed:', error);
        process.exit(1);
    }
}

seed();
