const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7', '市集': '17' };

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    const url = `https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${CATEGORIES[catName] || '6'}`;
    const response = await axios.get(url, { timeout: 8000 });
    
    const cityKeywords = { '台北': ['台北', '臺北'], '桃園': ['桃園'], '台中': ['台中', '臺中'], '台南': ['台南', '臺南'], '高雄': ['高雄'] };

    let filteredData = response.data;
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filteredData = response.data.filter(item => keywords.some(k => JSON.stringify(item).includes(k)));
    }

    const events = filteredData.slice(0, 24).map((item, index) => {
      const info = item.showInfo?.[0] || {};
      
      // 💡 精準網址選取邏輯：
      // 優先序：1. 推廣官網 -> 2. 售票官網 -> 3. 文化部該活動的專屬詳情頁
      const directUrl = item.sourceWebPromote || 
                        item.webSales || 
                        `https://cloud.culture.tw/frontsite/event/eventSearchAction.do?method=doDetailView&uid=${item.uid}`;
      
      return {
        id: item.uid || `ev-${index}`,
        title: item.title,
        location: info.locationName || '地點詳見官網',
        searchQuery: info.location || item.title,
        date: item.startDate + ' ~ ' + item.endDate,
        img: item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '',
        officialUrl: directUrl
      };
    });

    res.json(events);
  } catch (error) { res.status(500).json({ error: "抓取失敗" }); }
});

module.exports = app;