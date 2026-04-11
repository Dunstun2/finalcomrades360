import { useState, useEffect } from 'react';
import api from '../services/serviceApi';

const AdminConfig = () => {
    const [returnPeriod, setReturnPeriod] = useState({ days: 7, hours: 0 });

    useEffect(() => {
        const fetchReturnPeriod = async () => {
            try {
                const response = await api.get('/config/return-period');
                setReturnPeriod(response.data);
            } catch (error) {
                console.error('Error fetching return period:', error);
            }
        };
        fetchReturnPeriod();
    }, []);

    const handleSave = async () => {
        try {
            await api.post('/config/return-period', returnPeriod);
            alert('Return period updated successfully');
        } catch (error) {
            console.error('Error updating return period:', error);
            alert('Failed to update return period');
        }
    };

    return (
        <div>
            <h1>Admin Configuration</h1>
            <div>
                <label>Return Period (Days):</label>
                <input
                    type="number"
                    value={returnPeriod.days}
                    onChange={(e) => setReturnPeriod({ ...returnPeriod, days: e.target.value })}
                />
            </div>
            <div>
                <label>Return Period (Hours):</label>
                <input
                    type="number"
                    value={returnPeriod.hours}
                    onChange={(e) => setReturnPeriod({ ...returnPeriod, hours: e.target.value })}
                />
            </div>
            <button onClick={handleSave}>Save</button>
        </div>
    );
};

export default AdminConfig;