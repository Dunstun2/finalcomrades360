const fs = require('fs');
const { OrderItem, Product, FastFood } = require('./models');

async function debug() {
    let output = '';
    try {
        const items = await OrderItem.findAll({
            include: [
                { model: Product, required: false },
                { model: FastFood, required: false }
            ],
            limit: 100,
            order: [['id', 'DESC']]
        });

        output += `Found ${items.length} OrderItems\n\n`;

        items.forEach(it => {
            output += `OrderItem ID: ${it.id}, ProdID: ${it.productId}, FoodID: ${it.fastFoodId}, Type: ${it.itemType}\n`;
            if (it.Product) {
                output += `  Product: ${it.Product.name}\n`;
                output += `  Cover: ${String(it.Product.coverImage || 'NULL').substring(0, 100)}...\n`;
            } else if (it.productId) {
                output += `  !!! Product ID ${it.productId} PRESENT but Association NULL\n`;
            }

            if (it.FastFood) {
                output += `  FastFood: ${it.FastFood.name}\n`;
                output += `  Image: ${it.FastFood.mainImage}\n`;
            }
            output += `---\n`;
        });

    } catch (error) {
        output += 'ERROR: ' + error.message + '\n';
        console.error(error);
    } finally {
        fs.writeFileSync('order_debug_dump_v2.txt', output);
        process.exit();
    }
}

debug();
