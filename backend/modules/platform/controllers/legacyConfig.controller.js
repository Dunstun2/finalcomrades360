const getReturnPeriod = async (req, res) => {
    try {
        const config = await PlatformConfig.findOne({ where: { key: 'returnPeriod' } });
        res.json(config ? config.value : { days: 7, hours: 0 });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching return period', error: error.message });
    }
};

const setReturnPeriod = async (req, res) => {
    const { days, hours } = req.body;
    try {
        await PlatformConfig.upsert({
            key: 'returnPeriod',
            value: { days, hours }
        });
        res.json({ message: 'Return period updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating return period', error: error.message });
    }
};