const Parser = require('rss-parser');
const parser = new Parser();

module.exports = async (req, res) => {
  // CORS Заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rssUrl = 'https://www.ukrinform.ua/rss/tag-kiyiv';
  
  try {
    let feed = await parser.parseURL(rssUrl);
    if (feed.items && feed.items.length > 5) {
        feed.items = feed.items.slice(0, 5);
    }
    res.status(200).json(feed);
  } catch (error) {
    console.error('RSS Parser Error:', error);
    res.status(500).json({ message: 'Failed to parse RSS feed' });
  }
};