const fs = require('fs');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');



const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const createColorizedLogger = require('../../../Functions/logger');
const logger = createColorizedLogger();


async function smoothScrollToBottom(page) {
    await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
        let totalHeight = 0;
        let distance = 100;
        const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
    
        if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
        }
    }, 100);
});
});
}
    
async function smoothScrollToTop(page) {
    await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
        let currentPosition = window.pageYOffset || document.documentElement.scrollTop;
        const timer = setInterval(() => {
         if(currentPosition <= 0) {
            clearInterval(timer);
            resolve();
        }
            window.scrollBy(0, -100);
            currentPosition -= 100;
        }, 100);
    });
});
}


class PromisePool {
    constructor(maxConcurrent) {
      this.maxConcurrent = maxConcurrent;
      this.currentConcurrent = 0;
      this.waiting = [];
    }
  
    async add(promiseFunction) {
      if (this.currentConcurrent >= this.maxConcurrent) {
        await new Promise(resolve => this.waiting.push(resolve));
      }
      this.currentConcurrent++;
      try {
        return await promiseFunction();
      } finally {
        this.currentConcurrent--;
        if (this.waiting.length > 0) {
          const next = this.waiting.shift();
          next();
        }
      }
    }
  }



const launchBrowser = async (browserName, ip, port) => {
    let browser;
    let options = {
        args: [
            '--disable-infobars',
            '--disable-blink-features=AutomationControlled',
            `--proxy-server=http://${ip}:${port}`
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        headless: false,
        defaultViewport: null
    };

    switch (browserName) {
        case 'Google Chrome':
            options.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
            break;
        case 'Brave':
            options.executablePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
            break;
        case 'Microsoft Edge':
            options.executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
            break;

        default:
            throw new Error(`Unsupported browser: ${browserName}`);
    }

    browser = await puppeteer.launch(options);

    return browser;
};



const run = async () => {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'browsersCount',
            message: 'How many browsers do you want to open?',
            validate: function (value) {
              const valid = !isNaN(parseFloat(value));
              return valid || 'Please enter a number';
            },
            filter: Number,
        },
        {
            type: 'confirm',
            name: 'useAttachedProxies',
            message: 'Do you want to use the proxies attached to the accounts?',
            default: false
        }
    ]);

    const browsersCount = answers.browsersCount;
    const useAttachedProxies = answers.useAttachedProxies;
    const pool = new PromisePool(browsersCount);
    const directory = path.join(os.homedir(), 'Toolbox');
    const proxiesPath = path.join(directory, 'proxies.txt');
    let proxiesData = fs.readFileSync(proxiesPath, 'utf8').split('\n');
    let proxies = [];

    proxiesData.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            proxies.push(line);
        }
    });
    const nikeAccountsPath = path.join(directory, 'nikeAccounts.txt');
    if (!fs.existsSync(nikeAccountsPath)) {
      logger.error('Missing nikeAccounts.txt...');
      process.exit(1);
    }
    const nikeAccountsData = fs.readFileSync(nikeAccountsPath, 'utf8').split('\n');
    const promises = nikeAccountsData.map(async (line, index) => {
        if (line) {
            return pool.add(async () => {
                const taskid = uuidv4();
                let [ email, password, ip, port, username, passwordProxy ] = line.split(':');
                let proxy;
                if (useAttachedProxies && ip && port && username && passwordProxy) {
                    proxy = [ip, port, username, passwordProxy].join(':');
                } else {
                    const randomIndex = Math.floor(Math.random() * proxies.length);
                    proxy = proxies[randomIndex];
                    [ip, port, username, passwordProxy] = proxy.split(':');
                }
                const dirName = path.join(directory, 'Nike Sessions', email.split('@')[0]);
                const cookiesFilePath = path.join(dirName, 'cookies.json');

    const browser = await launchBrowser(settings.browserName, ip, port);
    const page = await browser.newPage();
    const cursor = createCursor(page)
            
    await page.authenticate({
        username: username,
        password: passwordProxy
    });
            
    await page.evaluateOnNewDocument(() => {
        console.log = () => {};
    });
            
    page.setDefaultNavigationTimeout(100000);

        if (fs.existsSync(cookiesFilePath)) {
            const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
            const localStorage = fs.readFileSync(path.join(dirName, 'localStorage.json'), 'utf8');
            const sessionStorage = fs.readFileSync(path.join(dirName, 'sessionStorage.json'), 'utf8');

            await page.setCookie(...cookies);
            await page.evaluate(savedLocalStorage => { localStorage = JSON.parse(savedLocalStorage); }, localStorage);
            await page.evaluate(savedSessionStorage => { sessionStorage = JSON.parse(savedSessionStorage); }, sessionStorage);

            logger.info(`Task ${taskid}: Navigating to Accounts Page...`);
            await page.goto('https://nike.com/member/settings', { waitUntil: 'networkidle2' });
            await page.waitForSelector('button[type="submit"]');
            await cursor.click('button[type="submit"]');
            await page.waitForSelector('div[class="mex-nav-item "]');
            logger.info(`Task ${taskid}: Checking Account...`);
                
            await smoothScrollToBottom(page);
            await smoothScrollToTop(page);
            const editButton = await page.$('div.ncss-col-sm-6 button[aria-label="Edit Mobile Number"]');
            const addButton = await page.$('div.ncss-col-sm-6 button[aria-label="Add Mobile Number"]');
        
            if (addButton) {
                logger.error(`Task ${taskid}: Phone Not Verified...`);
                await browser.close();
                return;
        
            } else if (editButton) {
                logger.verbose(`Task ${taskid}: Phone Verified...`);
            }
        }

        try {
            logger.info(`Task ${taskid}: Generating Activity...`);
            await page.hover('a[aria-label="Men"]');
            await cursor.click('a[data-type="click_navShoppingMenu"]');
            await page.waitForSelector('a[aria-label="Filter for Men"]');
            const elements = await page.$$('div[data-testid="product-card"]');
        
            if (elements.length < 15) {
                throw new Error('There are less than 15 elements!');
            }
        
            const randomIndex = Math.floor(Math.random() * 15);
            await elements[randomIndex].click();
        
        } catch (error) {
            logger.error(`Task ${taskid}: Error Generating Shopping Activity...`);
        }


        try {
            await page.goto('https://www.nike.com/orders/details/', { waitUntil: 'domcontentloaded' });
            await Promise.race([
                page.waitForSelector('div[class="sse-order-summary-page"]'),
                page.waitForSelector('div[class="css-rumwow sse-no-orders"]')
            ]);

            await new Promise(resolve => setTimeout(resolve, 2500));
            await page.goto('https://www.nike.com/member/settings/', { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('div[class="mex-nav-item "]');
            await new Promise(resolve => setTimeout(resolve, 2500));

        } catch (error) {
            logger.error(`Task ${taskid}: Error Checking Orders...`);
            await browser.close();
            return;
        };


            try {
                if (!fs.existsSync(dirName)) {
                    fs.mkdirSync(dirName, { recursive: true });
                }
            
                const client = await page.target().createCDPSession();
                await client.send('Network.enable');
                const { cookies } = await client.send('Network.getAllCookies');
                const localStorageData = await page.evaluate(() => {
                    let json = {};
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      json[key] = localStorage.getItem(key);
                    }
                    return json;
                });

                const sessionStorageData = await page.evaluate(() => {
                    let json = {};
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        json[key] = sessionStorage.getItem(key);
                    }
                    return json;
                });
                const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
                const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
                fs.writeFileSync(path.join(dirName, 'cookies.json'), JSON.stringify(cookies, null, 2));
                fs.writeFileSync(path.join(dirName, 'localStorage.json'), JSON.stringify(localStorageData, null, 2));
                fs.writeFileSync(path.join(dirName, 'sessionStorage.json'), JSON.stringify(sessionStorageData, null, 2));

                logger.verbose(`Task ${taskid}: Session Successfully Restored...`);
                await browser.close();
            } catch (error) {
                logger.error(`Task ${taskid}: Error Storing Account Session...`);
            }

            if (index < nikeAccountsData.length - 1) {
                logger.http(`Task ${taskid}: Looping Task In 15s...`);
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        });
    }
})
    await Promise.all(promises);
};
    
module.exports.run = run;