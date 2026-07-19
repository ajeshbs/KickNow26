const { execSync } = require('child_process');

// Step 0: Generate worker-configuration.d.ts (gitignored) so KVNamespace etc.
// exist for the type check on CI.
execSync('wrangler types', { stdio: 'inherit' });

// Step 1: Always run Next.js build
execSync('next build', { stdio: 'inherit' });

// Step 2: Run OpenNext Cloudflare build ONLY if not already inside one.
// opennextjs-cloudflare build internally calls `npm run build` (i.e. this script),
// so we set OPENNEXT_BUILDING=1 to break the recursion on re-entry.
if (!process.env.OPENNEXT_BUILDING) {
  execSync('opennextjs-cloudflare build', {
    stdio: 'inherit',
    env: { ...process.env, OPENNEXT_BUILDING: '1' },
  });
}
