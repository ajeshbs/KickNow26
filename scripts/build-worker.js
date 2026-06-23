const { execSync } = require('child_process');

// Run opennextjs-cloudflare build with OPENNEXT_BUILDING=1 set.
// This tells scripts/build.js (which is npm run build) to skip the inner
// opennextjs-cloudflare call, preventing double-bundling.
execSync('opennextjs-cloudflare build', {
  stdio: 'inherit',
  env: { ...process.env, OPENNEXT_BUILDING: '1' },
});
