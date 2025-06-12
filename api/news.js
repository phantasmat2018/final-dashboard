const Parser = require('rss-parser');
const fetch = require('node-fetch');
const iconv = require('iconv-lite');

const parser = new Parser();

module.exports = async (req, res) => {
  // Дозволяємо запити з будь-якого джерела (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const FEED_URL = 'https://kiev.pravda.com/rss/view_news/';

  try {
    // 1. Завантажуємо стрічку як набір байтів (буфер)
    const response = await fetch(FEED_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }
    const buffer = await response.buffer();

    // 2. Декодуємо буфер з кодування windows-1251 у рядок UTF-8
    const xmlString = iconv.decode(buffer, 'windows-1251');

    // 3. Парсимо вже декодований рядок
    const feed = await parser.parseString(xmlString);
    
    // Відправляємо клієнту 10 останніх новин
    res.status(200).json({ items: feed.items.slice(0, 10) });

  } catch (error) {
    console.error('RSS feed processing error:', error);
    res.status(500).json({ message: 'Failed to fetch or process RSS feed' });
  }
};