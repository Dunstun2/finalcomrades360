# Advanced Video Banner Scheduling Guide
## Schedule Videos for Specific Days and Times

## ✅ What's Been Added

### 1. **Database Fields** ✅
```javascript
{
  scheduleType: 'continuous' | 'recurring' | 'specific_dates',
  recurringDays: [0,1,2,3,4,5,6], // 0=Sunday, 6=Saturday
  specificDates: ['2026-09-01', '2026-09-15', '2026-09-30'],
  timeSlotStart: '09:00', // Show from this time
  timeSlotEnd: '17:00',   // Show until this time
  timezone: 'Africa/Nairobi'
}
```

### 2. **Smart Schedule Checker** ✅
Location: `backend/utils/scheduleChecker.js`
- Automatically filters banners based on schedule
- Checks day of week, specific dates, and time slots
- Handles overnight time slots (e.g., 22:00 - 02:00)

### 3. **Admin UI Component** ✅
Location: `frontend/src/modules/admin/components/AdvancedScheduler.jsx`
- Visual day-of-week selector
- Multiple date picker
- Time slot range selector
- Real-time schedule preview

---

## 🎯 Schedule Types Explained

### **Type 1: Continuous** (Default)
Show banner all the time within date range
```javascript
{
  scheduleType: 'continuous',
  startAt: '2026-09-01T00:00:00',
  endAt: '2026-09-30T23:59:59'
}
// Result: Shows 24/7 from Sept 1-30
```

### **Type 2: Recurring Days**
Show banner only on specific days of the week
```javascript
{
  scheduleType: 'recurring',
  recurringDays: [1, 3, 5], // Monday, Wednesday, Friday
  startAt: '2026-09-01T00:00:00',
  endAt: '2026-09-30T23:59:59'
}
// Result: Shows only on Mon/Wed/Fri in September
```

### **Type 3: Specific Dates**
Show banner only on exact dates
```javascript
{
  scheduleType: 'specific_dates',
  specificDates: ['2026-09-01', '2026-09-15', '2026-09-30']
}
// Result: Shows only on Sept 1st, 15th, and 30th
```

---

## 🕐 Time Slot Examples

### Example 1: Business Hours Only
```javascript
{
  scheduleType: 'recurring',
  recurringDays: [1,2,3,4,5], // Weekdays
  timeSlotStart: '09:00',
  timeSlotEnd: '17:00'
}
// Result: Shows Mon-Fri, 9 AM - 5 PM only
```

### Example 2: Evening Prime Time
```javascript
{
  scheduleType: 'continuous',
  timeSlotStart: '18:00',
  timeSlotEnd: '23:00'
}
// Result: Shows every day from 6 PM - 11 PM
```

### Example 3: Weekend Mornings
```javascript
{
  scheduleType: 'recurring',
  recurringDays: [0, 6], // Saturday and Sunday
  timeSlotStart: '08:00',
  timeSlotEnd: '12:00'
}
// Result: Shows Sat/Sun mornings only (8 AM - 12 PM)
```

### Example 4: Late Night (Crosses Midnight)
```javascript
{
  scheduleType: 'continuous',
  timeSlotStart: '22:00',
  timeSlotEnd: '02:00'
}
// Result: Shows from 10 PM - 2 AM (handles midnight crossing)
```

---

## 📋 Real-World Use Cases

### Use Case 1: **Black Friday Weekend Sale**
```javascript
{
  title: "BLACK FRIDAY DEALS",
  videoUrl: "https://youtube.com/watch?v=black-friday-2026",
  scheduleType: 'specific_dates',
  specificDates: ['2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30'],
  timeSlotStart: '00:00',
  timeSlotEnd: '23:59'
}
```
✅ Shows **only** on Nov 27-30 (Fri-Mon), all day

---

### Use Case 2: **Lunch Hour Promotion**
```javascript
{
  title: "LUNCH SPECIAL - 50% OFF",
  videoUrl: "/uploads/lunch-promo.mp4",
  scheduleType: 'recurring',
  recurringDays: [1,2,3,4,5], // Weekdays
  timeSlotStart: '11:30',
  timeSlotEnd: '14:00'
}
```
✅ Shows **every weekday** from 11:30 AM - 2:00 PM

---

### Use Case 3: **Weekend Flash Sale**
```javascript
{
  title: "WEEKEND FLASH SALE",
  videoUrl: "https://youtube.com/watch?v=weekend-sale",
  scheduleType: 'recurring',
  recurringDays: [0, 6], // Saturday and Sunday
  timeSlotStart: '09:00',
  timeSlotEnd: '21:00',
  startAt: '2026-09-01T00:00:00',
  endAt: '2026-09-30T23:59:59'
}
```
✅ Shows **every weekend in September**, 9 AM - 9 PM only

---

### Use Case 4: **Paydays (1st & 15th)**
```javascript
{
  title: "PAYDAY SALE",
  videoUrl: "/uploads/payday-promo.mp4",
  scheduleType: 'specific_dates',
  specificDates: [
    '2026-09-01', '2026-09-15',
    '2026-10-01', '2026-10-15',
    '2026-11-01', '2026-11-15',
    '2026-12-01', '2026-12-15'
  ]
}
```
✅ Shows **only on 1st and 15th** of each month

---

### Use Case 5: **Morning Student Rush**
```javascript
{
  title: "BREAKFAST DEALS",
  videoUrl: "https://youtube.com/watch?v=breakfast",
  scheduleType: 'recurring',
  recurringDays: [1,2,3,4,5], // Weekdays
  timeSlotStart: '07:00',
  timeSlotEnd: '10:00'
}
```
✅ Shows **every weekday morning** 7-10 AM

