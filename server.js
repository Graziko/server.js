const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

// 定義類別擴展
const CATEGORIES = { '視覺': '6', '音樂': '1', '戲劇': '2', '舞蹈': '3', '講座': '7', '市集': '17' };

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    const catId = CATEGORIES[catName] || '6';

    // 💡 同時抓取兩個不同的資料庫 (類別 A + 綜合類別 B)
    const [res1, res2] = await Promise.all([
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${catId}`, { timeout: 6000 }),
      axios.get(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=15`, { timeout: 6000 }) // 15 是獨立音樂與市集類
    ]);

    // 合併資料
    let combined = [...res1.data, ...res2.data];

    // 擴張後的城市關鍵字 (讓搜尋更靈敏)
    const cityKeywords = {
      '台北': ['台北', '臺北', '信義', '中正', '松山', '中山', '北投', '士林', '內湖', '文山', '華山', '松菸'],
      '桃園': ['桃園', '中壢', '青埔'],
      '台中': ['台中', '臺中', '西區', '草悟道', '歌劇院'],
      '台南': ['台南', '臺南', '神農街', '美術館'],
      '高雄': ['高雄', '駁二', '衛武營', '左營']
    };

    let filtered = combined;
    if (city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filtered = combined.filter(item => {
        const itemStr = JSON.stringify(item);
        return keywords.some(k => itemStr.includes(k));
      });
    }

    // 排序：讓近期的活動排在前面
    filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const events = filtered.slice(0, 40).map((item, index) => {
      const info = item.showInfo?.[0] || {};
      const directUrl = item.sourceWebPromote || item.webSales || 
                        `https://cloud.culture.tw/frontsite/event/eventSearchAction.do?method=doDetailView&uid=${item.uid}`;
      
      return {
        id: item.uid || `ev-${index}`,
        title: item.title,
        location: info.locationName || '地點詳見官網',
        searchQuery: info.location || item.title,
        date: item.startDate.replace(/\//g, '-') + ' ~ ' + item.endDate.replace(/\//g, '-'),
        img: item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '',
        officialUrl: directUrl,
        // 加入標籤
        tag: item.categoryName || catName
      };
    });

    res.json(events);
  } catch (error) { res.status(500).json({ error: "調度失敗" }); }
});

module.exports = app;