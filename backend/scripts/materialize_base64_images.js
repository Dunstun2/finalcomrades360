const { Product, FastFood, ServiceImage, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function materializeImages() {
    console.log('--- Materializing Base64 Images ---');
    
    const stats = {
        products: 0,
        fastFood: 0,
        services: 0,
        errors: 0
    };

    const uploadDirs = {
        products: path.join(__dirname, '../uploads/products'),
        fastFood: path.join(__dirname, '../uploads/fastfood'),
        services: path.join(__dirname, '../uploads/services')
    };

    // Ensure directories exist
    Object.values(uploadDirs).forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const saveBase64 = (base64Str, dir) => {
        try {
            const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) return null;

            const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `materialized-${uuidv4()}.${extension}`;
            const filePath = path.join(dir, filename);
            
            fs.writeFileSync(filePath, buffer);
            
            // Return relative path for DB
            const relativeDir = path.basename(dir);
            return `uploads/${relativeDir}/${filename}`;
        } catch (e) {
            console.error('Error saving base64:', e.message);
            return null;
        }
    };

    try {
        // 1. Products
        const products = await Product.findAll({
            where: {
                coverImage: { [require('sequelize').Op.like]: 'data:image%' }
            }
        });
        console.log(`Processing ${products.length} products...`);
        for (const p of products) {
            const newPath = saveBase64(p.coverImage, uploadDirs.products);
            if (newPath) {
                await p.update({ coverImage: newPath });
                stats.products++;
            }
        }

        // 2. FastFood
        const foods = await FastFood.findAll({
            where: {
                mainImage: { [require('sequelize').Op.like]: 'data:image%' }
            }
        });
        console.log(`Processing ${foods.length} fast food items...`);
        for (const f of foods) {
            const newPath = saveBase64(f.mainImage, uploadDirs.fastFood);
            if (newPath) {
                await f.update({ mainImage: newPath });
                stats.fastFood++;
            }
        }

        // 3. ServiceImages
        const serviceImages = await ServiceImage.findAll({
            where: {
                imageUrl: { [require('sequelize').Op.like]: 'data:image%' }
            }
        });
        console.log(`Processing ${serviceImages.length} service images...`);
        for (const si of serviceImages) {
            const newPath = saveBase64(si.imageUrl, uploadDirs.services);
            if (newPath) {
                await si.update({ imageUrl: newPath });
                stats.services++;
            }
        }

        console.log('\n--- Materialization Summary ---');
        console.log(`Products updated: ${stats.products}`);
        console.log(`Fast Food updated: ${stats.fastFood}`);
        console.log(`Service Images updated: ${stats.services}`);
        console.log('--- Done ---');

    } catch (error) {
        console.error('Critical error during materialization:', error);
    }
}

materializeImages().then(() => process.exit(0));
