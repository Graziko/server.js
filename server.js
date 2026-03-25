const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7', '市集': '15' };

// 檢查網址存活
async function isUrlLive(url) {
  if (!url || url.includes('cloud.culture.tw')) return true;
  try {
    const response = await axios.head(url, { timeout: 1200, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return response.status >= 200 && response.status < 400;
  } catch (e) { return false; }
}

app.get('/api/events', async (req, res) => {
  try {
    const today = new Date('2026-03-25');
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    
    const [res1, res2] = await Promise.all([
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${CATEGORIES[catName] || '6'}`),
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=17`)
    ]);

    const blacklist = ['線上', '付費課程', '認證班', '證照班', '培訓', '研習', '招生', '管理師'];
    
    // 💡 核心：標題去重器
    const seenTitles = new Set();

    let rawEvents = [...res1.data, ...res2.data].filter(item => {
      if (!item.title || seenTitles.has(item.title)) return false; 
      const endDate = new Date(item.endDate);
      if (endDate < today) return false;
      const text = (item.title + (item.showInfo?.[0]?.locationName || '')).toLowerCase();
      const isBad = blacklist.some(word => text.includes(word.toLowerCase()));
      if (!isBad) {
        seenTitles.add(item.title); // 記住這個標題，下次出現就踢掉
        return true;
      }
      return false;
    });

    // 城市過濾
    const cityKeywords = { '台北': ['台北', '臺北'], '台中': ['台中', '臺中'], '高雄': ['高雄'] };
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      rawEvents = rawEvents.filter(item => keywords.some(k => JSON.stringify(item).includes(k)));
    }

    const checkPromises = rawEvents.slice(0, 24).map(async (item) => {
      const info = item.showInfo?.[0] || {};
      const backupUrl = `https://cloud.culture.tw/frontsite/event/eventSearchAction.do?method=doDetailView&uid=${item.uid}`;
      let finalUrl = backupUrl;
      const riskyUrl = (item.sourceWebPromote || item.webSales || "").trim().replace(/==/g, '');

      if (riskyUrl && riskyUrl.length > 25) {
        const live = await isUrlLive(riskyUrl);
        if (live) finalUrl = riskyUrl;
        else return null; 
      }

      return {
        id: item.uid,
        title: item.title,
        location: (info.locationName || '地點詳見官網').replace(/=/g, ''),
        searchQuery: (info.location || item.title).replace(/=/g, ''),
        date: item.startDate + ' ~ ' + item.endDate,
        img: item.imageUrl || '', 
        url: finalUrl
      };
    });

    const results = await Promise.all(checkPromises);
    res.json(results.filter(e => e !== null));
  } catch (error) { res.status(500).json({ error: "調度失敗" }); }
});

module.exports = app;