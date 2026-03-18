/**
 * Utility function to check if a fast food item is currently open based on its schedule.
 * @param {Object} fastFood - The fast food item from the database.
 * @returns {boolean} - Returns true if the item is currently open.
 */
const isFastFoodOpen = (fastFood) => {
    // 1. Manual override checks
    if (fastFood.availabilityMode === 'OPEN') return true;
    if (fastFood.availabilityMode === 'CLOSED') return false;

    // 2. If mode is AUTO, check schedule
    // Get current date and time (matching Kenya time if possible, or server time)
    const now = new Date();
    // For local dev, we use the local time. In production, we should handle timezones properly.
    // The system metadata says: 2026-01-03T19:38:01+03:00 (Saturday)

    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTimeStr = now.toTimeString().substring(0, 5); // "HH:MM"

    // Check if availabilityDays is an array
    let schedule = fastFood.availabilityDays;
    if (typeof schedule === 'string') {
        try {
            schedule = JSON.parse(schedule);
        } catch (e) {
            schedule = [];
        }
    }

    if (!Array.isArray(schedule) || schedule.length === 0) {
        // Fallback to legacy fields if no day-specific schedule
        const from = fastFood.availableFrom || '08:00';
        const to = fastFood.availableTo || '22:00';
        return currentTimeStr >= from && currentTimeStr <= to;
    }

    // Find schedule for today or "All Days"
    let todaySchedule = schedule.find(d => d.day === currentDay && d.available);
    if (!todaySchedule) {
        todaySchedule = schedule.find(d => d.day === 'All Days' && d.available);
    }

    if (!todaySchedule) return false;

    // Check time
    const from = todaySchedule.from || '08:00';
    const to = todaySchedule.to || '22:00';

    return currentTimeStr >= from && currentTimeStr <= to;
};

module.exports = {
    isFastFoodOpen
};
