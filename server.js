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

    const blacklist = ['線上 online', '付費課程', '認證班', '證照班', '培訓', '說明會', '研習', '招生', '管理師'];

    let combined = [...res1.data, ...res2.data].filter(item => {
      if (!item.title || item.title.trim() === "") return false;
      const endDate = new Date(item.endDate);
      if (endDate < today) return false;
      const text = (item.title + (item.showInfo?.[0]?.locationName || '')).toLowerCase();
      return !blacklist.some(word => text.includes(word.toLowerCase()));
    });

    const events = combined.slice(0, 32).map((item, index) => {
      const info = item.showInfo?.[0] || {};
      const promoteUrl = (item.sourceWebPromote || "").trim();
      const salesUrl = (item.webSales || "").trim();
      const backupUrl = `https://cloud.culture.tw/frontsite/event/eventSearchAction.do?method=doDetailView&uid=${item.uid}`;

      // 💡 確保網址絕對不為空的邏輯
      let finalUrl = backupUrl;
      const isDeepLink = (u) => u && u.length > 25 && u.includes('/');
      
      if (isDeepLink(promoteUrl)) finalUrl = promoteUrl;
      else if (isDeepLink(salesUrl)) finalUrl = salesUrl;

      return {
        id: item.uid || `ev-${index}`,
        title: item.title,
        location: (info.locationName || '地點詳見官網').replace(/=/g, ''),
        searchQuery: (info.location || item.title).replace(/=/g, ''),
        date: item.startDate + ' ~ ' + item.endDate,
        img: item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '',
        url: finalUrl.replace(/==/g, ''), // 💡 統一變數名稱為 url
        backupUrl: backupUrl,
        tag: item.categoryName || catName
      };
    });

    res.json(events);
  } catch (error) { res.status(500).json({ error: "調度失敗" }); }
});

module.exports = app;