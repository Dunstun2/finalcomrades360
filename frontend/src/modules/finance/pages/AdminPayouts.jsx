import { useState } from 'react';
import api from '@/modules/services/services/serviceApi';

const AdminPayouts = () => {
    const [sellerId, setSellerId] = useState('');
    const [payoutAmount, setPayoutAmount] = useState(0);

    const handlePayout = async () => {
        try {
            await api.post('/finance/verify-earnings', { transactionIds: [sellerId], amount: payoutAmount });
            alert('Earnings verified successfully');
        } catch (error) {
            console.error('Error verifying earnings:', error);
            alert('Failed to verify earnings');
        }
    };

    return (
        <div>
            <h1>Earning Verification</h1>
            <div>
                <label>Seller ID:</label>
                <input
                    type="text"
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                />
            </div>
            <div>
                <label>Payout Amount:</label>
                <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                />
            </div>
            <button onClick={handlePayout}>Verify Earnings</button>
        </div>
    );
};

export default AdminPayouts;