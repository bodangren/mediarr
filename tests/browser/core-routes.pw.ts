import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  startDisposableMediarr,
  type DisposableMediarr,
} from './harness/disposableMediarr.js';
import { captureBrowserFailures } from './harness/browserFailures.js';

interface CoreRoute {
  path: string;
  expectedPath?: string;
  heading: string;
  seededContent: string;
  apiPath?: string;
  apiExpectedContent?: string;
}

interface ViewportCase {
  name: string;
  width: number;
  height: number;
}

const CORE_ROUTES: CoreRoute[] = [
  {
    path: '/',
    expectedPath: '/dashboard',
    heading: 'Dashboard',
    seededContent: 'Imported Browser Acceptance Movie',
  },
  {
    path: '/dashboard',
    heading: 'Dashboard',
    seededContent: 'Imported Browser Acceptance Movie',
  },
  {
    path: '/library/movies',
    heading: 'Movies',
    seededContent: 'Browser Acceptance Movie',
  },
  {
    path: '/library/movies/1',
    heading: 'Movie Details',
    seededContent: 'Browser Acceptance Movie',
  },
  {
    path: '/library/tv',
    heading: 'TV Shows',
    seededContent: 'Browser Acceptance Series',
  },
  {
    path: '/library/tv/1',
    heading: 'Series Details',
    seededContent: 'Browser Acceptance Series',
  },
  {
    path: '/library/series/1',
    heading: 'Series Details',
    seededContent: 'Browser Acceptance Series',
  },
  {
    path: '/library/series',
    expectedPath: '/library/tv',
    heading: 'TV Shows',
    seededContent: 'Browser Acceptance Series',
  },
  {
    path: '/library/collections',
    heading: 'Collections',
    seededContent: 'Browser Acceptance Collection',
    apiPath: '/api/collections',
  },
  {
    path: '/library/collections/1',
    heading: 'Browser Acceptance Collection',
    seededContent: 'Browser Acceptance Movie',
  },
  {
    path: '/wanted',
    heading: 'Wanted',
    seededContent: 'Browser Wanted Movie',
    apiPath: '/api/movies/missing?page=1&pageSize=25',
  },
  {
    path: '/calendar',
    heading: 'Calendar',
    seededContent: 'Browser Calendar Episode',
  },
  {
    path: '/activity/queue',
    heading: 'Queue',
    seededContent: 'Browser Acceptance Queue Item',
  },
  {
    path: '/activity/history',
    heading: 'History',
    seededContent: 'Imported Browser Acceptance Movie',
  },
  {
    path: '/system/logs',
    heading: 'Logs',
    seededContent: 'mediarr.log',
  },
  {
    path: '/settings/indexers',
    heading: 'Indexers',
    seededContent: 'Add Indexer',
    apiPath: '/api/indexers/detect',
    apiExpectedContent: '"data":[]',
  },
  {
    path: '/settings',
    expectedPath: '/settings/media',
    heading: 'Media Management',
    seededContent: 'Movie Root Folder',
  },
  {
    path: '/settings/media',
    heading: 'Media Management',
    seededContent: 'Movie Root Folder',
  },
  {
    path: '/settings/profiles',
    heading: 'Profiles & Quality',
    seededContent: 'Quality Profiles',
  },
  {
    path: '/settings/custom-formats',
    heading: 'Custom Formats',
    seededContent: 'Add Custom Format',
  },
  {
    path: '/settings/clients',
    heading: 'Download Client',
    seededContent: 'Incomplete Directory',
  },
  {
    path: '/settings/subtitles',
    heading: 'Subtitles',
    seededContent: 'Provider Status',
  },
  {
    path: '/settings/streaming',
    heading: 'Streaming',
    seededContent: 'Enable mDNS discovery broadcast',
  },
  {
    path: '/settings/notifications',
    heading: 'Notifications',
    seededContent: 'Add Notification',
  },
  {
    path: '/settings/updates',
    heading: 'Updates',
    seededContent: 'Current Version',
  },
  {
    path: '/settings/general',
    heading: 'General',
    seededContent: 'RSS Sync Interval',
  },
  {
    path: '/settings/automation',
    heading: 'Automation',
    seededContent: 'Task History',
  },
  {
    path: '/system/tasks',
    heading: 'Tasks',
    seededContent: 'Scheduled Tasks',
  },
  {
    path: '/system/backup',
    heading: 'Backup',
    seededContent: 'Automatic Backup Schedule',
  },
  {
    path: '/system/events',
    heading: 'Events',
    seededContent: 'Imported Browser Acceptance Movie',
  },
  {
    path: '/system/stats',
    heading: 'Statistics',
    seededContent: 'Library Overview',
  },
  {
    path: '/system/status',
    expectedPath: '/system/tasks',
    heading: 'Tasks',
    seededContent: 'Scheduled Tasks',
  },
];

const VIEWPORTS: ViewportCase[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function assertMeaningfulRoute(page: Page, route: CoreRoute): Promise<void> {
  await expect(
    page.getByRole('heading', { name: route.heading, exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(route.seededContent, { exact: false }).first(),
  ).toBeVisible();
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.body.querySelectorAll('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
            element.getAttribute('class')
              ? `.${element.getAttribute('class')!.trim().replace(/\s+/g, '.')}`
              : ''
          }`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        };
      })
      .filter(({ left, right }) => left < -1 || right > viewportWidth + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 12);

    return {
      body: document.body.scrollWidth - document.body.clientWidth,
      document:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      viewportWidth,
      offenders,
    };
  });

  const diagnostic = JSON.stringify(overflow, null, 2);

  expect(overflow.body, diagnostic).toBeLessThanOrEqual(1);
  expect(overflow.document, diagnostic).toBeLessThanOrEqual(1);
}

async function verifyRoute(
  browser: Browser,
  server: DisposableMediarr,
  viewport: ViewportCase,
  route: CoreRoute,
): Promise<void> {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const failures = captureBrowserFailures(page, server.origin);

  try {
    if (route.apiPath) {
      const apiResponse = await page.request.get(
        `${server.origin}${route.apiPath}`,
      );
      const responseBody = await apiResponse.text();
      expect(apiResponse.ok(), responseBody).toBe(true);
      expect(responseBody).toContain(route.apiExpectedContent ?? route.seededContent);
    }

    const response = await page.goto(`${server.origin}${route.path}`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);
    const expectedPath = route.expectedPath ?? route.path;
    await expect(page).toHaveURL(`${server.origin}${expectedPath}`);
    await assertMeaningfulRoute(page, route);
    await assertNoHorizontalOverflow(page);

    const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });
    expect(reloadResponse?.status()).toBe(200);
    await expect(page).toHaveURL(`${server.origin}${expectedPath}`);
    await assertMeaningfulRoute(page, route);
    await assertNoHorizontalOverflow(page);

    expect(failures.snapshot()).toEqual({
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      responseFailures: [],
    });
  } finally {
    await page.close();
  }
}

test.describe.parallel('configured core production route matrix', () => {
  let server: DisposableMediarr;

  test.beforeAll(async () => {
    server = await startDisposableMediarr();
  });

  test.afterAll(async () => {
    await server.close();
  });

  for (const viewport of VIEWPORTS) {
    for (const route of CORE_ROUTES) {
      test(`${viewport.name} ${route.path} deep links and reloads real seeded state`, async ({
        browser,
      }) => {
        await verifyRoute(browser, server, viewport, route);
      });
    }
  }
});
