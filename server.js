const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    const url = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=6';
    
    const response = await axios.get(url, { timeout: 6000 });
    const allData = response.data;

    // 擴張城市清單
    const cityKeywords = {
      '台北': ['台北', '臺北', '信義', '中正', '松山', '中山', '北投', '士林', '內湖', '文山'],
      '桃園': ['桃園', '中壢', '平鎮', '八德', '楊梅', '蘆竹'],
      '新竹': ['新竹', '竹北', '竹東'],
      '台中': ['台中', '臺中', '西區', '北屯', '西屯', '南屯', '霧峰'],
      '台南': ['台南', '臺南', '永康', '安平', '中西區', '東區', '北區'],
      '高雄': ['高雄', '駁二', '左營', '三民', '鳳山', '鼓山']
    };

    let filteredData = allData;
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filteredData = allData.filter(item => {
        const itemString = JSON.stringify(item).toLowerCase();
        return keywords.some(k => itemString.includes(k.toLowerCase()));
      });
    }

    const events = filteredData.slice(0, 15).map(item => {
      // 這裡我們多抓了 imageUrl 欄位
      return {
        title: item.title,
        location: item.showInfo[0]?.locationName || '地點詳見官網',
        date: item.startDate + ' ~ ' + item.endDate,
        description: (item.descriptionFilterHtml || "").substring(0, 70) + '...',
        img: item.imageUrl || 'https://images.unsplash.com/photo-1514525253361-bee8a48790c3?w=500&q=80', // 如果沒圖，就給一張漂亮的預設圖
        aiSummary: item.title.includes("館") ? "🏛️ 推薦：室內優質展出，適合深度文藝愛好者。" : "✨ 推薦：當季熱門展覽，週末打卡首選！"
      };
    });

    res.json(events);
    
  } catch (error) {
    res.status(500).json({ error: "抓取失敗" });
  }
});

module.exports = app;