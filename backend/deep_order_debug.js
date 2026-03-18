const fs = require('fs');
const { OrderItem, Product, FastFood } = require('./models');

async function debug() {
    const stream = fs.createWriteStream('order_debug_dump.txt');
    try {
        const items = await OrderItem.findAll({
            include: [
                { model: Product, required: false },
                { model: FastFood, required: false }
            ],
            limit: 50
        });

        stream.write(`Found ${items.length} OrderItems\n\n`);

        items.forEach(it => {
            stream.write(`OrderItem ID: ${it.id}, ProdID: ${it.productId}, FoodID: ${it.fastFoodId}, Type: ${it.itemType}\n`);
            if (it.Product) {
                stream.write(`  Product: ${it.Product.name}\n`);
                stream.write(`  Cover: ${String(it.Product.coverImage).substring(0, 50)}...\n`);
            } else if (it.productId) {
                stream.write(`  !!! Product ID ${it.productId} PRESENT but Association NULL\n`);
            }

            if (it.FastFood) {
                stream.write(`  FastFood: ${it.FastFood.name}\n`);
                stream.write(`  Image: ${it.FastFood.mainImage}\n`);
            }
            stream.write(`---\n`);
        });

    } catch (error) {
        stream.write('ERROR: ' + error.message + '\n');
        console.error(error);
    } finally {
        stream.end();
        process.exit();
    }
}

debug();
