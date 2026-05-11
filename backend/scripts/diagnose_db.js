const { sequelize } = require('./backend/database/database');
const models = require('./backend/models');

async function checkSchemaDiscrepancies() {
    console.log('🔍 Starting Database Schema Diagnostic...');
    
    const tablesToCheck = [
        { model: 'Order', name: 'Order' },
        { model: 'OrderItem', name: 'OrderItem' },
        { model: 'Product', name: 'Product' },
        { model: 'FastFood', name: 'FastFoods' }, // Corrected name
        { model: 'User', name: 'User' },
        { model: 'Cart', name: 'Cart' },
        { model: 'CartItem', name: 'CartItem' },
        { model: 'Commission', name: 'Commission' },
        { model: 'Transaction', name: 'Transaction' }
    ];

    const results = [];

    for (const table of tablesToCheck) {
        try {
            console.log(`\nChecking table: ${table.name}...`);
            const tableInfo = await sequelize.getQueryInterface().describeTable(table.name);
            const modelFields = models[table.model].rawAttributes;
            
            const missingInDb = [];
            const typeMismatches = [];

            for (const fieldName in modelFields) {
                const field = modelFields[fieldName];
                const dbField = tableInfo[fieldName];

                if (!dbField) {
                    missingInDb.push(fieldName);
                }
            }

            results.push({
                table: table.name,
                status: missingInDb.length === 0 ? '✅ OK' : '❌ MISSING COLUMNS',
                missing: missingInDb
            });

            if (missingInDb.length > 0) {
                console.log(`   ❌ Missing in DB: ${missingInDb.join(', ')}`);
            } else {
                console.log('   ✅ All model columns present in DB.');
            }

        } catch (err) {
            console.error(`   💥 Error checking table ${table.name}:`, err.message);
            results.push({
                table: table.name,
                status: '💥 CRASHED',
                error: err.message
            });
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('DIAGNOSTIC SUMMARY');
    console.log('='.repeat(50));
    results.forEach(r => {
        console.log(`${r.table.padEnd(15)} | ${r.status}`);
    });
    console.log('='.repeat(50));

    // Special check for problematic queries
    console.log('\n🧪 Testing common queries...');
    try {
        await models.Order.findAll({ limit: 1 });
        console.log('✅ Order.findAll() works');
    } catch (e) {
        console.error('❌ Order.findAll() failed:', e.message);
    }

    try {
        await models.OrderItem.findAll({ limit: 1 });
        console.log('✅ OrderItem.findAll() works');
    } catch (e) {
        console.error('❌ OrderItem.findAll() failed:', e.message);
    }

    process.exit(0);
}

checkSchemaDiscrepancies();
