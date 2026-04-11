import { useState } from 'react';
import api from '../services/serviceApi';

const SellerDashboard = () => {
    const [withdrawAmount, setWithdrawAmount] = useState(0);

    const handleWithdraw = async () => {
        try {
            const response = await api.post('/wallet/withdraw', { amount: withdrawAmount });
            alert(`Withdrawal successful. Remaining balance: ${response.data.balance}`);
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            alert('Failed to process withdrawal');
        }
    };

    return (
        <div>
            <h1>Seller Dashboard</h1>
            <div>
                <label>Withdraw Amount:</label>
                <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <button onClick={handleWithdraw}>Withdraw</button>
            </div>
        </div>
    );
};

export default SellerDashboard;