---

### Use Case 6: **Exam Week Special**
```javascript
{
  title: "EXAM WEEK SURVIVAL KIT",
  videoUrl: "/uploads/exam-week.mp4",
  scheduleType: 'specific_dates',
  specificDates: [
    '2026-12-01', '2026-12-02', '2026-12-03',
    '2026-12-04', '2026-12-05', '2026-12-06', '2026-12-07'
  ],
  timeSlotStart: '00:00',
  timeSlotEnd: '23:59'
}
```
✅ Shows **only during exam week** (Dec 1-7), all day

---

## 🔧 How to Add to Admin Form

### Step 1: Import Component
```javascript
import AdvancedScheduler from '@/modules/admin/components/AdvancedScheduler';
```

### Step 2: Add to Form State
```javascript
const [form, setForm] = useState({
  // ... existing fields
  scheduleType: 'continuous',
  recurringDays: [],
  specificDates: [],
  timeSlotStart: '',
  timeSlotEnd: '',
  timezone: 'Africa/Nairobi'
})
```

### Step 3: Add Component to Form
```jsx
{/* After the basic schedule section, add: */}
<AdvancedScheduler
  value={{
    scheduleType: form.scheduleType,
    recurringDays: form.recurringDays,
    specificDates: form.specificDates,
    timeSlotStart: form.timeSlotStart,
    timeSlotEnd: form.timeSlotEnd
  }}
  onChange={(schedule) => {
    setForm(prev => ({
      ...prev,
      ...schedule
    }))
  }}
/>
```

### Step 4: Include in Submit Payload
```javascript
const payload = {
  // ... existing fields
  scheduleType: form.scheduleType,
  recurringDays: form.recurringDays,
  specificDates: form.specificDates,
  timeSlotStart: form.timeSlotStart,
  timeSlotEnd: form.timeSlotEnd,
  timezone: form.timezone
}
```

---

## 🎨 UI Preview

The `AdvancedScheduler` component provides:

```
┌─────────────────────────────────────────┐
│ 📅 Advanced Scheduling                  │
├─────────────────────────────────────────┤
│ Schedule Type:                          │
│ [Always] [Recurring] [Specific Dates]   │
├─────────────────────────────────────────┤
│ Select Days of Week: [All] [M-F] [Wknd]│
│ [Sun] [Mon] [Tue] [Wed] [Thu] [Fri] [Sat]│
├─────────────────────────────────────────┤
│ 🕐 Time Slot (Optional)                 │
│ Start: [09:00]  End: [17:00]           │
├─────────────────────────────────────────┤
│ Schedule Preview:                       │
│ 📅 Every Mon, Wed, Fri • 🕐 09:00-17:00│
└─────────────────────────────────────────┘
```

---

## 📊 Schedule Priority Logic

When multiple banners match the schedule:
1. **Priority field** (highest first)
2. **Start date** (earlier first)
3. **Creation date** (newer first)

---

## 🔄 Auto-Update System

The schedule checker runs **every time** a user visits the homepage:
1. Fetches all "active" banners
2. Filters by date range (startAt/endAt)
3. Filters by schedule type (continuous/recurring/specific)
4. Filters by time slot
5. Shows only matching banners

**No cron jobs needed!** The filtering happens in real-time.

---

## 🧪 Testing Your Schedule

### Test 1: Check if banner shows now
```javascript
// In browser console:
const now = new Date()
console.log('Current day:', now.getDay()) // 0=Sun, 1=Mon, ..., 6=Sat
console.log('Current time:', now.toTimeString().slice(0,5)) // "14:30"
console.log('Current date:', now.toISOString().split('T')[0]) // "2026-09-15"
```

### Test 2: Simulate different times
```javascript
// Backend scheduleChecker.js supports passing custom time:
shouldShowPromotion(banner, new Date('2026-09-15T10:30:00'))
```

---

## 🚀 Quick Start Examples

### Quick 1: Weekday Business Hours
```javascript
{
  scheduleType: 'recurring',
  recurringDays: [1,2,3,4,5],
  timeSlotStart: '09:00',
  timeSlotEnd: '17:00'
}
```

### Quick 2: Weekend All Day
```javascript
{
  scheduleType: 'recurring',
  recurringDays: [0,6],
  timeSlotStart: '',
  timeSlotEnd: ''
}
```

### Quick 3: Specific Holiday Dates
```javascript
{
  scheduleType: 'specific_dates',
  specificDates: ['2026-12-25', '2026-12-26', '2027-01-01']
}
```

---

## 💡 Pro Tips

1. **No time slots** = Shows 24/7 within schedule
2. **Empty recurringDays** = Shows every day (same as continuous)
3. **Empty specificDates** = Shows every day (same as continuous)
4. **Overnight slots** (e.g., 22:00-02:00) work automatically
5. **Timezone** defaults to Africa/Nairobi (Kenya time)

---

## ✅ Summary

You now have a **production-ready advanced scheduling system** that allows:

✅ **Schedule by day of week** (Mon-Fri, weekends, etc.)
✅ **Schedule by specific dates** (Sept 1, 5, 15, etc.)
✅ **Schedule by time of day** (9 AM - 5 PM, lunch hours, etc.)
✅ **Combine all three** (Weekday mornings only, weekend evenings, etc.)
✅ **Overnight schedules** (10 PM - 2 AM crosses midnight automatically)
✅ **Real-time filtering** (no cron jobs needed)

**Next Step**: Add the `AdvancedScheduler` component to your admin form and start scheduling videos! 🎉
