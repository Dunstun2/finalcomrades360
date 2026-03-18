// Mocking dependencies for backend testing
const path = {
    basename: (p) => p.split(/[\\/]/).pop()
};

const validateAndNormalizeImages = (images) => {
    if (!Array.isArray(images)) return [];

    return images
        .map(img => {
            if (typeof img === 'string') {
                const trimmed = img.trim();
                if (/^(data:image\/|data:application\/)/i.test(trimmed) || trimmed.startsWith('data:')) {
                    return trimmed;
                }
                if (/^https?:\/\//i.test(trimmed)) {
                    return trimmed;
                }
                if (trimmed.toLowerCase().includes('base64,')) {
                    return trimmed;
                }
                if (trimmed.startsWith('uploads/')) {
                    return '/' + trimmed;
                }
                if (!trimmed.startsWith('/uploads/')) {
                    return `/uploads/products/${trimmed}`;
                }
                return trimmed;
            }
            return img;
        })
        .filter(img => img);
};

// Test cases
const tests = [
    { name: 'Data URL', input: ['data:image/webp;base64,ABC'], expected: ['data:image/webp;base64,ABC'] },
    { name: 'Data URL with whitespace', input: ['  data:image/png;base64,XYZ  '], expected: ['data:image/png;base64,XYZ'] },
    { name: 'HTTP URL', input: ['http://cdn.com/product.jpg'], expected: ['http://cdn.com/product.jpg'] },
    { name: 'Relative filename', input: ['new-product.jpg'], expected: ['/uploads/products/new-product.jpg'] },
    { name: 'Path with uploads/', input: ['uploads/products/manual.jpg'], expected: ['/uploads/products/manual.jpg'] },
    { name: 'Empty array', input: [], expected: [] },
    { name: 'Mixed array', input: ['data:...,', 'file.jpg'], expected: ['data:...,', '/uploads/products/file.jpg'] }
];

console.log('--- Backend Image Normalization Tests ---');
let passed = 0;
tests.forEach(t => {
    const result = validateAndNormalizeImages(t.input);
    const resultStr = JSON.stringify(result);
    const expectedStr = JSON.stringify(t.expected);

    if (resultStr === expectedStr) {
        console.log(`✅ [PASS] ${t.name}`);
        passed++;
    } else {
        console.log(`❌ [FAIL] ${t.name}`);
        console.log(`   Input:    ${JSON.stringify(t.input)}`);
        console.log(`   Expected: ${expectedStr}`);
        console.log(`   Got:      ${resultStr}`);
    }
});

console.log(`\nResults: ${passed}/${tests.length} passed`);

if (passed === tests.length) {
    process.exit(0);
} else {
    process.exit(1);
}
