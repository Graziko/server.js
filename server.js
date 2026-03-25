const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

// 🎭 幕前 App API：抓取文化部資料並加入模擬 AI 摘要
app.get('/api/events', async (req, res) => {
  try {
    const url = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=6';
    const response = await axios.get(url);
    
    // 取前 6 筆資料進行處理
    const events = response.data.slice(0, 6).map(item => {
      // --- 🤖 這裡就是模擬 AI 的邏輯區塊 ---
      let aiRecommendation = "這是一個充滿靈魂的展覽，非常適合想要放鬆心情、換個風景的你。";
      
      if (item.title.includes("館")) {
        aiRecommendation = "✨ 亮點：室內場館不受天氣影響！適合帶家人一起去，或是想安靜吹冷氣看展的午後。";
      } else if (item.title.includes("藝術") || item.title.includes("美")) {
        aiRecommendation = "💡 推薦：視覺衝擊力很強！適合喜歡攝影、尋找靈感的文青，建議穿簡單的衣服去拍美照。";
      } else if (item.title.includes("特展")) {
        aiRecommendation = "🔥 限時注意：這是期間限定的特展，錯過可能就沒了，建議這週末就排進行程！";
      }
      // ----------------------------------

      return {
        title: item.title,
        location: item.showInfo[0]?.locationName || '地點待定',
        date: item.startDate + ' ~ ' + item.endDate,
        description: item.descriptionFilterHtml.substring(0, 90) + '...',
        aiSummary: aiRecommendation // 把模擬的 AI 點評塞進去
      };
    });

    res.json(events);
    
  } catch (error) {
    console.error("抓資料失敗：", error);
    res.status(500).json({ message: "伺服器暫時抓不到資料 😭" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ 幕前 App 已就緒！請造訪：http://localhost:${PORT}`);
});