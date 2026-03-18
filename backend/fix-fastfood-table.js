const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

async function addStatusColumn() {
    try {
        console.log('Adding status column to FastFoods...');
        await sequelize.query("ALTER TABLE FastFoods ADD COLUMN status TEXT DEFAULT 'pending';");
        console.log('Column added successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error adding column:', error.message);
        if (error.message.includes('duplicate column name')) {
            console.log('Column already exists.');
            process.exit(0);
        }
        process.exit(1);
    }
}

addStatusColumn();
