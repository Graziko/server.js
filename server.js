// ... 前面 Express 設定維持不變 ...

    const events = filteredData.slice(0, 20).map((item, index) => {
      let safeImg = item.imageUrl ? item.imageUrl.replace('http://', 'https://') : '';
      
      // 💡 修正地點抓取邏輯
      const info = item.showInfo[0] || {};
      const locName = info.locationName || '';
      const locAddr = info.location || '';
      
      // 如果地點名稱跟詳細地址一模一樣，就只顯示一個，避免重複
      // 並且確保不會出現「空地點 = 空地址」的情況
      let fullLocation = locName;
      if (locAddr && locAddr !== locName) {
          fullLocation = `${locName} (${locAddr})`;
      }

      return {
        id: item.uid || `event-${index}`,
        title: item.title,
        location: fullLocation || '地點詳見官網',
        // 為了地圖搜尋準確，我們保留一個純粹的地址字串
        searchQuery: locAddr || locName || item.title,
        date: item.startDate + ' ~ ' + item.endDate,
        img: safeImg,
        aiSummary: `🤖 幕前點評：這場${catName}活動在${city}非常熱門，建議提早規劃行程！`
      };
    });

// ... 後面 res.json 維持不變 ...