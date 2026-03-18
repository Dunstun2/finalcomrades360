const http = require('http');

// Test GET /api/orders/:orderId/valid-transitions
function testValidTransitions() {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders/1/valid-transitions',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-token',
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      reject(e);
    });

    req.end();
  });
}

// Run test
(async () => {
  try {
    console.log('Testing GET /api/orders/1/valid-transitions...\n');
    await testValidTransitions();
    console.log('\nAPI endpoint is responding!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();
