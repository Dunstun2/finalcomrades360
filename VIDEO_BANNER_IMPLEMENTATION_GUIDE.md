# Video Banner Implementation Guide
## Comrades360 Homepage Hero Banner Video Support

## ✅ What Has Been Implemented

### 1. **Database Schema Updates** ✅
- Added `videoUrl` field (TEXT) - stores video file URL or YouTube/Vimeo link
- Added `videoType` field (STRING) - 'background' | 'overlay' | 'embed'
- Added `videoAutoplay` (BOOLEAN) - default: true
- Added `videoLoop` (BOOLEAN) - default: true
- Added `videoMuted` (BOOLEAN) - default: true

**Location**: `backend/modules/marketing/models/HeroPromotion.js`

### 2. **Frontend Video Support** ✅
Updated `HeroSlider` component with:
- Full background video support
- Overlay/embed video (replaces product image)
- YouTube/Vimeo embed support
- Video controls (Play/Pause, Mute/Unmute)
- Automatic fallback to gradient if video fails
- Key-based re-rendering when switching slides

**Location**: `frontend/src/modules/marketing/components/HeroSlider.jsx`

---

## 🎥 Video Types Supported

### 1. **Background Video** (`videoType: 'background'`)
- Video covers entire banner as background
- Content (text, buttons) displays over video
- Dark overlay for text readability
- Best for: Atmospheric videos, brand storytelling

### 2. **Overlay Video** (`videoType: 'overlay'`)
- Video replaces product image on right side
- Content stays on left
- Best for: Product demos, feature highlights

### 3. **Embed Video** (`videoType: 'embed'`)
- YouTube/Vimeo embedded iframe
- Automatic URL detection and conversion
- Auto-play with mute
- Best for: Existing marketing videos

---

## 🔧 How to Add Video Support to Admin Form

You need to update `AdminCreateHeroPromotion.jsx` to add video fields.

### Required Changes:

#### 1. Add Video Fields to Form State
```javascript
const [form, setForm] = useState({
  // ... existing fields
  videoUrl: '',
  videoType: 'background', // 'background' | 'overlay' | 'embed'
  videoAutoplay: true,
  videoLoop: true,
  videoMuted: true
})
```

#### 2. Add Video Upload Section (After Image Upload)
```jsx
{/* Video Section */}
<div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 space-y-4">
  <label className="block text-xs font-black text-purple-600 uppercase tracking-widest">
    Video Banner (Optional)
  </label>
  
  {/* Video URL Input */}
  <div>
    <label className="block text-xs font-bold text-purple-500 mb-2">
      Video URL or YouTube Link
    </label>
    <input
      type="text"
      className="w-full p-3 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
      placeholder="https://youtube.com/watch?v=... or /uploads/banner-video.mp4"
      value={form.videoUrl}
      onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
    />
    <p className="text-xs text-gray-500 mt-1">
      Supports MP4, WEBM, YouTube, Vimeo
    </p>
  </div>

  {/* Video Type Selection */}
  {form.videoUrl && (
    <>
      <div>
        <label className="block text-xs font-bold text-purple-500 mb-2">
          Video Display Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'background', label: 'Full Background', desc: 'Video covers entire banner' },
            { value: 'overlay', label: 'Product Area', desc: 'Replaces product image' },
            { value: 'embed', label: 'Embedded Player', desc: 'YouTube/Vimeo iframe' }
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                form.videoType === opt.value
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <input
                type="radio"
                value={opt.value}
                checked={form.videoType === opt.value}
                onChange={e => setForm(p => ({ ...p, videoType: e.target.value }))}
                className="hidden"
              />
              <span className="font-black text-sm">{opt.label}</span>
              <span className="text-[10px] text-gray-500 mt-1">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Video Settings */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer">
          <input
            type="checkbox"
            checked={form.videoAutoplay}
            onChange={e => setForm(p => ({ ...p, videoAutoplay: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-xs font-bold">Autoplay</span>
        </label>
        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer">
          <input
            type="checkbox"
            checked={form.videoLoop}
            onChange={e => setForm(p => ({ ...p, videoLoop: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-xs font-bold">Loop</span>
        </label>
        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer">
          <input
            type="checkbox"
            checked={form.videoMuted}
            onChange={e => setForm(p => ({ ...p, videoMuted: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-xs font-bold">Muted</span>
        </label>
      </div>
    </>
  )}
</div>
```

#### 3. Update Submit Payload
```javascript
const payload = {
  // ... existing fields
  videoUrl: form.videoUrl || null,
  videoType: form.videoType,
  videoAutoplay: form.videoAutoplay,
  videoLoop: form.videoLoop,
  videoMuted: form.videoMuted
}
```

---

## 📤 Video File Upload Support

