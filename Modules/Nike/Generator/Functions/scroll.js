async function smoothScrollToBottom(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
  
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }
  
  async function smoothScrollToTop(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let currentPosition = window.pageYOffset || document.documentElement.scrollTop;
        const timer = setInterval(() => {
          if (currentPosition <= 0) {
            clearInterval(timer);
            resolve();
          }
          window.scrollBy(0, -100);
          currentPosition -= 100;
        }, 100);
      });
    });
  }
  
  module.exports = { smoothScrollToBottom, smoothScrollToTop };  