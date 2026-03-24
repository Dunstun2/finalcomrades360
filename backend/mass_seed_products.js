const { Product, User, Category, Subcategory, sequelize, Op } = require('./models');

const ADMIN_EMAIL = 'dunstunw@gmail.com';

// REAL WORLD PRODUCT DATA MAP
const REAL_PRODUCTS = {
  // Electronics & Appliances (ID: 1)
  1: [ // Phones
    { name: 'iPhone 15 Pro Max', brand: 'Apple', model: '15 Pro Max', img: 'https://images.unsplash.com/photo-1695424391699-ce12be3895e6?q=80&w=800' },
    { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', model: 'S24 Ultra', img: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800' },
    { name: 'Google Pixel 8 Pro', brand: 'Google', model: 'Pixel 8 Pro', img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=800' }
  ],
  2: [ // Computer
    { name: 'MacBook Pro 14" M3', brand: 'Apple', model: 'M3', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800' },
    { name: 'Dell XPS 15 Laptop', brand: 'Dell', model: 'XPS 15', img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800' },
    { name: 'HP Spectre x360 2-in-1', brand: 'HP', model: 'Spectre', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800' }
  ],
  4: [ // Smartphones & Tablets
    { name: 'iPad Pro 12.9" (M2) 512GB', brand: 'Apple', model: 'iPad Pro', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800' },
    { name: 'Galaxy Tab S9 Ultra', brand: 'Samsung', model: 'Tab S9', img: 'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?q=80&w=800' },
    { name: 'Surface Pro 9 Sapphire', brand: 'Microsoft', model: 'Surface 9', img: 'https://images.unsplash.com/photo-1585915907409-e85df649f7fe?q=80&w=800' }
  ],
  5: [ // Laptops & Computing
    { name: 'ThinkPad X1 Carbon Gen 11', brand: 'Lenovo', model: 'X1', img: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800' },
    { name: 'ASUS ROG Zephyrus G14', brand: 'ASUS', model: 'G14', img: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=800' },
    { name: 'Razer Blade 16 QHD+', brand: 'Razer', model: 'Blade 16', img: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=800' }
  ],
  6: [ // Television & Audio
    { name: 'Sony WH-1000XM5 Headphones', brand: 'Sony', model: 'XM5', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800' },
    { name: 'LG C3 65" OLED 4K TV', brand: 'LG', model: 'C3', img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=800' },
    { name: 'Marshall Stanmore III Speaker', brand: 'Marshall', model: 'S3', img: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=800' }
  ],
  7: [ // Kitchen Appliances
    { name: 'KitchenAid Artisan Series Stand Mixer', brand: 'KitchenAid', model: 'Artisan', img: 'https://images.unsplash.com/photo-1591150933405-2b4618e4e94f?q=80&w=800' },
    { name: 'Ninja Foodi 6rd Air Fryer', brand: 'Ninja', model: 'Foodi', img: 'https://images.unsplash.com/photo-1626078299034-7347963ec746?q=80&w=800' },
    { name: 'Nespresso Vertuo Next Coffee Machine', brand: 'Nespresso', model: 'Vertuo Next', img: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?q=80&w=800' }
  ],
  8: [ // Smart Home & Security
    { name: 'Ring Video Doorbell Pro 2', brand: 'Ring', model: 'Doorbell Pro 2', img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800' },
    { name: 'Philips Hue White & Color Ambiance', brand: 'Philips', model: 'Hue', img: 'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?q=80&w=800' },
    { name: 'Google Nest Learning Thermostat', brand: 'Google', model: 'Nest', img: 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?q=80&w=800' }
  ],

  // Fashion & Design (ID: 2)
  9: [ // Men's Clothing
    { name: 'Polo Ralph Lauren Mesh Shirt', brand: 'Ralph Lauren', model: 'Polo', img: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800' },
    { name: 'Levi\'s 501 Original Fit Jeans', brand: 'Levi\'s', model: '501', img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800' },
    { name: 'North Face McMurdo Parka', brand: 'The North Face', model: 'McMurdo', img: 'https://images.unsplash.com/photo-1544923246-77307dd654ca?q=80&w=800' }
  ],
  10: [ // Women's Clothing
    { name: 'Zara Floral Print Midi Dress', brand: 'Zara', model: 'Midi Dress', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800' },
    { name: 'Lululemon Align High-Rise Pant', brand: 'Lululemon', model: 'Align', img: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=800' },
    { name: 'H&M Oversized Cashmere Sweater', brand: 'H&M', model: 'Sweater', img: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=800' }
  ],
  11: [ // Shoes & Footwear
    { name: 'Nike Air Jordan 1 Retro High OG', brand: 'Nike', model: 'Air Jordan 1', img: 'https://images.unsplash.com/photo-1584735175315-9d5821762224?q=80&w=800' },
    { name: 'Adidas Ultraboost Light Running Shoes', brand: 'Adidas', model: 'Ultraboost', img: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?q=80&w=800' },
    { name: 'Dr. Martens 1460 Smooth Leather Boots', brand: 'Dr. Martens', model: '1460', img: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800' }
  ],
  12: [ // Watches & Jewelry
    { name: 'Rolex Submariner Date 41mm', brand: 'Rolex', model: 'Submariner', img: 'https://images.unsplash.com/photo-1547996160-81dfa63595dd?q=80&w=800' },
    { name: 'Casio G-Shock GA-2100-1A1ER', brand: 'Casio', model: 'G-Shock', img: 'https://images.unsplash.com/photo-1524338198835-90b5ac0e2c83?q=80&w=800' },
    { name: 'Tiffany & Co. Smile Pendant', brand: 'Tiffany', model: 'Smile', img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800' }
  ],
  13: [ // Bags & Accessories
    { name: 'Ray-Ban Wayfarer Classic', brand: 'Ray-Ban', model: 'Wayfarer', img: 'https://images.unsplash.com/photo-1511499767390-903390e6fbc4?q=80&w=800' },
    { name: 'Herschel Little America Backpack', brand: 'Herschel', model: 'Little America', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800' },
    { name: 'Gucci Marmont Small Shoulder Bag', brand: 'Gucci', model: 'Marmont', img: 'https://images.unsplash.com/photo-1566150905458-1bf1fd36d76f?q=80&w=800' }
  ],

  // Home & Living (ID: 5)
  24: [ // Furniture
    { name: 'IKEA EKTORP 3-seat Sofa', brand: 'IKEA', model: 'EKTORP', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800' },
    { name: 'Herman Miller Aeron Chair', brand: 'Herman Miller', model: 'Aeron', img: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=800' },
    { name: 'West Elm Century Bed Frame', brand: 'West Elm', model: 'Century', img: 'https://images.unsplash.com/photo-1505693419173-42b9258a6347?q=80&w=800' }
  ],

  // Health & Beauty (ID: 6)
  29: [ // Skin Care
    { name: 'La Roche-Posay Effaclar Duo+', brand: 'La Roche-Posay', model: 'Effaclar', img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=800' },
    { name: 'Ordinary Hyaluronic Acid 2%', brand: 'The Ordinary', model: 'Hyaluronic', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800' },
    { name: 'CeraVe Hydrating Cleanser', brand: 'CeraVe', model: 'Cleanser', img: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=800' }
  ],
  31: [ // Fragrances
    { name: 'Chanel No. 5 Parfum', brand: 'Chanel', model: 'No. 5', img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800' },
    { name: 'Dior Sauvage Toilette', brand: 'Dior', model: 'Sauvage', img: 'https://images.unsplash.com/photo-1594035910387-fea47734261f?q=80&w=800' },
    { name: 'YSL Black Opium', brand: 'YSL', model: 'Black Opium', img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=800' }
  ],

  // Sports & Fitness (ID: 8)
  39: [ // Gym Equipment
    { name: 'Bowflex SelectTech Dumbbells', brand: 'Bowflex', model: 'Dumbbells', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800' },
    { name: 'Peloton Bike+ Ultimate', brand: 'Peloton', model: 'Bike+', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800' },
    { name: 'Manduka PRO Yoga Mat', brand: 'Manduka', model: 'PRO', img: 'https://images.unsplash.com/photo-1592432676556-3bc63636573c?q=80&w=800' }
  ],
  
  // Baby & Kids (ID: 9)
  44: [ // Kids' Toys
    { name: 'LEGO Star Wars Millennium Falcon', brand: 'LEGO', model: 'Falcon', img: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?q=80&w=800' },
    { name: 'Barbie Dreamhouse Playset', brand: 'Barbie', model: 'Dreamhouse', img: 'https://images.unsplash.com/photo-1536640712247-c05afa5b2fa0?q=80&w=800' },
    { name: 'Fisher-Price Rock-a-Stack', brand: 'Fisher-Price', model: 'Rock', img: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?q=80&w=800' }
  ],
  48: [ // School Supplies
    { name: 'Moleskine Classic Notebook', brand: 'Moleskine', model: 'Classic', img: 'https://images.unsplash.com/photo-1534131707746-25d604851a1f?q=80&w=800' },
    { name: 'Parker Jotter Ballpoint Pen', brand: 'Parker', model: 'Jotter', img: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=800' },
    { name: 'JanSport SuperBreak Backpack', brand: 'JanSport', model: 'SuperBreak', img: 'https://images.unsplash.com/photo-1546750248-3605bc91a423?q=80&w=800' }
  ]
};

const DEFAULT_PRODUCTS = [
  { name: 'Premium Generic Item A', brand: 'Generic', model: 'G1', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800' },
  { name: 'Elite Generic Item B', brand: 'Elite', model: 'E2', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800' },
  { name: 'Vortex Generic Item C', brand: 'Vortex', model: 'V3', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800' }
];

async function massSeed() {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const user = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (!user) {
      console.error(`Admin user with email ${ADMIN_EMAIL} not found.`);
      process.exit(1);
    }

    console.log(`Cleaning up existing products for admin ${ADMIN_EMAIL}...`);
    await Product.destroy({ where: { sellerId: user.id }, transaction });

    const categories = await Category.findAll({
      where: { 
        parentId: null,
        id: { [Op.notIn]: [3, 4] }
      },
      include: [{ model: Subcategory, as: 'Subcategory' }],
      transaction
    });

    console.log(`Found ${categories.length} categories to seed.`);

    let count = 0;
    for (const cat of categories) {
      const subcats = cat.Subcategory || [];
      console.log(`Seeding category: ${cat.name}`);

      for (const sub of subcats) {
        const pool = REAL_PRODUCTS[sub.id] || DEFAULT_PRODUCTS;
        
        for (let i = 0; i < pool.length; i++) {
          const item = pool[i];
          const basePrice = Math.floor(Math.random() * 5000) + 1000;
          const displayPrice = basePrice + Math.floor(Math.random() * 2000) + 500;
          const discountPercentage = Math.floor(Math.random() * 30) + 10;
          const discountPrice = Math.round(displayPrice * (1 - discountPercentage / 100));
          
          const sku = `SKU-${cat.id}-${sub.id}-${i}-${Math.floor(Math.random() * 1000)}`;
          const barcode = `${cat.id}${sub.id}${i}${Math.floor(Math.random() * 100000000)}`.substring(0, 12).padStart(12, '0');

          await Product.create({
            name: item.name,
            brand: item.brand,
            model: item.model,
            condition: 'Brand New',
            shortDescription: `Authentic ${item.name}. High performance and premium quality from ${item.brand}.`,
            fullDescription: `The ${item.name} is a top-tier choice for professionals and enthusiasts alike. \n\nKey Highlights:\n- Official ${item.brand} product\n- Exceptional build quality\n- Industry-leading ${item.model} technology\n- Worldwide warranty included.`,
            unitOfMeasure: 'pcs',
            categoryId: cat.id,
            subcategoryId: sub.id,
            basePrice,
            displayPrice,
            discountPercentage,
            discountPrice,
            stock: 100,
            lowStockThreshold: 10,
            sku,
            barcode,
            coverImage: item.img,
            galleryImages: [item.img, item.img],
            images: [item.img, item.img, item.img],
            keyFeatures: ['Official Brand Warranty', 'Premium Materials', 'High-Speed Performance', 'Innovative Technology'],
            specifications: { 
              'Brand': item.brand,
              'Model': item.model,
              'Release Year': '2024',
              'Quality': 'Premium Grade'
            },
            attributes: { 
              'Color': 'Professional Black',
              'Finish': 'Matte',
              'Quality': 'A++'
            },
            deliveryMethod: 'Standard Shipping',
            deliveryFee: 150,
            deliveryFeeType: 'flat',
            deliveryCoverageZones: ['All Major Cities'],
            warranty: '2 Years Manufacturer Warranty',
            returnPolicy: '30 Days Hassle-Free Returns',
            weight: '1.2kg',
            length: '25cm',
            width: '18cm',
            height: '8cm',
            keywords: `${cat.name}, ${sub.name}, ${item.brand}, ${item.model}, authentic`,
            metaTitle: `${item.name} - Official Global Store`,
            metaDescription: `Buy authentic ${item.name} online. Best price, fast shipping, and official ${item.brand} warranty.`,
            metaKeywords: `${item.brand}, ${item.name}, shopping`,
            marketingEnabled: true,
            marketingCommissionType: 'percentage',
            marketingCommission: 10,
            marketingCommissionPercentage: 10,
            isFlashSale: i === 0,
            flashSalePrice: i === 0 ? Math.round(discountPrice * 0.85) : null,
            flashSaleStart: i === 0 ? new Date() : null,
            flashSaleEnd: i === 0 ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
            sellerId: user.id,
            addedBy: user.id,
            status: 'active',
            approved: true,
            reviewStatus: 'approved',
            isActive: true,
            visibilityStatus: 'visible',
            hasBeenApproved: true,
            featured: i === 0,
            isBestSeller: i === 1,
            isDigital: false,
            tags: {
              keyFeatures: ['Official Brand Warranty', 'Premium Materials'],
              specifications: { 'Brand': item.brand, 'Model': item.model },
              attributes: { 'Status': 'Brand New' }
            }
          }, { transaction });
          count++;
        }
      }
    }

    await transaction.commit();
    console.log(`Mass seeding completed successfully! Created ${count} real-world products.`);
    process.exit(0);
  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error('Mass seeding failed:', err);
    process.exit(1);
  }
}

try {
  massSeed().catch(err => {
    console.error('Unhandled error in massSeed:', err);
    process.exit(1);
  });
} catch (e) {
  console.error('Fatal initialization error:', e);
  process.exit(1);
}
