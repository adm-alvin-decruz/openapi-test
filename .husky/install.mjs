import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Skip if CI/prod or not a Git checkout
if (process.env.CI || process.env.NODE_ENV === 'production' || !existsSync(resolve('.git'))) {
  process.exit(0);
}

try {
  const husky = (await import('husky')).default;
  await husky(); // same as running "husky" CLI
} catch {
  // Husky not installed (e.g., devDeps omitted) — don't fail install
  process.exit(0);
}
