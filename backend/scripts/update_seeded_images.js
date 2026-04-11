const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Product, FastFood, User } = require('../models');

const imageMapping = [
    {
        name: 'Spicy Chicken Wings (6pcs)',
        type: 'fastfood',
        url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?q=80&w=800&auto=format&fit=crop'
    },
    {
        name: 'Loaded Fries with Bacon',
        type: 'fastfood',
        url: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?q=80&w=800&auto=format&fit=crop'
    },
    {
        name: 'Chocolate Milkshake',
        type: 'fastfood',
        url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=800&auto=format&fit=crop'
    }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateImages() {
    const sellerEmail = 'dunstunwambutsi20@gmail.com';
    const user = await User.findOne({ where: { email: sellerEmail } });
    if (!user) {
        console.error('Seller not found');
        process.exit(1);
    }
    const sellerId = user.id;

    for (const item of imageMapping) {
        try {
            console.log(`Processing ${item.name}...`);
            await sleep(2000); // 2 second delay
            let buffer;

            if (item.localPath) {
                if (fs.existsSync(item.localPath)) {
                    buffer = fs.readFileSync(item.localPath);
                } else {
                    console.error(`Local path not found for ${item.name}: ${item.localPath}`);
                    continue;
                }
            } else if (item.url) {
                const response = await axios({
                    url: item.url,
                    method: 'GET',
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                buffer = Buffer.from(response.data);
            }
            const optimizedBuffer = await sharp(buffer)
                .resize(800) // Moderate resize for web
                .webp({ quality: 80 })
                .toBuffer();

            if (item.type === 'product') {
                const base64 = `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;
                await Product.update(
                    { coverImage: base64 },
                    { where: { name: item.name, sellerId } }
                );
                console.log(`Updated product: ${item.name}`);
            } else {
                const filename = `${item.name.replace(/\s+/g, '_').toLowerCase()}.webp`;
                const uploadPath = path.join(__dirname, '../public/uploads/other', filename);
                
                // Ensure directory exists
                const dir = path.dirname(uploadPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(uploadPath, optimizedBuffer);
                const dbPath = `/uploads/other/${filename}`;
                
                await FastFood.update(
                    { mainImage: dbPath },
                    { where: { name: item.name, vendor: sellerId } }
                );
                console.log(`Updated fastfood: ${item.name}`);
            }
        } catch (error) {
            console.error(`Failed to update ${item.name}:`, error.message);
        }
    }

    console.log('Image updates completed.');
    process.exit(0);
}

updateImages();
