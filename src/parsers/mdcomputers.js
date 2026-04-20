// ─────────────────────────────────────────────────────────────
//  parsers/mdcomputers.js
//  MDComputers uses a custom storefront (not WooCommerce)
//  so selectors will differ from primeabgb.
//
//  STATUS: Placeholder — fill in selectors after inspecting
//          the live site HTML with browser DevTools.
// ─────────────────────────────────────────────────────────────

async function parseProductLinks(page) {
  return await page.evaluate(() => {
    const links = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      // TODO: update this filter for mdcomputers product URL pattern
      // Example: if product URLs contain '/product/' or '/p/'
      if (href.includes('mdcomputers.in') && href.includes('/p/')) {
        links.add(href.split('?')[0]);
      }
    });
    return [...links];
  });
}

async function getNextPageUrl(page) {
  return await page.evaluate(() => {
    // TODO: update selector for mdcomputers pagination
    const next = document.querySelector('a.next, a[rel="next"], .pagination .next a');
    return next ? next.href : null;
  });
}

async function parseProductDetails(page, url) {
  return await page.evaluate((pageUrl) => {
    const getText = (selector) =>
      document.querySelector(selector)?.innerText?.trim() || null;

    // TODO: inspect mdcomputers product page and fill these in
    const name         = getText('h1') || getText('.product-name');
    const sku          = getText('.sku, .product-code') || null;
    const salePrice    = getText('.price, .offer-price, .sale-price') || null;
    const originalPrice = getText('.old-price, .mrp, .strike') || null;
    const stockStatus  = getText('.stock-status, .availability') || null;
    const category     = getText('.breadcrumb li:last-child') || null;

    const images = [...document.querySelectorAll('.product-image img, .gallery img')]
      .map(img => img.src || img.getAttribute('data-src'))
      .filter(Boolean);

    const specs = {};
    document.querySelectorAll('.specs tr, .product-specs tr').forEach(row => {
      const key   = row.querySelector('td:first-child, th')?.innerText?.trim();
      const value = row.querySelector('td:last-child, td:nth-child(2)')?.innerText?.trim();
      if (key && value && key !== value) specs[key] = value;
    });

    return {
      url: pageUrl,
      store: 'mdcomputers',
      name,
      sku,
      category,
      stockStatus,
      salePrice,
      originalPrice,
      discountBadge: null,
      shortDescription: null,
      tags: [],
      images,
      specs,
      scrapedAt: new Date().toISOString(),
    };
  }, url);
}

module.exports = { parseProductLinks, getNextPageUrl, parseProductDetails };