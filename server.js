const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7', '市集': '17' };

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    const catId = CATEGORIES[catName] || '6';

    const url = `https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${catId}`;
    const response = await axios.get(url, { timeout: 8000 });
    const allData = response.data;

    const cityKeywords = { '台北': ['台北', '臺北'], '桃園': ['桃園'], '台中': ['台中', '臺中'], '台南': ['台南', '臺南'], '高雄': ['高雄'] };

    let filteredData = allData;
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filteredData = allData.filter(item => keywords.some(k => JSON.stringify(item).includes(k)));
    }

    const events = filteredData.slice(0, 24).map((item, index) => {
      const info = item.showInfo?.[0] || {};
      // 💡 確保抓到正確的官網，如果沒有就去搜尋該活動標題
      const webUrl = item.sourceWebPromote || `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;
      
      return {
        id: item.uid || `ev-${index}`,
        title: item.title,
        location: info.locationName || '地點詳見官網',
        searchQuery: info.location || item.title,
        date: item.startDate + ' ~ ' + item.endDate,
        img: item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '',
        officialUrl: webUrl,
        aiSummary: `🤖 幕前點評：這場${catName}在${city}非常推薦！`
      };
    });

    res.json(events);
  } catch (error) { res.status(500).json({ error: "抓取失敗" }); }
});

module.exports = app;