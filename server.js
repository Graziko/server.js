const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    // 💡 回到 category=6 (視覺藝術)，這是目前最穩定的資料量
    const url = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=6';
    
    // 設定 5 秒超時，避免網頁空等
    const response = await axios.get(url, { timeout: 5000 });
    const allData = response.data;

    // 💡 地區關鍵字對照表
    const cityKeywords = {
      '台北': ['台北', '臺北', '信義', '中正', '松山', '中山', '北投', '士林', '內湖', '文山'],
      '台中': ['台中', '臺中', '西區', '北屯', '西屯', '南屯', '龍井', '霧峰'],
      '高雄': ['高雄', '駁二', '左營', '三民', '鳳山', '前鎮', '鼓山', '美濃']
    };

    let filteredData = allData;
    
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filteredData = allData.filter(item => {
        // 把整筆資料變成字串來搜尋，準確率最高
        const itemString = JSON.stringify(item).toLowerCase();
        return keywords.some(k => itemString.includes(k.toLowerCase()));
      });
    }

    // 整理前 12 筆
    const events = filteredData.slice(0, 12).map(item => {
      let aiRecommendation = "🎨 幕前點評：視覺藝術展，適合放慢腳步、細細品味。";
      if (item.title.includes("館")) aiRecommendation = "🏛️ 幕前點評：室內展館，適合文藝午後，不怕天氣變化。";
      
      return {
        title: item.title,
        location: item.showInfo[0]?.locationName || '地點詳見官網',
        date: item.startDate + ' ~ ' + item.endDate,
        description: (item.descriptionFilterHtml || "").substring(0, 80) + '...',
        aiSummary: aiRecommendation
      };
    });

    res.json(events);
    
  } catch (error) {
    console.error("錯誤細節:", error.message);
    res.status(500).json({ error: "資料抓取超時，請稍後再試" });
  }
});

module.exports = app;