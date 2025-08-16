const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_TOKEN = "mySuperSecret123!";

app.use(express.json());

const pairUrls = {
  'EURUSD': 'https://www.investing.com/currencies/eur-usd',
  'GBPUSD': 'https://www.investing.com/currencies/gbp-usd',
  'USDJPY': 'https://www.investing.com/currencies/usd-jpy',
  'AUDUSD': 'https://www.investing.com/currencies/aud-usd'
};

app.post('/fetch-forex', async (req, res) => {
  const token = req.headers['x-api-key'];
  if (token !== SECRET_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  const pair = req.body.pair;
  const url = pairUrls[pair];
  if (!url) return res.status(400).json({ error: 'Pair not supported' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForSelector('span[data-test="instrument-price-last"]', { timeout: 60000 });
    const price = await page.$eval('span[data-test="instrument-price-last"]', el => el.textContent.trim());

    await browser.close();

    res.json({ pair, price, source: 'automation', time: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch forex prices', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Forex automation server listening on port ${PORT}`);
});
