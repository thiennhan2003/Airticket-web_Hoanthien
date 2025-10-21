#!/usr/bin/env node

const https = require('http');

console.log('🚀 Flight Booking System - Health Check');
console.log('=====================================\n');

// Kiểm tra các service
const services = [
  { name: 'Backend API', url: 'http://localhost:8080/', expectedStatus: 200 },
  { name: 'Frontend App', url: 'http://localhost:3000', expectedStatus: 200 },
  { name: 'Admin Dashboard', url: 'http://localhost:5000', expectedStatus: 200 },
];

async function checkService(service) {
  return new Promise((resolve) => {
    const req = https.request(service.url, (res) => {
      const status = res.statusCode;
      const isHealthy = status === service.expectedStatus;

      console.log(`${isHealthy ? '✅' : '❌'} ${service.name}: ${status} ${service.url}`);

      resolve(isHealthy);
    });

    req.on('error', (err) => {
      console.log(`❌ ${service.name}: ERROR - ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function checkAllServices() {
  const results = await Promise.all(services.map(checkService));

  const healthyCount = results.filter(Boolean).length;
  const totalCount = services.length;

  console.log('\n📊 Summary:');
  console.log(`✅ Healthy: ${healthyCount}/${totalCount}`);

  if (healthyCount === totalCount) {
    console.log('🎉 All services are running correctly!');
    console.log('\n📋 Access URLs:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Admin: http://localhost:5000');
    console.log('   Backend API: http://localhost:8080');
  } else {
    console.log('\n⚠️  Some services are not responding. Please check:');
    services.forEach((service, index) => {
      if (!results[index]) {
        console.log(`   - ${service.name}: ${service.url}`);
      }
    });
  }

  console.log('\n🔧 Admin Login:');
  console.log('   Email: admin@localhost.com');
  console.log('   Password: admin123');
}

checkAllServices().catch(console.error);
