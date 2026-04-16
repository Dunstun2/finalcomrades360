const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testLaunch() {
    console.log('🔍 Starting Puppeteer Diagnostic...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('User:', process.env.USER || 'unknown');
    
    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--single-process',
        '--no-zygote',
        '--disable-dev-shm-usage',
        '--disable-gpu'
    ];

    console.log('🚀 Attempting to launch browser with args:', args.join(' '));

    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: args
        });
        console.log('✅ SUCCESS: Browser launched successfully!');
        const version = await browser.version();
        console.log('Browser Version:', version);
        await browser.close();
        console.log('👋 Browser closed safely.');
    } catch (err) {
        console.error('❌ FAILURE: Browser launch failed.');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        
        // Check for specific missing library errors
        if (err.message.includes('error while loading shared libraries')) {
            const missingLib = err.message.split(':').pop().trim();
            console.error(`💡 MISSING LIBRARY DETECTED: ${missingLib}`);
            console.error('You need to ask your server administrator to install this library.');
        } else if (err.message.includes('pthread_create')) {
            console.error('💡 RESOURCE LIMIT ERROR: Still hitting thread/process limits.');
        }
    }
}

testLaunch();
