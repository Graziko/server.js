const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '';
    // 💡 擴大水源：改用 category=all，把演唱會、市集、展覽全抓進來
    const url = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=all';
    
    // 加個超時設定，防止抓太久
    const response = await axios.get(url, { timeout: 8000 });
    let allData = response.data;

    // 💡 地區關鍵字對照表：解決「台/臺」和漏寫問題
    const cityKeywords = {
      '台北': ['台北', '臺北', '信義', '中正', '松山', '中山', '北投', '士林', '內湖', '文山'],
      '台中': ['台中', '臺中', '西區', '北屯', '西屯', '南屯', '龍井', '霧峰'],
      '高雄': ['高雄', '駁二', '左營', '三民', '鳳山', '前鎮', '鼓山', '美濃']
    };

    let filteredData = allData;
    if (city && city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filteredData = allData.filter(item => {
        const fullInfo = JSON.stringify(item.showInfo).toLowerCase() + item.title.toLowerCase();
        // 只要有一筆關鍵字對中，就顯示
        return keywords.some(k => fullInfo.includes(k));
      });
    }

    // 整理前 15 筆
    const events = filteredData.slice(0, 15).map(item => {
      // 根據標題自動生成推薦（模擬 AI）
      let aiRecommendation = "✨ 值得一去：這是本週精選活動，推薦給喜歡探索城市的你！";
      if (item.title.includes("市集")) aiRecommendation = "🥨 必逛：週末去踩踩點，順便買點文創小物或手作點心吧！";
      else if (item.title.includes("演唱")) aiRecommendation = "🎸 熱血：現場音樂最有感染力了，快約朋友一起去嗨一下！";
      else if (item.title.includes("展")) aiRecommendation = "🎨 提升美感：很適合安靜地欣賞，感受藝術家的創意與靈魂。";

      return {
        title: item.title,
        location: item.showInfo[0]?.locationName || item.showInfo[0]?.location || '地點詳見官網',
        date: item.startDate + ' ~ ' + item.endDate,
        description: (item.descriptionFilterHtml || "點擊查看詳情").substring(0, 90) + '...',
        aiSummary: aiRecommendation
      };
    });

    res.json(events);
    
  } catch (error) {
    console.error("抓資料出錯:", error.message);
    res.status(500).json({ message: "抓取資料失敗，請重新整理試試" });
  }
});

module.exports = app;