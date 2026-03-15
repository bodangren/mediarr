import { chromium } from 'playwright';

const routes = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/search', name: 'search' },
  { path: '/library/movies', name: 'library-movies' },
  { path: '/library/tv', name: 'library-tv' },
  { path: '/calendar', name: 'calendar' },
  { path: '/activity/queue', name: 'activity-queue' },
];

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'public/screenshots';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  for (const route of routes) {
    const url = `${BASE_URL}${route.path}`;
    console.log(`Capturing ${route.name}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${OUTPUT_DIR}/${route.name}.png` });
      console.log(`  Saved: ${OUTPUT_DIR}/${route.name}.png`);
    } catch (e) {
      console.error(`  Failed: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
}