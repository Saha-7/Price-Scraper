require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { CATEGORY_URLS } = require('./urls');
const { parseProductLinks, getNextPageUrl, parseProductDetails } = require('./parser');

const AUTH = process.env.BRIGHT_DATA_AUTH;

// ── Output setup ──────────────────────────────────────────────
const RUN_ID = Date.now();
const OUTPUT_DIR = path.join('output', `run_${RUN_ID}`);
const FULL_OUTPUT   = path.join(OUTPUT_DIR, 'products_full.json');
const PRICE_OUTPUT  = path.join(OUTPUT_DIR, 'products_prices.json');
const URLS_CACHE    = path.join(OUTPUT_DIR, 'collected_urls.json');
const VISITED_CACHE = path.join(OUTPUT_DIR, 'visited.json');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function saveProduct(product) {
  let existing = [];
  if (fs.existsSync(FULL_OUTPUT)) {
    try { existing = JSON.parse(fs.readFileSync(FULL_OUTPUT, 'utf8')); } catch (_) {}
  }
  existing.push(product);
  fs.writeFileSync(FULL_OUTPUT, JSON.stringify(existing, null, 2));
}

function rebuildPriceFile() {
  if (!fs.existsSync(FULL_OUTPUT)) return;
  try {
    const all = JSON.parse(fs.readFileSync(FULL_OUTPUT, 'utf8'));
    const prices = all.map(p => ({
      sku:           p.sku,
      name:          p.name,
      category:      p.category,
      salePrice:     p.salePrice,
      originalPrice: p.originalPrice,
      stockStatus:   p.stockStatus,
      discountBadge: p.discountBadge,
      tags:          p.tags,
      url:           p.url,
      scrapedAt:     p.scrapedAt,
    }));
    fs.writeFileSync(PRICE_OUTPUT, JSON.stringify(prices, null, 2));
  } catch (_) {}
}

function saveVisited(visited) {
  fs.writeFileSync(VISITED_CACHE, JSON.stringify([...visited], null, 2));
}

function loadVisited() {
  if (!fs.existsSync(VISITED_CACHE)) return new Set();
  try { return new Set(JSON.parse(fs.readFileSync(VISITED_CACHE, 'utf8'))); } catch (_) { return new Set(); }
}

function saveCollectedUrls(urls) {
  fs.writeFileSync(URLS_CACHE, JSON.stringify([...urls], null, 2));
}

function loadCollectedUrls() {
  if (!fs.existsSync(URLS_CACHE)) return null;
  try { return new Set(JSON.parse(fs.readFileSync(URLS_CACHE, 'utf8'))); } catch (_) { return null; }
}

async function connectBrowser(retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔌 Connecting to Bright Data... (attempt ${i})`);
      const browser = await chromium.connectOverCDP(
        `wss://${AUTH}@brd.superproxy.io:9222`,
        { timeout: 60_000 }
      );
      console.log('✅ Connected');
      return browser;
    } catch (err) {
      console.error(`  ❌ Connection failed: ${err.message}`);
      if (i < retries) await new Promise(r => setTimeout(r, 5000));
      else throw err;
    }
  }
}

async function navigateSafe(page, url) {
  await page.goto(url, { timeout: 2 * 60 * 1000, waitUntil: 'domcontentloaded' });
  try {
    const client = await page.context().newCDPSession(page);
    const { status } = await client.send('Captcha.waitForSolve', { detectTimeout: 15_000 });
    if (status !== 'not_detected') console.log(`  🔓 Captcha solved: ${status}`);
  } catch (_) {}
  await page.waitForSelector('body', { timeout: 30_000 });
  await page.waitForTimeout(2000);
}

async function collectProductUrlsFromCategory(browser, startUrl) {
  const productUrls = new Set();
  let currentUrl = startUrl;
  let pageNum = 1;

  while (currentUrl) {
    console.log(`  📄 Page ${pageNum}: ${currentUrl}`);
    const page = await browser.newPage();
    try {
      await navigateSafe(page, currentUrl);
      const links = await parseProductLinks(page);
      console.log(`     Found ${links.length} product links`);
      links.forEach(l => productUrls.add(l));
      currentUrl = await getNextPageUrl(page);
      pageNum++;
    } catch (err) {
      console.error(`  ❌ Error on listing page: ${err.message}`);
      currentUrl = null;
    } finally {
      await page.close();
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  return productUrls;
}

async function scrapeProduct(getBrowser, productUrl) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await navigateSafe(page, productUrl);
      const product = await parseProductDetails(page, productUrl);
      await page.close();
      return product;
    } catch (err) {
      await page.close().catch(() => {});
      console.error(`  ⚠️  Attempt ${attempt} failed: ${err.message}`);
      if (err.message.includes('closed') || err.message.includes('disconnected')) {
        console.log('  🔄 Browser closed — reconnecting...');
        await getBrowser(true);
      }
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

async function scrape() {
  if (!AUTH || AUTH.includes('your_username')) {
    throw new Error('Set BRIGHT_DATA_AUTH in your .env file');
  }

  ensureOutputDir();
  console.log(`📁 Output folder: ${OUTPUT_DIR}\n`);

  let _browser = null;
  async function getBrowser(forceNew = false) {
    if (forceNew || !_browser) {
      if (_browser) { try { await _browser.close(); } catch (_) {} }
      _browser = await connectBrowser();
    }
    return _browser;
  }

  await getBrowser();

  // ── Phase 1: Collect all product URLs ──────────────────────
  let productUrls = loadCollectedUrls();

  if (productUrls) {
    console.log(`♻️  Resuming from cached URLs (${productUrls.size} URLs)\n`);
  } else {
    productUrls = new Set();
    for (const categoryUrl of CATEGORY_URLS) {
      console.log(`\n📂 Category: ${categoryUrl}`);
      try {
        const urls = await collectProductUrlsFromCategory(await getBrowser(), categoryUrl);
        console.log(`   ✅ ${urls.size} products found`);
        urls.forEach(u => productUrls.add(u));
        saveCollectedUrls(productUrls); // save after each category
      } catch (err) {
        console.error(`  ❌ Category failed: ${err.message}`);
      }
    }
    console.log(`\n✅ Total unique product URLs: ${productUrls.size}`);
    saveCollectedUrls(productUrls);
  }

  // ── Phase 2: Scrape each product page ──────────────────────
  const visited = loadVisited();
  if (visited.size > 0) {
    console.log(`♻️  Resuming — skipping ${visited.size} already scraped\n`);
  }

  let count = 0;
  const total = productUrls.size;

  for (const productUrl of productUrls) {
    if (visited.has(productUrl)) continue;
    count++;

    console.log(`\n🛒 [${count + visited.size}/${total}] ${productUrl}`);

    const product = await scrapeProduct(getBrowser, productUrl);

    if (product?.name) {
      saveProduct(product);
      rebuildPriceFile();
      visited.add(productUrl);
      saveVisited(visited);
      console.log(`  ✅ ${product.name} | SKU: ${product.sku} | Price: ${product.salePrice} | Stock: ${product.stockStatus}`);
    } else {
      console.log(`  ⚠️  Skipped (no product name)`);
      visited.add(productUrl);
      saveVisited(visited);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  if (_browser) await _browser.close();

  console.log(`\n🎉 Done! Scraped ${visited.size} products`);
  console.log(`   Full data  → ${FULL_OUTPUT}`);
  console.log(`   Price data → ${PRICE_OUTPUT}`);
}

scrape().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});