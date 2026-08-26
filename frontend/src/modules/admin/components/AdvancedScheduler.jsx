import React from 'react';
import { FaCalendarAlt, FaClock, FaCalendarCheck, FaEdit } from 'react-icons/fa';

/**
 * Advanced Scheduler Component - Simplified for Video Banners
 * Only uses specific dates with calendar picker
 */
export default function AdvancedScheduler({ value, onChange }) {
  const {
    specificDates = [],
    timeSlotStart = '',
    timeSlotEnd = '',
    dateTimeMode = 'same', // 'same' or 'different'
    dateSpecificTimes = {}, // { 'YYYY-MM-DD': { start: 'HH:MM', end: 'HH:MM' } }
  } = value || {};

  const handleChange = (field, val) => {
    onChange({ ...value, [field]: val });
  };

  const [dateInputValue, setDateInputValue] = React.useState('');
  const [customDays, setCustomDays] = React.useState('');
  const [showMonthSelector, setShowMonthSelector] = React.useState(false);
  const [selectedMonths, setSelectedMonths] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [editingTimeForDate, setEditingTimeForDate] = React.useState(null); // Track which date is being edited

  const addSpecificDate = () => {
    if (dateInputValue && /^\d{4}-\d{2}-\d{2}$/.test(dateInputValue)) {
      if (!specificDates.includes(dateInputValue)) {
        handleChange('specificDates', [...specificDates, dateInputValue].sort());
        setDateInputValue(''); // Clear input after adding
      } else {
        alert('This date is already added!');
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

  // Quick add functions
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
    // month is 0-indexed (0 = January, 11 = December)
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

    // Don't clear selectedMonths - keep them checked
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

  // Check if a month has already been added (has any dates from that month)
  const isMonthAdded = (year, month) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    return specificDates.some(date => date >= monthStartStr && date <= monthEndStr);
  };

  // Generate available months for selected year
  const getAvailableMonths = () => {
    const months = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // If current year, only show remaining months
    const startMonth = (selectedYear === currentYear) ? currentMonth : 0;
    const endMonth = 12;

    for (let month = startMonth; month < endMonth; month++) {
      months.push({
        key: `${selectedYear}-${month}`,
        label: monthNames[month],
        year: selectedYear,
        month: month
      });
    }

    return months;
  };

  // Generate available years (current year + next 5 years)
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear + i);
    }
    return years;
  };

  const clearAllDates = () => {
    if (confirm('Clear all selected dates?')) {
      handleChange('specificDates', []);
    }
  };

  const removeSpecificDate = (date) => {
    const newDates = specificDates.filter(d => d !== date);
    handleChange('specificDates', newDates);

    // Also remove from dateSpecificTimes if in 'different' mode
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

  return (
    <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
          <FaCalendarAlt /> Video Schedule
        </label>
      </div>

      {/* Schedule Type Header */}
      <div>
        <label className="block text-xs font-bold text-indigo-500 mb-3">Schedule Configuration</label>
        <div className="bg-white p-4 rounded-xl border-2 border-indigo-600">
          <div className="flex items-center gap-3">
            <FaCalendarCheck className="text-2xl text-indigo-600" />
            <div>
              <div className="font-black text-sm">Select Specific Dates</div>
              <div className="text-[10px] text-gray-500">Choose exact dates when the video should play</div>
            </div>
          </div>
        </div>
      </div>

      {/* Specific Dates Selection */}
      <div className="bg-white p-4 rounded-xl border border-indigo-100">
        <div className="mb-3">
          <label className="text-xs font-bold text-indigo-600 uppercase block mb-2">Add Specific Dates</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateInputValue}
              onChange={(e) => setDateInputValue(e.target.value)}
              onKeyPress={handleDateInputKeyPress}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 p-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              placeholder="Select date..."
            />
            <button
              type="button"
              onClick={addSpecificDate}
              disabled={!dateInputValue}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-colors"
            >
              + Add
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">💡 Click the calendar icon to select dates easily</p>
        </div>

        {/* Quick Add Buttons */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Quick Add</label>
          <div className="flex items-center gap-2">
            {/* Quick Add Days */}
            <input
              type="number"
              min="1"
              max="365"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && customDays) {
                  e.preventDefault();
                  addDateRange(parseInt(customDays));
                  setCustomDays('');
                }
              }}
              placeholder="Days"
              className="w-24 text-sm px-3 py-2 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
              className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold whitespace-nowrap"
            >
              + Add Days
            </button>

            {/* Quick Add Months */}
            <button
              type="button"
              onClick={() => setShowMonthSelector(!showMonthSelector)}
              className="text-sm px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold whitespace-nowrap"
            >
              {showMonthSelector ? '✕ Close' : '+ Select Months'}
            </button>

            {/* Clear All */}
            {specificDates.length > 0 && (
              <button
                type="button"
                onClick={clearAllDates}
                className="text-sm px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 font-bold whitespace-nowrap ml-auto"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Month Selector Modal */}
          {showMonthSelector && (
            <div className="mt-3 p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-bold text-purple-700 uppercase">Select Months to Add</label>
                {selectedMonths.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-purple-200 text-purple-800 rounded font-bold">
                    {selectedMonths.length} selected
                  </span>
                )}
              </div>

              {/* Year Selector */}
              <div className="mb-3">
                <label className="text-[10px] font-bold text-purple-700 uppercase block mb-1">Select Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value));
                    setSelectedMonths([]); // Clear selection when year changes
                  }}
                  className="w-full p-2 text-sm border border-purple-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white font-bold"
                >
                  {getAvailableYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Month Grid */}
              <div className="mb-3">
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableMonths().map(month => {
                      const isAdded = isMonthAdded(month.year, month.month);
                      const isSelected = selectedMonths.includes(month.key);

                      return (
                        <label
                          key={month.key}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all text-[11px] font-bold ${isAdded
                            ? 'bg-green-100 text-green-800 border-2 border-green-400'
                            : isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                            }`}
                          title={isAdded ? 'Already added' : ''}
                        >
                          <input
                            type="checkbox"
                            checked={isAdded || isSelected}
                            onChange={() => !isAdded && toggleMonth(month.year, month.month)}
                            disabled={isAdded}
                            className="w-3 h-3"
                          />
                          {month.label}
                          {isAdded && <span className="ml-auto text-[10px]">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addSelectedMonths}
                  disabled={selectedMonths.length === 0}
                  className="flex-1 text-[10px] px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold"
                >
                  Add {selectedMonths.length} Month{selectedMonths.length !== 1 ? 's' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonths([]);
                    setShowMonthSelector(false);
                  }}
                  className="text-[10px] px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date-Time Mode Selector */}
        {specificDates.length > 0 && (
          <div className="mb-4 pb-3 border-b border-gray-200">
            <label className="text-xs font-bold text-indigo-600 uppercase block mb-2">Time Configuration</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${(value?.dateTimeMode || 'same') === 'same'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
              >
                <input
                  type="radio"
                  name="dateTimeMode"
                  value="same"
                  checked={(value?.dateTimeMode || 'same') === 'same'}
                  onChange={() => handleChange('dateTimeMode', 'same')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-xs font-black">Same Time</div>
                  <div className="text-[10px] text-gray-500">One time slot for all dates</div>
                </div>
              </label>
              <label
                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${value?.dateTimeMode === 'different'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
              >
                <input
                  type="radio"
                  name="dateTimeMode"
                  value="different"
                  checked={value?.dateTimeMode === 'different'}
                  onChange={() => handleChange('dateTimeMode', 'different')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-xs font-black">Different Times</div>
                  <div className="text-[10px] text-gray-500">Custom time per date</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {specificDates.length > 0 ? (
          <div className="mt-4">
            <label className="text-xs font-bold text-gray-600 uppercase block mb-2">
              Selected Dates ({specificDates.length})
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-lg">
              {specificDates.map(date => {
                const dateTime = (value?.dateSpecificTimes || {})[date] || { start: '', end: '' };
                const isDifferentMode = value?.dateTimeMode === 'different';

                return (
                  <div
                    key={date}
                    className="bg-white rounded-lg border border-indigo-200 p-3 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <FaCalendarCheck className="text-indigo-600" />
                        <div className="flex-1">
                          <span className="text-sm font-bold text-indigo-900">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {/* Show time for Same Time mode */}
                          {(!value?.dateTimeMode || value?.dateTimeMode === 'same') && editingTimeForDate !== date && (
                            <>
                              {(dateTime.start || dateTime.end) ? (
                                <span className="text-xs text-purple-600 font-semibold ml-2">
                                  • {dateTime.start || timeSlotStart || '00:00'} - {dateTime.end || timeSlotEnd || '23:59'}
                                </span>
                              ) : (timeSlotStart || timeSlotEnd) ? (
                                <span className="text-xs text-indigo-600 font-semibold ml-2">
                                  • {timeSlotStart || '00:00'} - {timeSlotEnd || '23:59'}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 ml-2">• 24/7</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Edit Time Icon - only show in Same Time mode */}
                        {(!value?.dateTimeMode || value?.dateTimeMode === 'same') && (
                          <button
                            type="button"
                            onClick={() => setEditingTimeForDate(editingTimeForDate === date ? null : date)}
                            className={`p-1.5 rounded transition-colors ${editingTimeForDate === date || (dateTime.start || dateTime.end)
                              ? 'text-purple-600 hover:bg-purple-100'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'
                              }`}
                            title={editingTimeForDate === date ? "Close time editor" : "Set different time for this date"}
                          >
                            <FaClock className="text-sm" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSpecificDate(date)}
                          className="text-red-600 hover:text-red-800 text-lg leading-none px-2"
                          title="Remove this date"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Show time inputs when editing or in Different Times mode */}
                    {(isDifferentMode || editingTimeForDate === date) && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">
                            {editingTimeForDate === date ? 'Custom Time for This Date' : 'Time Slot'}
                          </label>
                          {(dateTime.start || dateTime.end) && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentTimes = value?.dateSpecificTimes || {};
                                const newTimes = { ...currentTimes };
                                newTimes[date] = { start: '', end: '' };
                                onChange({ ...value, dateSpecificTimes: newTimes });
                                if (editingTimeForDate === date) {
                                  setEditingTimeForDate(null);
                                }
                              }}
                              className="text-[9px] px-1.5 py-0.5 bg-red-100 hover:bg-red-200 rounded text-red-700 font-bold"
                            >
                              {editingTimeForDate === date ? 'Use Default Time' : 'Clear (24/7)'}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={dateTime.start || ''}
                              onChange={(e) => updateDateSpecificTime(date, 'start', e.target.value)}
                              className="w-full p-1.5 text-xs border border-gray-300 rounded outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">End Time</label>
                            <input
                              type="time"
                              value={dateTime.end || ''}
                              onChange={(e) => updateDateSpecificTime(date, 'end', e.target.value)}
                              className="w-full p-1.5 text-xs border border-gray-300 rounded outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        {!dateTime.start && !dateTime.end && editingTimeForDate === date && (
                          <p className="text-[9px] text-blue-600 mt-1">
                            {(timeSlotStart || timeSlotEnd)
                              ? `Leave empty to use default time: ${timeSlotStart || '00:00'} - ${timeSlotEnd || '23:59'}`
                              : 'Leave empty for 24/7 (no time restrictions)'
                            }
                          </p>
                        )}
                        {!dateTime.start && !dateTime.end && !editingTimeForDate && (
                          <p className="text-[9px] text-blue-600 mt-1">24/7 - No time restrictions</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-xs text-gray-500 text-center italic">
              📅 No specific dates added yet. Use the date picker above or quick add buttons.
            </p>
          </div>
        )}
      </div>

      {/* Time Slot Selection - For same time mode */}
      {(value?.dateTimeMode || 'same') === 'same' && specificDates.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-bold text-indigo-600 uppercase flex items-center gap-2">
              <FaClock /> Time Slot for All Dates
            </label>
            {(timeSlotStart || timeSlotEnd) && (
              <button
                type="button"
                onClick={() => {
                  onChange({ ...value, timeSlotStart: '', timeSlotEnd: '' });
                }}
                className="text-[10px] px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-700 font-bold"
              >
                Clear Times (24/7)
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            Set specific hours or leave empty for 24/7. Click "Clear Times" to reset to 24/7.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label>
              <input
                type="time"
                value={timeSlotStart}
                onChange={e => handleChange('timeSlotStart', e.target.value)}
                className="w-full p-2 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">End Time</label>
              <input
                type="time"
                value={timeSlotEnd}
                onChange={e => handleChange('timeSlotEnd', e.target.value)}
                className="w-full p-2 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {timeSlotStart && timeSlotEnd ? (
            <p className="text-xs text-green-700 font-bold mt-2">
              ✓ Video will play from {timeSlotStart} to {timeSlotEnd} on all selected dates
            </p>
          ) : (
            <p className="text-xs text-blue-700 font-bold mt-2">
              ℹ️ No time restrictions - Video will play 24/7 on selected dates
            </p>
          )}
        </div>
      )}

      {/* Schedule Preview */}
      {specificDates.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl">
          <div className="text-xs font-black uppercase tracking-widest mb-2 opacity-80">Schedule Preview</div>
          <div className="text-sm font-bold">
            📅 On {specificDates.length} specific date(s)
            {value?.dateTimeMode === 'different' && ' • ⏰ Different times per date'}
            {(!value?.dateTimeMode || value?.dateTimeMode === 'same') && (timeSlotStart || timeSlotEnd) && (
              <> • 🕐 {timeSlotStart || '00:00'} - {timeSlotEnd || '23:59'} on all dates</>
            )}
            {(!value?.dateTimeMode || value?.dateTimeMode === 'same') && !timeSlotStart && !timeSlotEnd && (
              <> • 🕐 24/7 on all dates</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
