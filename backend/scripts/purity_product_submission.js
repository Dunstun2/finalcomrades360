const { User, Product, Category, Subcategory } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function submitPurityProduct() {
    console.log('🚀 Starting Purity Product Submission...');

    try {
        // 1. Find the seller
        const sellerEmail = 'purity@gmail.com';
        const seller = await User.findOne({ where: { email: sellerEmail } });

        if (!seller) {
            console.error(`❌ Error: User with email ${sellerEmail} not found!`);
            process.exit(1);
        }
        console.log(`✅ Found Seller: ${seller.name} (ID: ${seller.id})`);

        // 2. Find a valid category and subcategory
        // We'll look for an 'Electronics' or similar category if it exists, otherwise pick the first.
        const category = await Category.findOne({
            where: { parentId: null }
        });

        if (!category) {
            console.error('❌ Error: No top-level categories found in the database!');
            process.exit(1);
        }

        const subcategory = await Subcategory.findOne({
            where: { categoryId: category.id }
        });

        if (!subcategory) {
            console.error(`❌ Error: No subcategories found for category ${category.name}!`);
            process.exit(1);
        }
        console.log(`✅ Using Category: ${category.name} -> Subcategory: ${subcategory.name}`);

        // 3. Define the product data matching ComradesProductForm structure
        const productData = {
            name: 'Comrades Elite Wireless Headphones Gen 2',
            brand: 'ComradesAudio',
            model: 'Elite-X1',
            unitOfMeasure: 'unit-electronics',
            keywords: 'headphones, wireless, audio, bluetooth, elite',

            description: 'Professional grade wireless headphones with active noise cancellation.',
            shortDescription: 'Unmatched audio clarity and comfort.',
            fullDescription: 'Experience sound like never before with the Comrades Elite Wireless Headphones. Features include 40-hour battery life, active noise cancellation, and premium memory foam ear cushions.',

            basePrice: 249.99,
            displayPrice: 299.99, // Superadmin/Admin field usually, but we include it
            stock: 100,
            lowStockThreshold: 10,
            compareAtPrice: 349.99,
            cost: 120.00,

            categoryId: category.id,
            subcategoryId: subcategory.id,
            sellerId: seller.id,
            addedBy: seller.id,

            deliveryMethod: 'Pickup',
            deliveryFee: 0.00,
            deliveryCoverageZones: ['Nairobi', 'Mombasa', 'Kisumu'],

            warranty: '1 Year Manufacturer Warranty',
            returnPolicy: '7-day return policy for manufacturing defects.',
            weight: '0.5kg',
            dimensions: { length: 20, width: 15, height: 10 },

            keyFeatures: [
                'Active Noise Cancellation (ANC)',
                '40-Hour Battery Life',
                'Bluetooth 5.2 Connectivity',
                'Premium Memory Foam Cushions'
            ],

            specifications: {
                'Driver Size': '40mm',
                'Frequency Response': '20Hz - 20kHz',
                'Charging Port': 'USB-C',
                'Weight': '350g'
            },

            attributes: {
                condition: 'Brand New',
                isBestSeller: true,
                color: 'Midnight Black'
            },

            // Variants as stored in the JSON field (controller logic)
            variants: [
                {
                    name: 'Color',
                    type: 'color',
                    options: [
                        { value: 'Midnight Black', priceModifier: 0, inventory: 50, sku: 'C-ELITE-BLK' },
                        { value: 'Silver Frost', priceModifier: 20, inventory: 30, sku: 'C-ELITE-SLV' },
                        { value: 'Deep Navy', priceModifier: 0, inventory: 20, sku: 'C-ELITE-NVY' }
                    ]
                }
            ],

            logistics: {
                deliveryMethod: 'Pickup',
                deliveryFee: 0,
                warranty: '1 year'
            },

            // Submission details
            status: 'draft', // Standard for new seller products
            reviewStatus: 'pending', // This submits it for approval
            approved: false,
            isActive: true,
            visibilityStatus: 'visible',
            shareableLink: `product/${uuidv4()}`,

            // SEO
            metaTitle: 'Comrades Elite Wireless Headphones - Best in Class Audio',
            metaDescription: 'Shop the Comrades Elite Wireless Headphones. 40h battery, ANC, and ultimate comfort at Comrades360.',
            metaKeywords: 'headphones, wireless audio, noise cancellation'
        };

        // 4. Create the product
        const product = await Product.create(productData);

        console.log(`\n✨ Success! Product created with ID: ${product.id}`);
        console.log(`📧 Seller: ${sellerEmail}`);
        console.log(`📝 Status: ${product.status}`);
        console.log(`🔍 Review Status: ${product.reviewStatus}`);
        console.log(`🔗 Shareable Link: ${product.shareableLink}`);

    } catch (error) {
        console.error('\n❌ Critical Error during product submission:');
        console.error(error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

submitPurityProduct();
