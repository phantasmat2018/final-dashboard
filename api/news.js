const Parser = require('rss-parser');
const parser = new Parser();

module.exports = async (req, res) => {
  // Дозволяємо запити з будь-якого джерела (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // НОВЕ ПОСИЛАННЯ НА RSS-СТРІЧКУ
  const FEED_URL = 'https://kyiv24.news/feed';

  try {
    // Використовуємо простий метод, який добре працює зі стандартними стрічками
    const feed = await parser.parseURL(FEED_URL);
    
    // Відправляємо клієнту 10 останніх новин
    res.status(200).json({ items: feed.items.slice(0, 10) });

  } catch (error) {
    console.error('RSS feed parsing error:', error);
    res.status(500).json({ message: 'Failed to fetch or parse RSS feed' });
  }
};