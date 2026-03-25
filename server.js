const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7', '市集': '15' };

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    const catId = CATEGORIES[catName] || '6';

    // 💡 同時從兩個水源抓資料，確保內容豐富度
    const [res1, res2] = await Promise.all([
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${catId}`, { timeout: 8000 }),
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=17`) // 17 是綜合類
    ]);

    // 💡 垃圾過濾黑名單：徹底消滅截圖中的詐騙與課程
    const blacklist = ['線上 online', '付費課程', '認證班', '證照班', '培訓', '證照', '說明會', '研習', '招生', '管理師', '證書'];

    let combined = [...res1.data, ...res2.data].filter(item => {
      const text = (item.title + (item.showInfo?.[0]?.locationName || '')).toLowerCase();
      return !blacklist.some(word => text.includes(word.toLowerCase()));
    });

    const cityKeywords = {
      '台北': ['台北', '臺北', '信義', '中正', '松山', '中山', '北投', '士林', '內湖', '文山', '華山', '松菸'],
      '桃園': ['桃園', '中壢', '青埔'],
      '台中': ['台中', '臺中', '草悟道', '歌劇院', '西區'],
      '台南': ['台南', '臺南', '神農街', '美術館'],
      '高雄': ['高雄', '駁二', '衛武營', '左營']
    };

    let filtered = combined;
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filtered = combined.filter(item => keywords.some(k => JSON.stringify(item).includes(k)));
    }

    const events = filtered.slice(0, 32).map((item, index) => {
      const info = item.showInfo?.[0] || {};
      // 💡 精準直達：優先官網，次要售票，最後才是文化部詳情頁
      const directUrl = item.sourceWebPromote || item.webSales || 
                        `https://cloud.culture.tw/frontsite/event/eventSearchAction.do?method=doDetailView&uid=${item.uid}`;
      
      return {
        id: item.uid || `ev-${index}`,
        title: item.title,
        location: (info.locationName || '地點詳見官網').replace(/=/g, ''),
        searchQuery: (info.location || item.title).replace(/=/g, ''),
        date: item.startDate + ' ~ ' + item.endDate,
        img: item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '',
        officialUrl: directUrl,
        tag: item.categoryName || catName
      };
    });

    res.json(events);
  } catch (error) { res.status(500).json({ error: "調度失敗" }); }
});

module.exports = app;