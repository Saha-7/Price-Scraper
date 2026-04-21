// ─────────────────────────────────────────────────────────────
//  urls.js  —  Master store + category config
//
//  To add a new store:
//    1. Add a new entry to STORES array below
//    2. Create src/parsers/<storename>.js
//    3. That's it — scraper.js needs zero changes
// ─────────────────────────────────────────────────────────────

const STORES = [
  {
    name: 'Primeabgb',
    parser: require('./parsers/primeabgb'),
    categories: [
      { slug: 'cpu-processor',    url: 'https://www.primeabgb.com/buy-online-price-india/cpu-processor/' },
      // { slug: 'motherboards',     url: 'https://www.primeabgb.com/buy-online-price-india/motherboards/' },
      // { slug: 'graphic-cards',    url: 'https://www.primeabgb.com/buy-online-price-india/graphic-cards-gpu/' },
      // { slug: 'ram-memory',       url: 'https://www.primeabgb.com/buy-online-price-india/ram-memory/' },
      // { slug: 'ssd',              url: 'https://www.primeabgb.com/buy-online-price-india/ssd/' },
      // { slug: 'hard-drive',       url: 'https://www.primeabgb.com/buy-online-price-india/internal-hard-drive/' },
      // { slug: 'power-supply',     url: 'https://www.primeabgb.com/buy-online-price-india/power-supply-smps/' },
      // { slug: 'cpu-cooler',       url: 'https://www.primeabgb.com/buy-online-price-india/cpu-cooler/' },
      // { slug: 'cabinet',          url: 'https://www.primeabgb.com/buy-online-price-india/pc-cases-cabinet/' },
      // { slug: 'monitor',          url: 'https://www.primeabgb.com/buy-online-price-india/led-monitors/' },
    ],
  },

  // ── Add more stores below ────────────────────────────────────
  {
    name: 'MDComputers',
    parser: require('./parsers/mdcomputers'),
    categories: [
      { slug: 'cpu-processor', url: 'https://mdcomputers.in/catalog/processor' },
      // { slug: 'motherboards',  url: 'https://mdcomputers.in/catalog/motherboard' },
      // { slug: 'ram-memory',    url: 'https://mdcomputers.in/catalog/ram' },
    ],
  },
  {
    name: 'pickpcparts',
    parser: require('./parsers/pickpcparts'),
    categories: [
      { slug: 'cpu-processor', url: 'https://pickpcparts.in/processors/' },
     // { slug: 'motherboards',  url: '' },
      { slug: 'ram-memory',    url: 'https://pickpcparts.in/rams/' },
    //  { slug: 'graphic-cards', url: '' },
    //  { slug: 'storages',      url: '' },
    ],
  },

  // {
  //   name: 'vedant',
  //   parser: require('./parsers/vedant'),
  //   categories: [
  //     { slug: 'cpu-processor', url: 'https://www.vedantcomputers.com/...' },
  //   ],
  // },

  // {
  //   name: 'vedant',
  //   parser: require('./parsers/vedant'),
  //   categories: [
  //     { slug: 'cpu-processor', url: 'https://www.vedantcomputers.com/...' },
  //   ],
  // },

  // {
  //   name: 'vedant',
  //   parser: require('./parsers/vedant'),
  //   categories: [
  //     { slug: 'cpu-processor', url: 'https://www.vedantcomputers.com/...' },
  //   ],
  // },
];

module.exports = { STORES };