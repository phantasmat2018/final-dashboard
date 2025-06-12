const Parser = require('rss-parser');
const parser = new Parser();

module.exports = async (req, res) => {
  // CORS Заголовки для сумісності з браузерами
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Пряме посилання на RSS-потік
  const rssUrl = 'https://www.ukrinform.ua/rss/tag-kiyiv';
  
  try {
    // Використовуємо rss-parser для отримання та перетворення RSS
    let feed = await parser.parseURL(rssUrl);

    // Обрізаємо до 5 новин, якщо їх більше
    if (feed.items && feed.items.length > 5) {
        feed.items = feed.items.slice(0, 5);
    }
    
    // Надсилаємо успішну відповідь
    res.status(200).json(feed);

  } catch (error) {
    console.error('RSS Parser Error:', error);
    res.status(500).json({ message: 'Failed to parse RSS feed' });
  }
};