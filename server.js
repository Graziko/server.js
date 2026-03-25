const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '';
    // 🎭 這裡我們擴大範圍：category=6 是視覺藝術，我們改用 all 抓更多，或者維持 6 但處理台/臺
    const url = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=all=6';
    const response = await axios.get(url);
    
    let filteredData = response.data;

    if (city && city !== '全部') {
      // 💡 關鍵：把「台」換成「臺」來搜尋，或者兩者都搜
      const searchCity = city.replace('台', '臺'); 
      
      filteredData = response.data.filter(item => {
        const locationName = item.showInfo[0]?.locationName || "";
        const location = item.showInfo[0]?.location || "";
        // 同時檢查「台」跟「臺」
        return locationName.includes(city) || locationName.includes(searchCity) ||
               location.includes(city) || location.includes(searchCity);
      });
    }

    // 我們多抓一點，展示 10 筆
    const events = filteredData.slice(0, 10).map(item => {
      let aiRecommendation = "這是一個值得一看的展覽！";
      if (item.title.includes("館")) aiRecommendation = "✨ 點評：室內場館，適合想安靜吹冷氣看展的午後。";
      else if (item.title.includes("特展")) aiRecommendation = "🔥 點評：期間限定，錯過就沒了，建議這週末去！";

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