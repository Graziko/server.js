const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7', '市集': '15' };

// 💡 檢查網址存活
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

    const blacklist = ['線上', '課程', '認證班', '培訓', '招生'];
    const seenTitles = new Set();

    let rawEvents = [...res1.data, ...res2.data].filter(item => {
      if (!item.title || seenTitles.has(item.title)) return false;
      const endDate = new Date(item.endDate);
      if (endDate < today) return false;
      const text = (item.title + (item.showInfo?.[0]?.locationName || '')).toLowerCase();
      if (blacklist.some(word => text.includes(word))) return false;
      seenTitles.add(item.title);
      return true;
    });

    // 💡 強化後的縣市關鍵字對應
    const cityKeywords = {
      '台北': ['台北', '臺北', '新北', '板橋', '淡水', '基隆', '華山', '松菸'],
      '桃園': ['桃園', '中壢', '青埔'],
      '新竹': ['新竹', '竹北', '竹南'],
      '台中': ['台中', '臺中', '西屯', '南屯', '歌劇院'],
      '嘉義': ['嘉義', '民雄'],
      '台南': ['台南', '臺南', '中西區', '奇美'],
      '高雄': ['高雄', '駁二', '衛武營', '左營'],
      '宜蘭': ['宜蘭', '羅東', '礁溪'],
      '花東': ['花蓮', '台東', '臺東']
    };

    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      rawEvents = rawEvents.filter(item => keywords.some(k => JSON.stringify(item).includes(k)));
    }

    const checkPromises = rawEvents.slice(0, 24).map(async (item) => {
      const info = item.showInfo?.[0] || {};
      const riskyUrl = (item.sourceWebPromote || item.webSales || "").trim().replace(/==/g, '');
      const backupUrl = `https://cloud.culture.tw/frontsite/event/eventSearchAction.do?method=doDetailView&uid=${item.uid}`;
      
      let finalUrl = backupUrl;
      if (riskyUrl.length > 25) {
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