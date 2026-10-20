import React, { useState } from 'react';
import { FaCalendarAlt, FaClock, FaCalendarCheck, FaInfoCircle, FaSun } from 'react-icons/fa';

/**
 * Advanced Scheduler Component for Banners & Promotions
 * Supports both Specific Dates selection and Continuous schedules with daily time windowing
 */
export default function AdvancedScheduler({ value, onChange, isVideo = false }) {
  const {
    scheduleType = 'specific_dates',
    specificDates = [],
    timeSlotStart = '',
    timeSlotEnd = '',
    timezone = 'Africa/Nairobi',
    dateTimeMode = 'same', // 'same' or 'different'
    dateSpecificTimes = {}, // { 'YYYY-MM-DD': { start: 'HH:MM', end: 'HH:MM' } }
  } = value || {};

  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val });
  };

  const [dateInputValue, setDateInputValue] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingTimeForDate, setEditingTimeForDate] = useState(null);

  const term = isVideo ? 'video banner' : 'banner';
  const Term = isVideo ? 'Video Banner' : 'Banner';

  const addSpecificDate = () => {
    if (dateInputValue && /^\d{4}-\d{2}-\d{2}$/.test(dateInputValue)) {
      if (!specificDates.includes(dateInputValue)) {
        handleChange('specificDates', [...specificDates, dateInputValue].sort());
        setDateInputValue('');
      } else {
        alert('This date is already in the schedule!');
      }
    } else {
      alert('Please select a valid date');
    }
  };

  const handleDateInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSpecificDate();
    }
  };

  const addDateRange = (days) => {
    const today = new Date();
    const newDates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      if (!specificDates.includes(dateStr)) {
        newDates.push(dateStr);
      }
    }
    if (newDates.length > 0) {
      handleChange('specificDates', [...specificDates, ...newDates].sort());
    }
  };

  const addEntireMonth = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const newDates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      if (!specificDates.includes(dateStr)) {
        newDates.push(dateStr);
      }
    }
    if (newDates.length > 0) {
      handleChange('specificDates', [...specificDates, ...newDates].sort());
    }
  };

  const addSelectedMonths = () => {
    if (selectedMonths.length === 0) {
      alert('Please select at least one month');
      return;
    }
    selectedMonths.forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      addEntireMonth(year, month);
    });
    setShowMonthSelector(false);
  };

  const toggleMonth = (year, month) => {
    const monthKey = `${year}-${month}`;
    setSelectedMonths(prev =>
      prev.includes(monthKey)
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  const isMonthAdded = (year, month) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    return specificDates.some(date => date >= monthStartStr && date <= monthEndStr);
  };

  const getAvailableMonths = () => {
    const months = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    for (let month = 0; month < 12; month++) {
      if (selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth)) {
        continue;
      }
      const date = new Date(selectedYear, month, 1);
      months.push({
        year: selectedYear,
        month,
        key: `${selectedYear}-${month}`,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        fullLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  };

  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear + 1, currentYear + 2];
  };

  const clearAllDates = () => {
    if (window.confirm('Are you sure you want to clear all selected dates?')) {
      handleChange('specificDates', []);
      handleChange('dateSpecificTimes', {});
    }
  };

  const removeSpecificDate = (date) => {
    const newDates = specificDates.filter(d => d !== date);
    handleChange('specificDates', newDates);
    if (value?.dateSpecificTimes && value.dateSpecificTimes[date]) {
      const newTimes = { ...value.dateSpecificTimes };
      delete newTimes[date];
      handleChange('dateSpecificTimes', newTimes);
    }
  };

  const updateDateSpecificTime = (date, field, timeValue) => {
    const currentTimes = value?.dateSpecificTimes || {};
    const dateTime = currentTimes[date] || { start: '', end: '' };
    const newTimes = {
      ...currentTimes,
      [date]: { ...dateTime, [field]: timeValue }
    };
    handleChange('dateSpecificTimes', newTimes);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const includesToday = specificDates.includes(todayStr);

  return (
    <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
          <FaCalendarAlt /> {Term} Schedule
        </label>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
          Timezone: {timezone}
        </span>
      </div>

      {/* Schedule Mode Selector (Specific Dates vs Continuous Period) */}
      <div>
        <label className="block text-xs font-bold text-indigo-700 mb-2">Schedule Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleChange('scheduleType', 'specific_dates')}
            className={`p-3.5 rounded-xl border-2 text-left transition-all ${
              scheduleType === 'specific_dates'
                ? 'border-indigo-600 bg-white shadow-md'
                : 'border-indigo-100 bg-white/60 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <FaCalendarCheck className={scheduleType === 'specific_dates' ? 'text-indigo-600' : 'text-gray-400'} />
              <span className="font-black text-sm text-gray-900">Select Specific Dates</span>
            </div>
            <p className="text-[10px] text-gray-500">Pick exact calendar dates when the {term} will be active</p>
          </button>

          <button
            type="button"
            onClick={() => handleChange('scheduleType', 'continuous')}
            className={`p-3.5 rounded-xl border-2 text-left transition-all ${
              scheduleType === 'continuous'
                ? 'border-indigo-600 bg-white shadow-md'
                : 'border-indigo-100 bg-white/60 hover:bg-white text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <FaClock className={scheduleType === 'continuous' ? 'text-indigo-600' : 'text-gray-400'} />
              <span className="font-black text-sm text-gray-900">Continuous Period</span>
            </div>
            <p className="text-[10px] text-gray-500">Run continuously for a duration of consecutive days</p>
          </button>
        </div>
      </div>

      {/* ───────────────── SPECIFIC DATES SCHEDULING ───────────────── */}
      {scheduleType === 'specific_dates' && (
        <div className="space-y-4">
          
          {/* Daily Showing Hours (Time Slot) */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-indigo-700 uppercase flex items-center gap-1.5">
                <FaClock /> Daily Showing Hours (Active Time Window)
              </label>
              {(timeSlotStart || timeSlotEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    handleChange('timeSlotStart', '');
                    handleChange('timeSlotEnd', '');
                  }}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 underline"
                >
                  Reset to All Day (24/7)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleChange('timeSlotStart', '');
                  handleChange('timeSlotEnd', '');
                  handleChange('dateTimeMode', 'same');
                }}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  !timeSlotStart && !timeSlotEnd && dateTimeMode === 'same'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <FaSun className="text-amber-500" /> All Day (00:00 – 23:59)
                </div>
                <div className="text-[10px] text-gray-500 font-normal mt-0.5">Active full 24 hours on each date</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!timeSlotStart && !timeSlotEnd) {
                    handleChange('timeSlotStart', '08:00');
                    handleChange('timeSlotEnd', '22:00');
                  }
                }}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  (timeSlotStart || timeSlotEnd) && dateTimeMode === 'same'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <FaClock className="text-indigo-600" /> Specific Hours
                </div>
                <div className="text-[10px] text-gray-500 font-normal mt-0.5">Set daily start and end times</div>
              </button>
            </div>

            {/* Time inputs when Specific Hours is active */}
            {(timeSlotStart || timeSlotEnd) && (
              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Daily Start Time</label>
                    <input
                      type="time"
                      value={timeSlotStart}
                      onChange={e => handleChange('timeSlotStart', e.target.value)}
                      className="w-full p-2 border border-indigo-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Daily End Time</label>
                    <input
                      type="time"
                      value={timeSlotEnd}
                      onChange={e => handleChange('timeSlotEnd', e.target.value)}
                      className="w-full p-2 border border-indigo-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-indigo-700 font-medium mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                  🕒 On each selected date, the {term} begins showing at <strong>{timeSlotStart || '00:00'}</strong> and stops at <strong>{timeSlotEnd || '23:59'}</strong> ({timezone}).
                </p>
              </div>
            )}

            {!timeSlotStart && !timeSlotEnd && (
              <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200/60">
                ℹ️ The {term} will be active continuously for the full 24 hours (from 00:00 to 23:59) on each selected date.
              </p>
            )}
          </div>

          {/* Date Picker & Quick Add */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-3">
            <label className="text-xs font-black text-indigo-700 uppercase block">Add Dates To Schedule</label>
            
            <div className="flex gap-2">
              <input
                type="date"
                value={dateInputValue}
                onChange={(e) => setDateInputValue(e.target.value)}
                onKeyPress={handleDateInputKeyPress}
                min={todayStr}
                className="flex-1 p-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              />
              <button
                type="button"
                onClick={addSpecificDate}
                disabled={!dateInputValue}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-colors"
              >
                + Add Date
              </button>
            </div>

            {/* Quick Add Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Days count"
                className="w-24 text-sm px-3 py-1.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customDays && parseInt(customDays) > 0) {
                    addDateRange(parseInt(customDays));
                    setCustomDays('');
                  }
                }}
                disabled={!customDays || parseInt(customDays) <= 0}
                className="text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-bold"
              >
                + Add Next Days
              </button>

              <button
                type="button"
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="text-xs px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
              >
                {showMonthSelector ? '✕ Close' : '+ Select Full Month'}
              </button>

              {specificDates.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllDates}
                  className="text-xs px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-700 font-bold ml-auto"
                >
                  Clear All ({specificDates.length})
                </button>
              )}
            </div>

            {/* Month Selector Dropdown */}
            {showMonthSelector && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-800 uppercase">Select Months to Add</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(parseInt(e.target.value));
                      setSelectedMonths([]);
                    }}
                    className="p-1 text-xs border border-purple-300 rounded bg-white font-bold"
                  >
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {getAvailableMonths().map(month => {
                    const isAdded = isMonthAdded(month.year, month.month);
                    const isSelected = selectedMonths.includes(month.key);
                    return (
                      <button
                        key={month.key}
                        type="button"
                        onClick={() => !isAdded && toggleMonth(month.year, month.month)}
                        disabled={isAdded}
                        className={`p-2 rounded text-xs font-bold text-center transition-all ${
                          isAdded
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        {month.label} {isAdded && '✓'}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={addSelectedMonths}
                    disabled={selectedMonths.length === 0}
                    className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded font-bold"
                  >
                    Add Selected ({selectedMonths.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMonthSelector(false)}
                    className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Selected Dates Display */}
          {specificDates.length > 0 ? (
            <div className="bg-white p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Scheduled Dates ({specificDates.length})
                </label>
                {includesToday && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    🟢 Includes Today (Live upon publish)
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto p-1 bg-gray-50 rounded-lg">
                {specificDates.map(date => {
                  const dateTime = (value?.dateSpecificTimes || {})[date] || { start: '', end: '' };
                  const isToday = date === todayStr;

                  return (
                    <div
                      key={date}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                        isToday ? 'bg-emerald-50/70 border-emerald-200 font-bold' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FaCalendarCheck className={isToday ? 'text-emerald-600' : 'text-indigo-600'} />
                        <span className="font-bold text-gray-900">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {isToday && <span className="text-[10px] text-emerald-700 font-black uppercase">(Today)</span>}
                        <span className="text-indigo-700 text-[11px] font-medium ml-1">
                          • {dateTime.start || timeSlotStart || '00:00'} - {dateTime.end || timeSlotEnd || '23:59'}
                          {(!timeSlotStart && !timeSlotEnd && !dateTime.start && !dateTime.end) && ' (All Day)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTimeForDate(editingTimeForDate === date ? null : date)}
                          className={`p-1 rounded text-[11px] ${
                            dateTime.start || dateTime.end ? 'text-purple-600 font-bold' : 'text-gray-400 hover:text-indigo-600'
                          }`}
                          title="Set custom time for this date"
                        >
                          <FaClock />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSpecificDate(date)}
                          className="text-red-500 hover:text-red-700 font-bold text-sm px-1"
                        >
                          ×
                        </button>
                      </div>

                      {editingTimeForDate === date && (
                        <div className="w-full mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                          <label className="text-[10px] font-bold text-gray-500">Custom Hours:</label>
                          <input
                            type="time"
                            value={dateTime.start || ''}
                            onChange={(e) => updateDateSpecificTime(date, 'start', e.target.value)}
                            className="p-1 text-xs border rounded"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            value={dateTime.end || ''}
                            onChange={(e) => updateDateSpecificTime(date, 'end', e.target.value)}
                            className="p-1 text-xs border rounded"
                          />
                          <button
                            type="button"
                            onClick={() => updateDateSpecificTime(date, 'start', '') || updateDateSpecificTime(date, 'end', '')}
                            className="text-[10px] text-red-600 font-bold ml-1"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white rounded-xl border border-dashed border-indigo-200 text-center">
              <p className="text-xs font-medium text-gray-500">
                📅 No dates selected yet. Pick a date above or click "+ Add Next Days" to schedule your {term}.
              </p>
            </div>
          )}

          {/* Schedule Summary Banner */}
          {specificDates.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-wider opacity-80 mb-1">Schedule Summary</div>
              <div className="text-sm font-bold">
                ✓ Showing on {specificDates.length} scheduled date(s)
                {timeSlotStart || timeSlotEnd ? (
                  <> from <strong>{timeSlotStart || '00:00'}</strong> to <strong>{timeSlotEnd || '23:59'}</strong> daily</>
                ) : (
                  <> full day (24/7)</>
                )} ({timezone})
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────── CONTINUOUS PERIOD SCHEDULING ───────────────── */}
      {scheduleType === 'continuous' && (
        <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-black uppercase">
            <FaClock /> Continuous Date Range
          </div>
          <p className="text-xs text-gray-600">
            The {term} will display continuously starting from the start date for the number of duration days specified above.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Optional Daily Start Time</label>
              <input
                type="time"
                value={timeSlotStart}
                onChange={e => handleChange('timeSlotStart', e.target.value)}
                className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white"
              />
              <span className="text-[10px] text-gray-400">Leave blank for full day</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Optional Daily End Time</label>
              <input
                type="time"
                value={timeSlotEnd}
                onChange={e => handleChange('timeSlotEnd', e.target.value)}
                className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white"
              />
              <span className="text-[10px] text-gray-400">Leave blank for full day</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
