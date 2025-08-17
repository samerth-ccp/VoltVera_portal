// Test production deployment locally
import('./dist/index.js')
  .then(() => {
    console.log('✓ Production server started successfully');
    setTimeout(() => {
      console.log('✓ Production server running for 5 seconds without issues');
      process.exit(0);
    }, 5000);
  })
  .catch((error) => {
    console.error('✗ Production server failed:', error);
    process.exit(1);
  });