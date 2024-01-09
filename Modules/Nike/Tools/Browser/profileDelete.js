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
const createColorizedLogger = require('../../../../Functions/logger');
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
}

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
                if (!fs.existsSync(cookiesFilePath)) {
                  logger.error(`No active session for ${email}`);
                };

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
            await page.goto('https://www.nike.com/us/member/settings/', { waitUntil: 'networkidle2' });
            await page.waitForSelector('button[class="nds-btn css-ew3ocj btn-primary-dark  btn-md"]');
            await cursor.click('button[class="nds-btn css-ew3ocj btn-primary-dark  btn-md"]');
            await page.waitForSelector('h2[class="headline-3 mb3-sm mb9-lg css-1ook0yt enurkn00"]');
            logger.info(`Task ${taskid}: Checking Account...`);
                
            await smoothScrollToBottom(page);
            await smoothScrollToTop(page);
        } 

            try {
                logger.info(`Task ${taskid}: Navigating To Payment Page...`);
                await cursor.click('div[aria-label=" Payment Methods"]');
                await page.waitForSelector('div[class="no-payments"]', { timeout: 2500 });
                logger.info(`Task ${taskid}: No Payments Found..`);
                
            } catch (error) {
                logger.info(`Task ${taskid}: Deleting Saved Payment...`);
                await cursor.click('button[class="nds-btn underline d-sm-ib css-ve57e ex41m6f0 cta-primary-dark underline"]');
                await page.waitForSelector('button[class="nds-btn open-delete-modal-button mb6-sm mb0-md mr2-sm css-1d2mqbf ex41m6f0 btn-secondary-dark  btn-responsive"]');
                await cursor.click('button[class="nds-btn open-delete-modal-button mb6-sm mb0-md mr2-sm css-1d2mqbf ex41m6f0 btn-secondary-dark  btn-responsive"]');
                await page.waitForSelector('button[class="nds-btn mex-address-delete-button m1-sm mt0-md mb0-md css-f2fyoj ex41m6f0 btn-primary-dark  btn-responsive"]');
                await cursor.click('button[class="nds-btn mex-address-delete-button m1-sm mt0-md mb0-md css-f2fyoj ex41m6f0 btn-primary-dark  btn-responsive"]');
                await page.waitForSelector('div[class="no-payments"]');
                logger.info(`Task ${taskid}: Successfully Deleted Saved Payment...`);
            };

            try {
                logger.info(`Task ${taskid}: Navigating To Addresses Page...`);
                await cursor.click('div[aria-label=" Delivery Addresses"]');
                await page.waitForSelector('div[class="mex-delivery-addresses-empty"]', { timeout: 2500 });
                logger.info(`Task ${taskid}: No Addresses Found...`);

            } catch (error) {
                await cursor.click('button[aria-label="Edit Shipping Address"]');
                await page.waitForSelector('button[data-testid="cancel-button"]');
                await cursor.click('button[data-testid="cancel-button"]');
                await page.waitForSelector('button[data-testid="confirm-delete"]');
                await cursor.click('button[data-testid="confirm-delete"]');
                await page.waitForSelector('div[class="mex-delivery-addresses-empty"]');
                logger.info(`Task ${taskid}: Successfully Deleted Saved Address...`);
            };

            logger.info(`Task ${taskid}: Successfully Deleted Profile...`);
            await browser.close();

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