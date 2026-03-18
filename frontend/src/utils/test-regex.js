const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4=';

const regex = /^(data:|https?:\/\/)/i;

console.log('Testing regex on FALLBACK_IMAGE:');
console.log('Match:', regex.test(FALLBACK_IMAGE));

const imageUrl = 'uploads/products/test.jpg';
console.log('Testing regex on relative path:', regex.test(imageUrl));

const dataUrl2 = 'data:image/webp;base64,abc';
console.log('Testing regex on webp data URL:', regex.test(dataUrl2));
