async function parseProductLinks(page) {
  return await page.evaluate(() => {
    const links = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (href.includes('pickpcparts.in/processors/') ||
          href.includes('pickpcparts.in/storages/') ||
          href.includes('pickpcparts.in/graphics_cards/') ||
          href.includes('pickpcparts.in/rams/') ||
          href.includes('pickpcparts.in/motherboards/')) {
        links.add(href.split('?')[0]);
      }
    });
    return [...links];
  });
}

async function getNextPageUrl(page) {
  return await page.evaluate(() => {
    const next = document.querySelector('a.next, .ct-pagination a[rel="next"]');
    return next ? next.href : null;
  });
}

async function parseProductDetails(page, url) {
  return await page.evaluate((pageUrl) => {
    const getText = (selector) =>
      document.querySelector(selector)?.innerText?.trim() || null;

    // ── Name ──────────────────────────────────────────────────
    const name = getText('h1.elementor-heading-title') || getText('h1');

    // ── Category from URL ─────────────────────────────────────
    const urlParts = pageUrl.split('/');
    const category = urlParts[urlParts.length - 2] || null;

    // ── Retailer prices table ─────────────────────────────────
    // table.pcpps-price-table has: Retailer | Price | Availability | Buy | Last Checked
    const retailerPrices = [];
    document.querySelectorAll('table.pcpps-price-table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const retailer   = cells[0]?.innerText?.trim();
        const price      = cells[1]?.innerText?.trim();
        const available  = cells[2]?.innerText?.trim();
        const buyLink    = cells[3]?.querySelector('a')?.href || null;
        const lastChecked = cells[4]?.innerText?.trim() || null;
        if (retailer && price) {
          retailerPrices.push({ retailer, price, available, buyLink, lastChecked });
        }
      }
    });

    // ── Lowest price across retailers ─────────────────────────
    const lowestPrice = retailerPrices.length
      ? retailerPrices.reduce((a, b) => {
          const aVal = parseFloat(a.price.replace(/[^0-9.]/g, ''));
          const bVal = parseFloat(b.price.replace(/[^0-9.]/g, ''));
          return aVal < bVal ? a : b;
        })
      : null;

    // ── Specifications ────────────────────────────────────────
    // Elementor layout: label in one e-con, value in sibling e-con
    // Pattern: parent container has 2 child containers — [label][value]
    const specs = {};
    document.querySelectorAll('.e-con-full.e-flex.e-con.e-child').forEach(container => {
      const children = container.querySelectorAll(':scope > .e-con-full');
      if (children.length === 2) {
        const keyEl   = children[0].querySelector('strong, p');
        const valueEl = children[1].querySelector('.elementor-widget-container');
        if (keyEl && valueEl) {
          const key   = keyEl.innerText.replace(':', '').trim();
          const value = valueEl.innerText.trim();
          if (key && value && value !== '–' && key !== value) {
            specs[key] = value;
          }
        }
      }
    });

    // ── Part IDs (can be multiple) ────────────────────────────
    // From specs object
    const partIds = specs['Part ID']
      ? specs['Part ID'].split('\n').map(s => s.replace('•', '').trim()).filter(Boolean)
      : [];

    // ── Price history from Chart.js script ────────────────────
    let priceHistory = null;
    document.querySelectorAll('script').forEach(script => {
      if (script.textContent.includes('pcpps_ph_')) {
        const match = script.textContent.match(/var data = ({.*?});/s);
        if (match) {
          try {
            const chartData = JSON.parse(match[1]);
            priceHistory = {
              labels: chartData.labels,
              datasets: chartData.datasets?.map(d => ({
                retailer: d.label,
                data: d.data,
              }))
            };
          } catch (_) {}
        }
      }
    });

    // ── Amazon link ───────────────────────────────────────────
    const amazonLink = document.querySelector('a[href*="amzn.to"], a[href*="amazon.in"]')?.href || null;

    return {
      url: pageUrl,
      store: 'pickpcparts',
      name,
      category,
      partIds,           // array — multiple Part IDs supported
      retailerPrices,    // array of {retailer, price, available, buyLink, lastChecked}
      lowestPrice: lowestPrice ? { retailer: lowestPrice.retailer, price: lowestPrice.price } : null,
      specs,
      priceHistory,      // full Chart.js data with labels + per-retailer history
      amazonLink,
      scrapedAt: new Date().toISOString(),
    };
  }, url);
}

module.exports = { parseProductLinks, getNextPageUrl, parseProductDetails };