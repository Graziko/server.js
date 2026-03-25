const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7', '市集': '15' };

app.get('/api/events', async (req, res) => {
  try {
    const today = new Date('2026-03-25');
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    
    const [res1, res2] = await Promise.all([
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${CATEGORIES[catName] || '6'}`),
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=17`)
    ]);

    const blacklist = ['線上 online', '付費課程', '認證班', '證照班', '培訓', '研習', '招生', '管理師'];

    let combined = [...res1.data, ...res2.data].filter(item => {
      if (!item.title || item.title.trim() === "") return false;
      const endDate = new Date(item.endDate);
      if (endDate < today) return false;
      const text = (item.title + (item.showInfo?.[0]?.locationName || '')).toLowerCase();
      return !blacklist.some(word => text.includes(word.toLowerCase()));
    });

    const cityKeywords = { '台北': ['台北', '臺北'], '桃園': ['桃園'], '台中': ['台中', '臺中'], '台南': ['台南', '臺南'], '高雄': ['高雄'] };

    let filtered = combined;
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filtered = combined.filter(item => keywords.some(k => JSON.stringify(item).includes(k)));
    }

    const events = filtered.slice(0, 32).map((item, index) => {
      const info = item.showInfo?.[0] || {};
      
      // 💡 絕對穩定的文化部詳情頁 (0% 404)
      const stableUrl = `https://cloud.culture.tw/frontsite/event/eventSearchAction.do?method=doDetailView&uid=${item.uid}`;
      
      // 💡 可能有坑的主辦方官網
      const riskyUrl = (item.sourceWebPromote || item.webSales || "").trim().replace(/==/g, '');

      return {
        id: item.uid || `ev-${index}`,
        title: item.title,
        location: (info.locationName || '地點詳見官網').replace(/=/g, ''),
        searchQuery: (info.location || item.title).replace(/=/g, ''),
        date: item.startDate + ' ~ ' + item.endDate,
        img: item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '',
        cultureUrl: stableUrl,
        organizerUrl: riskyUrl,
        tag: item.categoryName || catName
      };
    });

    res.json(events);
  } catch (error) { res.status(500).json({ error: "調度失敗" }); }
});

module.exports = app;