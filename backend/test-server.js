const https = require('http');

async function testServer() {
  console.log('🔍 Testing server connectivity...');

  const req = https.request({
    hostname: 'localhost',
    port: 8080,
    path: '/',
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`📊 Server response status: ${res.statusCode}`);
      console.log(`📋 Response: ${data.substring(0, 100)}...`);
      if (res.statusCode === 200) {
        console.log('✅ Server is running correctly!');
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Cannot connect to server:', err.message);
  });

  req.end();
}

testServer();
