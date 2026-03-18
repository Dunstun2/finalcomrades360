const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4=';

const generateCacheBustedUrl = (imageUrl, version = null) => {
    if (!imageUrl) return FALLBACK_IMAGE;
    const cleanUrl = typeof imageUrl === 'string' ? imageUrl.trim() : String(imageUrl).trim();
    if (/^(data:|https?:\/\/)/i.test(cleanUrl)) {
        return cleanUrl;
    }
    const versionParam = version || Date.now();
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}v=${versionParam}`;
};

const resolveImageUrl = (imageUrl, baseUrl = null, version = null) => {
    if (!imageUrl) return FALLBACK_IMAGE;
    if (typeof imageUrl === 'string' && /^(data:|https?:\/\/)/i.test(imageUrl)) {
        return generateCacheBustedUrl(imageUrl, version);
    }
    if (typeof imageUrl === 'object') {
        if (imageUrl.url) return resolveImageUrl(imageUrl.url, baseUrl, version);
    }
    if (typeof imageUrl === 'string') {
        const trimmedUrl = imageUrl.trim();
        if (/^(data:|https?:\/\/)/i.test(trimmedUrl)) {
            return generateCacheBustedUrl(trimmedUrl, version);
        }
        if (baseUrl && baseUrl !== 'http://localhost:5000') {
            let pathPart = trimmedUrl.replace(/^\/+/, '');
            if (!pathPart.startsWith('uploads/')) {
                pathPart = `uploads/${pathPart}`;
            }
            return generateCacheBustedUrl(`${baseUrl}/${pathPart}`, version);
        }
        let pathPart = trimmedUrl.replace(/^\/+/, '');
        return generateCacheBustedUrl(`/${pathPart}`, version);
    }
    return FALLBACK_IMAGE;
};

// Case 1: Data URI
console.log('Case 1 (Data URI):', resolveImageUrl('data:image/png;base64,123'));
// Case 2: Data URI with leading space
console.log('Case 2 (Leading space):', resolveImageUrl(' data:image/png;base64,123'));
// Case 3: Empty string
console.log('Case 3 (Empty):', resolveImageUrl(''));
// Case 4: Relative path
console.log('Case 4 (Relative):', resolveImageUrl('image.jpg'));
// Case 5: Relative path with uploads/
console.log('Case 5 (Uploads):', resolveImageUrl('uploads/products/image.jpg'));
// Case 6: Base URL set
console.log('Case 6 (Base URL):', resolveImageUrl('image.jpg', 'http://cdn.com'));
