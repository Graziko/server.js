// ... 前面的設定維持不變 ...

const events = filteredData.slice(0, 20).map((item, index) => {
  let safeImg = item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '';
  
  // 💡 關鍵：根據分類給予關鍵字，讓圖片符合主題
  const keywords = { '視覺': 'art,gallery', '音樂': 'concert,music', '戲劇': 'theater,stage', '舞蹈': 'dance,ballet', '講座': 'library,lecture' };
  const tag = keywords[catName] || 'culture';
  
  return {
    id: item.uid,
    title: item.title,
    location: item.showInfo[0]?.locationName || '地點詳見官網',
    address: item.showInfo[0]?.location || '',
    date: item.startDate + ' ~ ' + item.endDate,
    img: safeImg,
    // 💡 這裡我們換成 Unsplash 隨機圖，並加入 index 確保每張圖的 ID 不同
    fallbackImg: `https://source.unsplash.com/featured/600x400?${tag}&sig=${index}`, 
    aiSummary: `🤖 幕前點評：這場${catName}活動在${city}非常熱門，建議提早規劃行程！`
  };
});

// ... 後面的 export 維持不變 ...