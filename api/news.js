const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rssUrl = 'https://www.ukrinform.ua/rss/tag-kiyiv';
  const converterUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const apiResponse = await fetch(converterUrl);
    if (!apiResponse.ok) {
      throw new Error(`RSS-to-JSON service responded with status: ${apiResponse.status}`);
    }
    const data = await apiResponse.json();

    if (data.items && data.items.length > 5) {
        data.items = data.items.slice(0, 5);
    }
    res.status(200).json(data);
  } catch (error) {
    console.error('RSS Fetch Error:', error);
    res.status(500).json({ message: 'Failed to fetch data from RSS feed' });
  }
};