### Option 1: Direct File Upload
```jsx
const handleVideoUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  // Validate file type
  const validTypes = ['video/mp4', 'video/webm', 'video/ogg']
  if (!validTypes.includes(file.type)) {
    setError('Please upload MP4, WEBM, or OGG video files only')
    return
  }
  
  // Validate file size (e.g., max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    setError('Video file must be less than 50MB')
    return
  }
  
  setUploading(true)
  try {
    const url = await uploadFile(file) // Your existing upload function
    setForm(prev => ({ ...prev, videoUrl: url }))
    setSuccess('Video uploaded!')
  } catch (err) {
    setError('Video upload failed')
  } finally {
    setUploading(false)
  }
}
```

```jsx
<input
  type="file"
  accept="video/mp4,video/webm,video/ogg"
  onChange={handleVideoUpload}
  className="hidden"
  id="video-upload"
/>
<label
  htmlFor="video-upload"
  className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  Upload Video File
</label>
```

---

## 🎨 Usage Examples

### Example 1: Product Launch with Background Video
```javascript
{
  title: "NEW CAMPUS COLLECTION",
  subtitle: "Trending styles for every student",
  videoUrl: "https://youtube.com/watch?v=abc123",
  videoType: "background",
  videoAutoplay: true,
  videoLoop: true,
  videoMuted: true,
  productIds: [123, 456]
}
```

### Example 2: Product Demo as Overlay
```javascript
{
  title: "SMART LAPTOP DEALS",
  subtitle: "See it in action",
  videoUrl: "/uploads/videos/laptop-demo.mp4",
  videoType: "overlay",
  videoAutoplay: true,
  videoLoop: false,
  videoMuted: false,
  productIds: [789]
}
```

### Example 3: Fallback to Image
```javascript
{
  title: "FLASH SALE",
  subtitle: "Limited time only",
  customImageUrl: "/uploads/flash-sale.jpg",
  videoUrl: "", // No video = gradient background
  productIds: [111, 222]
}
```

---

## 🔄 Migration Script

Run this to add video fields to existing database:

```javascript
// backend/migrations/add-video-fields-to-hero-promotions.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HeroPromotions', 'videoUrl', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('HeroPromotions', 'videoType', {
      type: Sequelize.STRING,
      defaultValue: 'background',
      allowNull: true
    });
    
    await queryInterface.addColumn('HeroPromotions', 'videoAutoplay', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });
    
    await queryInterface.addColumn('HeroPromotions', 'videoLoop', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });
    
    await queryInterface.addColumn('HeroPromotions', 'videoMuted', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });
  },
  
  down: async (queryInterface) => {
    await queryInterface.removeColumn('HeroPromotions', 'videoUrl');
    await queryInterface.removeColumn('HeroPromotions', 'videoType');
    await queryInterface.removeColumn('HeroPromotions', 'videoAutoplay');
    await queryInterface.removeColumn('HeroPromotions', 'videoLoop');
    await queryInterface.removeColumn('HeroPromotions', 'videoMuted');
  }
};
```

---

## ✨ Features Included

✅ **Multiple video sources**: MP4, WEBM, OGG, YouTube, Vimeo
✅ **Three display modes**: Background, Overlay, Embed
✅ **Video controls**: Play/Pause, Mute/Unmute buttons
✅ **Automatic fallback**: Shows gradient if video fails to load
✅ **Mobile optimized**: Responsive design for all screen sizes
✅ **Performance**: Key-based re-rendering prevents memory leaks
✅ **Accessibility**: Proper ARIA labels and keyboard support

---

## 🚀 Next Steps

1. **Update admin form** - Add video fields to `AdminCreateHeroPromotion.jsx` (code provided above)
2. **Test video upload** - Ensure your upload service supports video files
3. **Add video preview** - Show video thumbnail in admin preview section
4. **Update AdminHeroPromotions list** - Show video icon when banner has video
5. **Add video analytics** - Track video play rates, completion rates

---

## 📝 Notes

- **Performance**: Videos should be optimized (compressed) before upload
- **File size**: Recommended max 10-20MB for fast loading
- **Format**: MP4 (H.264) is best for browser compatibility
- **YouTube**: Auto-detects and embeds YouTube/Vimeo links
- **Autoplay**: Most browsers require videos to be muted for autoplay to work

---

## 🎯 Summary

The video banner system is **fully implemented** on the frontend and database. You only need to:

1. Add the UI fields to the admin creation form (code provided above)
2. Test with sample videos
3. Optionally add video file upload if you want direct uploads (not just URLs)

The banner will automatically:
- Detect if a video URL is provided
- Choose the appropriate display mode
- Show video controls
- Fall back to gradient if video fails
- Work with YouTube/Vimeo embeds

All the heavy lifting is done! 🎉
