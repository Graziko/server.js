const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/api/events', async (req, res) => {
  try {
    // 取得前端傳來的地區參數，預設是「全部」
    const city = req.query.city || '';
    const url = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=6';
    const response = await axios.get(url);
    
    // 過濾資料：如果使用者選了地區，就只留下包含該地區名字的活動
    let filteredData = response.data;
    if (city && city !== '全部') {
      filteredData = response.data.filter(item => 
        item.showInfo[0]?.locationName.includes(city) || 
        item.showInfo[0]?.location.includes(city)
      );
    }

    const events = filteredData.slice(0, 10).map(item => {
      let aiRecommendation = "這是一個值得一看的展覽！";
      if (item.title.includes("館")) aiRecommendation = "✨ 亮點：適合全家出遊，室內場域不怕風吹日曬。";
      else if (item.title.includes("藝術")) aiRecommendation = "💡 推薦：視覺美感極佳，適合喜歡美學攝影的朋友。";

      return {
        title: item.title,
        location: item.showInfo[0]?.locationName || '地點待定',
        date: item.startDate + ' ~ ' + item.endDate,
        description: item.descriptionFilterHtml.substring(0, 90) + '...',
        aiSummary: aiRecommendation
      };
    });

    res.json(events);
    
  } catch (error) {
    res.status(500).json({ message: "抓取資料失敗" });
  }
});

module.exports = app;