const { Product, FastFood, User, Category, Subcategory } = require('../models');

async function seed() {
    try {
        const sellerEmail = 'dunstunwambutsi20@gmail.com';
        const user = await User.findOne({ where: { email: sellerEmail } });

        if (!user) {
            console.error(`User with email ${sellerEmail} not found.`);
            process.exit(1);
        }

        const sellerId = user.id;
        console.log(`Found seller: ${user.businessName || user.name} (ID: ${sellerId})`);

        // 1. Seed 4 Products
        const products = [
            {
                name: 'PowerBank 20000mAh',
                shortDescription: 'High capacity portable charger with dual USB ports.',
                fullDescription: 'Stay powered up on the go with this 20,000mAh PowerBank. Featuring high-speed charging and dual output, it can charge two devices simultaneously. Compact and durable design for everyday use.',
                basePrice: 2500,
                stock: 50,
                categoryId: 1, // Electronics & Appliances
                unitOfMeasure: 'pcs',
                deliveryMethod: 'Pickup',
                keywords: 'powerbank, charger, portable, electronics',
                sellerId,
                status: 'draft',
                reviewStatus: 'pending',
                approved: false
            },
            {
                name: 'Wireless Earbuds Pro',
                shortDescription: 'Crystal clear sound with active noise cancellation.',
                fullDescription: 'Experience premium sound quality with our Wireless Earbuds Pro. Features include active noise cancellation, touch controls, and up to 24 hours of battery life with the charging case.',
                basePrice: 4500,
                stock: 30,
                categoryId: 1, // Electronics & Appliances
                unitOfMeasure: 'pcs',
                deliveryMethod: 'Pickup',
                keywords: 'earbuds, wireless, audio, bluetooth',
                sellerId,
                status: 'draft',
                reviewStatus: 'pending',
                approved: false
            },
            {
                name: 'Gaming Mouse RGB',
                shortDescription: 'Precision gaming mouse with customizable RGB lighting.',
                fullDescription: 'Enhance your gaming setup with this high-precision RGB gaming mouse. Adjustable DPI settings and ergonomic design for long gaming sessions. Customizable lighting to match your style.',
                basePrice: 1500,
                stock: 40,
                categoryId: 1, // Electronics & Appliances
                unitOfMeasure: 'pcs',
                deliveryMethod: 'Pickup',
                keywords: 'mouse, gaming, rgb, accessories',
                sellerId,
                status: 'draft',
                reviewStatus: 'pending',
                approved: false
            },
            {
                name: 'Portable Bluetooth Speaker',
                shortDescription: 'Waterproof speaker with deep bass and 12-hour playtime.',
                fullDescription: 'Take your music anywhere with this rugged, waterproof Bluetooth speaker. Delivers impressive sound with deep bass and stays powered for up to 12 hours. Perfect for outdoor adventures.',
                basePrice: 3200,
                stock: 25,
                categoryId: 1, // Electronics & Appliances
                unitOfMeasure: 'pcs',
                deliveryMethod: 'Pickup',
                keywords: 'speaker, bluetooth, portable, audio',
                sellerId,
                status: 'draft',
                reviewStatus: 'pending',
                approved: false
            }
        ];

        for (const p of products) {
            const [product, created] = await Product.findOrCreate({
                where: { name: p.name, sellerId },
                defaults: p
            });
            if (created) {
                console.log(`Product created: ${p.name}`);
            } else {
                console.log(`Product already exists: ${p.name}`);
            }
        }

        // 2. Seed 5 FastFood items
        const fastFoods = [
            {
                name: 'Cheeseburger Deluxe',
                category: 'Burgers',
                categoryId: 3, // Food & Drinks
                subcategoryId: 14, // Fast Food & Meals
                shortDescription: 'Juicy beef patty with melted cheese, lettuce, and tomato.',
                description: 'Our signature cheeseburger featuring a perfectly grilled beef patty, premium melted cheese, fresh garden vegetables, and our special house sauce on a toasted brioche bun.',
                basePrice: 450,
                preparationTimeMinutes: 15,
                deliveryTimeEstimateMinutes: 30,
                vendor: sellerId,
                status: 'pending',
                reviewStatus: 'pending',
                approved: false,
                isAvailable: true
            },
            {
                name: 'Spicy Chicken Wings (6pcs)',
                category: 'Wings',
                categoryId: 3,
                subcategoryId: 14,
                shortDescription: 'Crispy chicken wings tossed in fiery hot buffalo sauce.',
                description: 'Six jumbo chicken wings, breaded and fried to perfection, then tossed in our signature spicy buffalo sauce. Served with a side of cooling ranch dressing.',
                basePrice: 600,
                preparationTimeMinutes: 20,
                deliveryTimeEstimateMinutes: 35,
                vendor: sellerId,
                status: 'pending',
                reviewStatus: 'pending',
                approved: false,
                isAvailable: true
            },
            {
                name: 'Pepperoni Pizza Medium',
                category: 'Pizza',
                categoryId: 3,
                subcategoryId: 14,
                shortDescription: 'Classic Italian pizza topped with spicy pepperoni and mozzarella.',
                description: 'Our Medium 12-inch pizza features a hand-tossed crust, rich tomato sauce, premium mozzarella cheese, and generous layers of authentic spicy pepperoni.',
                basePrice: 950,
                preparationTimeMinutes: 25,
                deliveryTimeEstimateMinutes: 45,
                vendor: sellerId,
                status: 'pending',
                reviewStatus: 'pending',
                approved: false,
                isAvailable: true
            },
            {
                name: 'Loaded Fries with Bacon',
                category: 'Sides',
                categoryId: 3,
                subcategoryId: 14,
                shortDescription: 'Crispy fries topped with melted cheese sauce and crispy bacon bits.',
                description: 'A large portion of our golden crispy fries, smothered in warm cheddar cheese sauce and topped with crunchy smoked bacon bits and fresh chives.',
                basePrice: 350,
                preparationTimeMinutes: 10,
                deliveryTimeEstimateMinutes: 25,
                vendor: sellerId,
                status: 'pending',
                reviewStatus: 'pending',
                approved: false,
                isAvailable: true
            },
            {
                name: 'Chocolate Milkshake',
                category: 'Shakes',
                categoryId: 3,
                subcategoryId: 14,
                shortDescription: 'Thick and creamy milkshake made with real Belgian chocolate.',
                description: 'Indulge in our decadent chocolate milkshake, blended with premium vanilla ice cream, whole milk, and rich Belgian chocolate syrup. Topped with whipped cream.',
                basePrice: 300,
                preparationTimeMinutes: 5,
                deliveryTimeEstimateMinutes: 20,
                vendor: sellerId,
                status: 'pending',
                reviewStatus: 'pending',
                approved: false,
                isAvailable: true
            }
        ];

        for (const f of fastFoods) {
            const [fastFood, created] = await FastFood.findOrCreate({
                where: { name: f.name, vendor: sellerId },
                defaults: f
            });
            if (created) {
                console.log(`FastFood created: ${f.name}`);
            } else {
                console.log(`FastFood already exists: ${f.name}`);
            }
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

seed();
