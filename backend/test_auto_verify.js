const { moveToSuccess, moveToPaid } = require('./utils/walletHelpers');
const { User, Wallet, Transaction, PlatformConfig, sequelize } = require('./models');

async function testAutoVerify() {
    try {
        console.log('--- Testing Auto-Verify Feature ---');
        
        // 1. Create a test user and wallet
        const user = await User.create({
            name: 'Auto Verify Test User',
            email: `test_auto_${Date.now()}@example.com`,
            phone: '254700000000',
            password: 'password123',
            role: 'seller'
        });
        
        const wallet = await Wallet.create({
            userId: user.id,
            balance: 0,
            pendingBalance: 1000,
            successBalance: 0
        });

        const tx = await Transaction.create({
            userId: user.id,
            amount: 1000,
            type: 'credit',
            status: 'pending',
            description: 'Test Order #123'
        });

        console.log('User and Wallet created.');

        // 2. Enable Auto-Verify
        await PlatformConfig.upsert({
            key: 'automatic_earning_verification_enabled',
            value: 'true'
        });
        console.log('Auto-Verify enabled in config.');

        // 3. Move to Success
        console.log('Executing moveToSuccess...');
        await sequelize.transaction(async (t) => {
            await moveToSuccess(user.id, 1000, '123', 'Test Order #123', null, t, 'seller');
        });

        // 4. Verify results
        const finalWallet = await Wallet.findOne({ where: { userId: user.id } });
        const finalTx = await Transaction.findOne({ where: { userId: user.id, amount: 1000 } });

        console.log('Final Wallet State:');
        console.log('Balance (Withdrawable):', finalWallet.balance);
        console.log('Success Balance:', finalWallet.successBalance);
        console.log('Pending Balance:', finalWallet.pendingBalance);
        console.log('Transaction Status:', finalTx.status);

        if (finalWallet.balance === 1000 && finalWallet.successBalance === 0) {
            console.log('✅ SUCCESS: Funds automatically moved to withdrawable balance!');
        } else {
            console.log('❌ FAILURE: Funds were not moved to withdrawable balance.');
        }

        // Cleanup
        await Transaction.destroy({ where: { userId: user.id } });
        await Wallet.destroy({ where: { userId: user.id } });
        await User.destroy({ where: { id: user.id } });
        
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        process.exit();
    }
}

testAutoVerify();
