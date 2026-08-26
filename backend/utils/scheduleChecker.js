/**
 * Advanced Schedule Checker for Hero Promotions
 * Determines if a banner should be shown based on complex scheduling rules
 */

/**
 * Check if promotion should be active right now based on schedule
 * @param {Object} promotion - HeroPromotion instance
 * @param {Date} now - Current date/time (defaults to now)
 * @returns {boolean} - true if should be shown
 */
function shouldShowPromotion(promotion, now = new Date()) {
  // Must be active status
  if (promotion.status !== 'active') return false;

  // Check basic date range (startAt / endAt)
  if (promotion.startAt && new Date(promotion.startAt) > now) return false;
  if (promotion.endAt && new Date(promotion.endAt) < now) return false;

  const scheduleType = promotion.scheduleType || 'continuous';

  // CONTINUOUS: Always show (within startAt/endAt range)
  if (scheduleType === 'continuous') {
    return checkTimeSlot(promotion, now);
  }

  // RECURRING: Show on specific days of week
  if (scheduleType === 'recurring') {
    const recurringDays = promotion.recurringDays || [];
    if (recurringDays.length === 0) return checkTimeSlot(promotion, now); // No days = always show

    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    if (!recurringDays.includes(currentDay)) return false;

    return checkTimeSlot(promotion, now);
  }

  // SPECIFIC_DATES: Show only on exact dates
  if (scheduleType === 'specific_dates') {
    const specificDates = promotion.specificDates || [];
    if (specificDates.length === 0) return checkTimeSlot(promotion, now);

    const currentDate = formatDate(now); // "2026-09-01"
    if (!specificDates.includes(currentDate)) return false;

    // Check if using per-date times
    const dateTimeMode = promotion.dateTimeMode || 'same';
    if (dateTimeMode === 'different' && promotion.dateSpecificTimes) {
      const dateTime = promotion.dateSpecificTimes[currentDate];
      if (dateTime && (dateTime.start || dateTime.end)) {
        // Use date-specific times for this date
        return checkTimeSlotWithValues(dateTime.start, dateTime.end, now);
      }
    }

    // Fall back to global time slot
    return checkTimeSlot(promotion, now);
  }

  return true;
}

/**
 * Check if current time is within allowed time slot
 * @param {Object} promotion 
 * @param {Date} now 
 * @returns {boolean}
 */
function checkTimeSlot(promotion, now) {
  return checkTimeSlotWithValues(promotion.timeSlotStart, promotion.timeSlotEnd, now);
}

/**
 * Check if current time is within allowed time slot (with explicit start/end values)
 * @param {string} timeSlotStart - "09:00"
 * @param {string} timeSlotEnd - "17:00"
 * @param {Date} now 
 * @returns {boolean}
 */
function checkTimeSlotWithValues(timeSlotStart, timeSlotEnd, now) {
  // No time restrictions
  if (!timeSlotStart && !timeSlotEnd) return true;

  const currentTime = formatTime(now); // "14:30"

  // Only start time specified
  if (timeSlotStart && !timeSlotEnd) {
    return currentTime >= timeSlotStart;
  }

  // Only end time specified
  if (!timeSlotStart && timeSlotEnd) {
    return currentTime <= timeSlotEnd;
  }

  // Both specified
  if (timeSlotStart && timeSlotEnd) {
    // Normal case: 09:00 - 17:00
    if (timeSlotStart < timeSlotEnd) {
      return currentTime >= timeSlotStart && currentTime <= timeSlotEnd;
    }
    // Overnight case: 22:00 - 02:00 (crosses midnight)
    else {
      return currentTime >= timeSlotStart || currentTime <= timeSlotEnd;
    }
  }

  return true;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time as HH:MM
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get human-readable schedule description
 */
function getScheduleDescription(promotion) {
  const scheduleType = promotion.scheduleType || 'continuous';
  const parts = [];

  if (scheduleType === 'continuous') {
    parts.push('Always active');
  } else if (scheduleType === 'recurring') {
    const days = promotion.recurringDays || [];
    if (days.length === 7) {
      parts.push('Every day');
    } else if (days.length > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      parts.push('Every ' + days.map(d => dayNames[d]).join(', '));
    }
  } else if (scheduleType === 'specific_dates') {
    const dates = promotion.specificDates || [];
    if (dates.length > 0) {
      parts.push(`On ${dates.length} specific date(s)`);
    }
  }

  // Add time slot info
  if (promotion.timeSlotStart && promotion.timeSlotEnd) {
    parts.push(`${promotion.timeSlotStart} - ${promotion.timeSlotEnd}`);
  } else if (promotion.timeSlotStart) {
    parts.push(`from ${promotion.timeSlotStart}`);
  } else if (promotion.timeSlotEnd) {
    parts.push(`until ${promotion.timeSlotEnd}`);
  }

  return parts.join(' • ') || 'No schedule';
}

module.exports = {
  shouldShowPromotion,
  checkTimeSlot,
  checkTimeSlotWithValues,
  getScheduleDescription,
  formatDate,
  formatTime
};
