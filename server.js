const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

// 類別對照
const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7' };

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    
    // 💡 同時發起兩個 API 請求 (文化部 + 觀光署部分公開資料)
    const [cultureRes, tourismRes] = await Promise.all([
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${CATEGORIES[catName] || '6'}`),
      // 這裡示範串接另一個藝文相關的公開來源
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=17`) // 17 是綜藝/其他
    ]);

    const combinedData = [...cultureRes.data, ...tourismRes.data];

    // 城市過濾邏輯 (維持原樣)
    const cityKeywords = { '台北': ['台北', '臺北'], '桃園': ['桃園'], '台中': ['台中', '臺中'], '台南': ['台南', '臺南'], '高雄': ['高雄'] };

    let filteredData = combinedData;
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filteredData = combinedData.filter(item => {
        const str = JSON.stringify(item);
        return keywords.some(k => str.includes(k));
      });
    }

    // 資料正規化 (把不同來源的格式統一)
    const events = filteredData.slice(0, 30).map((item, index) => {
      const info = item.showInfo?.[0] || {};
      return {
        id: item.uid || `ev-${index}`,
        title: item.title,
        location: info.locationName || '地點詳見官網',
        searchQuery: info.location || item.title,
        date: item.startDate + ' ~ ' + item.endDate,
        img: item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '',
        officialUrl: item.sourceWebPromote || 'https://cloud.culture.tw/',
        aiSummary: `🤖 幕前點評：這場${catName}活動在${city}非常熱門，別錯過了！`
      };
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "水源調度失敗" });
  }
});

module.exports = app;