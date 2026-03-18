// Mocking the environment for testing imageUtils.js
const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4=';

// Implementation from imageUtils.js
const generateCacheBustedUrl = (imageUrl, version = null) => {
    if (!imageUrl) return FALLBACK_IMAGE;
    const cleanUrl = typeof imageUrl === 'string' ? imageUrl.trim() : String(imageUrl).trim();
    if (/^(data:|https?:\/\/)/i.test(cleanUrl)) {
        return cleanUrl;
    }
    const versionParam = version || '12345'; // Fixed for test
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}v=${versionParam}`;
};

const resolveImageUrl = (imageUrl, baseUrl = null, version = null) => {
    if (!imageUrl) return FALLBACK_IMAGE;
    if (typeof imageUrl === 'string' && /^(data:|https?:\/\/)/i.test(imageUrl.trim())) {
        return generateCacheBustedUrl(imageUrl.trim(), version);
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
            pathPart = pathPart.replace(/\/+/g, '/');
            return generateCacheBustedUrl(`${baseUrl}/${pathPart}`, version);
        }
        let pathPart = trimmedUrl.replace(/^\/+/, '');
        return generateCacheBustedUrl(`/${pathPart}`, version);
    }
    return FALLBACK_IMAGE;
};

// Test Cases
const tests = [
    { name: 'Data URL', input: 'data:image/svg+xml;base64,ABC', expected: 'data:image/svg+xml;base64,ABC' },
    { name: 'Data URL with whitespace', input: '  data:image/png;base64,XYZ  ', expected: 'data:image/png;base64,XYZ' },
    { name: 'HTTP URL', input: 'http://example.com/img.jpg', expected: 'http://example.com/img.jpg' },
    { name: 'Relative Path', input: 'product.jpg', expected: '/product.jpg?v=12345' },
    { name: 'Path with uploads/', input: 'uploads/products/test.jpg', expected: '/uploads/products/test.jpg?v=12345' },
    { name: 'Leading slash', input: '/uploads/products/test.jpg', expected: '/uploads/products/test.jpg?v=12345' },
    { name: 'Broken Data URL (previously problematic)', input: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4=', expected: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4=' }
];

console.log('--- Frontend Image Resolution Tests ---');
let passed = 0;
tests.forEach(t => {
    const result = resolveImageUrl(t.input);
    if (result === t.expected) {
        console.log(`✅ [PASS] ${t.name}`);
        passed++;
    } else {
        console.log(`❌ [FAIL] ${t.name}`);
        console.log(`   Input:    ${t.input.substring(0, 50)}...`);
        console.log(`   Expected: ${t.expected.substring(0, 50)}...`);
        console.log(`   Got:      ${result.substring(0, 50)}...`);
    }
});

console.log(`\nResults: ${passed}/${tests.length} passed`);

if (passed === tests.length) {
    process.exit(0);
} else {
    process.exit(1);
}
