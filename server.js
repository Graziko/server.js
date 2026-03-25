const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CATEGORIES = {
  '視覺': '6',
  '音樂': '1',
  '戲劇': '2',
  '舞蹈': '3',
  '講座': '7'
};

app.get('/api/events', async (req, res) => {
  try {
    const city = req.query.city || '全部';
    const catName = req.query.category || '視覺';
    const catId = CATEGORIES[catName] || '6';

    const url = `https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${catId}`;
    const response = await axios.get(url, { timeout: 8000 });
    const allData = response.data;

    const cityKeywords = {
      '台北': ['台北', '臺北', '信義', '中正', '松山', '中山', '北投', '士林', '內湖', '文山'],
      '桃園': ['桃園', '中壢', '平鎮', '八德', '楊梅', '蘆竹'],
      '新竹': ['新竹', '竹北', '竹東'],
      '台中': ['台中', '臺中', '西區', '北屯', '西屯', '南屯', '霧峰'],
      '台南': ['台南', '臺南', '永康', '安平', '中西區', '東區', '北區'],
      '高雄': ['高雄', '駁二', '左營', '三民', '鳳山', '鼓山']
    };

    let filteredData = allData;
    if (city && city !== '全部') {
      const keywords = cityKeywords[city] || [city];
      filteredData = allData.filter(item => {
        const itemString = JSON.stringify(item).toLowerCase();
        return keywords.some(k => itemString.includes(k.toLowerCase()));
      });
    }

    const events = filteredData.slice(0, 18).map((item, index) => {
      let safeImg = item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '';
      return {
        id: item.uid || `event-${index}`,
        title: item.title,
        location: item.showInfo[0]?.locationName || '地點詳見官網',
        address: item.showInfo[0]?.location || '',
        date: item.startDate + ' ~ ' + item.endDate,
        img: safeImg,
        aiSummary: `🤖 幕前點評：這場${catName}活動在${city}非常熱門，建議提早規劃行程！`
      };
    });

    res.json(events);
    
  } catch (error) {
    res.status(500).json({ error: "抓取失敗" });
  }
});

module.exports = app;