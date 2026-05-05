const { URL } = require('node:url');
const https = require('node:https');
const process = require('node:process');

const SCRAPE_TIMEOUT_MS = 15000;

const SITES = {
  valor:        { name: 'Valor Econômico', url: 'https://valor.globo.com',            domain: 'valor.globo.com',      selectors: ['.feed-post-link','h3.feed-post-title a','.bastian-feed-item h2 a','h2 a','h3 a'] },
  estadao:      { name: 'Estadão',         url: 'https://www.estadao.com.br',         domain: 'estadao.com.br',       selectors: ['a[href*="estadao.com.br/economia"]','a[href*="estadao.com.br/politica"]','a[href*="estadao.com.br/negocios"]','article h2 a','h2 a'] },
  braziljournal:{ name: 'Brazil Journal',  url: 'https://braziljournal.com',          domain: 'braziljournal.com',    selectors: ['article h2 a','.post-title a','h2 a','h3 a'] },
  pipeline:     { name: 'Pipeline',        url: 'https://braziljournal.com/pipeline', domain: 'braziljournal.com',    selectors: ['article h2 a','.post-title a','h2 a','h3 a'] },
  neofeed:      { name: 'NeoFeed',         url: 'https://neofeed.com.br',             domain: 'neofeed.com.br',       selectors: ['a[href*="/negocios/"]','a[href*="/mercado/"]','a[href*="/wealth"]','a[href*="/experts/"]','a[href*="/tech/"]','h2 a','h3 a'] },
  wsj:          { name: 'WSJ',             rss: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' },
  barrons:      { name: "Barron's",        rss: 'https://feeds.a.dj.com/rss/RSSOpinion.xml' }
};

function failureResult(site, config, error) {
  return {
    site,
    name: config.name,
    url: config.url,
    error: error && error.message ? error.message : String(error),
    headlines: [],
    scrapedAt: new Date().toISOString()
  };
}

function successResult(site, config, headlines) {
  return {
    site,
    name: config.name,
    url: config.url,
    headlines,
    scrapedAt: new Date().toISOString()
  };
}

function resolveHeadlineUrl(href, baseUrl) {
  if (!href) {
    return '';
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch (_error) {
    return href;
  }
}

function getChromium() {
  return require('playwright').chromium;
}

function fetchRss(rssUrl) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('RSS timeout')), SCRAPE_TIMEOUT_MS);
    https.get(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        const items = [];
        const regex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>|<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
        let match;
        while ((match = regex.exec(data)) !== null && items.length < 5) {
          const title = (match[1] || match[3] || '').trim();
          const url = (match[2] || match[4] || '').trim();
          if (title && url && title.length > 10) items.push({ title, url });
        }
        resolve(items);
      });
    }).on('error', (e) => { clearTimeout(timeout); reject(e); });
  });
}

async function scrapeRssSite(site) {
  const config = SITES[site];
  try {
    const headlines = await fetchRss(config.rss);
    return { site, name: config.name, url: config.rss, headlines, scrapedAt: new Date().toISOString() };
  } catch (e) {
    console.error(`[${site}] RSS error: ${e.message}`);
    return failureResult(site, { name: config.name, url: config.rss }, e);
  }
}

async function extractHeadlines(page, selector, baseUrl) {
  const rawHeadlines = await page.locator(selector).evaluateAll((elements) => {
    return elements.map((element) => ({
      title: (element.textContent || '').replace(/\s+/g, ' ').trim(),
      href: element.getAttribute('href') || ''
    }));
  });

  const config = Object.values(SITES).find(s => s.url === baseUrl || baseUrl.startsWith(s.url)) || {};
  const domain = config.domain || '';

  return rawHeadlines
    .filter((h) => h.title && h.title.length > 15)
    .map((h) => ({ title: h.title, url: resolveHeadlineUrl(h.href, baseUrl) }))
    .filter((h) => !domain || h.url.includes(domain))
    .slice(0, 5);
}

async function scrapeSite(site) {
  const config = SITES[site];
  if (config.rss) return scrapeRssSite(site);
  let browser;
  let timedOut = false;
  let timeoutHandle;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;

      if (browser) {
        browser.close().catch(() => {});
      }

      reject(new Error(`Timed out after ${SCRAPE_TIMEOUT_MS}ms`));
    }, SCRAPE_TIMEOUT_MS);
  });

  const scrapePromise = (async () => {
    browser = await getChromium().launch({ headless: true });

    if (timedOut) {
      await browser.close().catch(() => {});
      throw new Error(`Timed out after ${SCRAPE_TIMEOUT_MS}ms`);
    }

    const page = await browser.newPage();
    page.setDefaultTimeout(SCRAPE_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(SCRAPE_TIMEOUT_MS);

    await page.goto(config.url, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPE_TIMEOUT_MS
    });

    let selectedSelector = null;

    for (const selector of config.selectors) {
      const count = await page.locator(selector).count();

      if (count > 0) {
        selectedSelector = selector;
        break;
      }
    }

    const headlines = selectedSelector
      ? await extractHeadlines(page, selectedSelector, config.url)
      : [];

    return successResult(site, config, headlines);
  })();

  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (error) {
    console.error(`[${site}] ${error.message || String(error)}`);
    return failureResult(site, config, error);
  } finally {
    clearTimeout(timeoutHandle);

    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function main() {
  const siteArg = process.argv[2];
  const siteKeys = Object.keys(SITES);

  if (siteArg === 'all') {
    const results = [];

    for (const site of siteKeys) {
      results.push(await scrapeSite(site));
    }

    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (!siteArg || !SITES[siteArg]) {
    console.error(`Unknown site key: ${siteArg || ''}`);
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify([await scrapeSite(siteArg)], null, 2));
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});
