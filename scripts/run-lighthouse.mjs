import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (fs.existsSync(edgePath)) {
  process.env.CHROME_PATH = edgePath;
}

const targetUrl = process.argv[2] || 'http://localhost:5174/';
const outputPath = process.argv[3] || './scratch-lh.json';

console.log(`Running Lighthouse on ${targetUrl}...`);
console.log(`Using browser: ${process.env.CHROME_PATH}`);

try {
  const cmd = `npx.cmd -y lighthouse "${targetUrl}" --chrome-flags="--headless --no-sandbox --disable-gpu" --output=json --output-path="${outputPath}" --only-categories=performance,accessibility --form-factor=mobile --screenEmulation.mobile=true --throttling-method=simulate`;
  execSync(cmd, { stdio: 'inherit', env: process.env });

  if (fs.existsSync(outputPath)) {
    const raw = fs.readFileSync(outputPath, 'utf-8');
    const result = JSON.parse(raw);
    const perf = Math.round((result.categories?.performance?.score || 0) * 100);
    const a11y = Math.round((result.categories?.accessibility?.score || 0) * 100);
    console.log(`\n--- LIGHTHOUSE RESULTS FOR ${targetUrl} ---`);
    console.log(`Performance: ${perf}/100`);
    console.log(`Accessibility: ${a11y}/100`);
  }
} catch (err) {
  console.error('Lighthouse run failed:', err.message);
  process.exit(1);
}
