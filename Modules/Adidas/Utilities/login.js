const fs = require('fs');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');
const createColorizedLogger = require('../../../Functions/logger');
const logger = createColorizedLogger();


async function clickButtonAndWaitForIframe(page, cursor) {
    while (true) {
        await cursor.click('button[data-auto-id="login-submit-button"]');
            try {
                await page.waitForSelector('iframe[id="sec-text-if"]', { timeout: 10000 });
                logger.debug(`Task ${taskid}: Handling Challenge...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
                const isSuccess = await challengeCheck(page);

                if (isSuccess) {
                    await cursor.click('button[data-auto-id="login-submit-button"]');
                }
                break;

            } catch (error) {
                break;
            }
        }
    }
                        
async function challengeCheck(page) {
    const cookies = await page.cookies();
    const pageUrl = await page.url();
    const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    const headers = {
        'authority': 'www.adidas.com',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'cookie': cookieString,
        'referer': pageUrl,
        'sec-ch-ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
        'x-instana-l': '1,correlationType=web;correlationId=c50c02f17b4c9a49',
        'x-instana-s': 'c50c02f17b4c9a49',
        'x-instana-t': 'c50c02f17b4c9a49'
    };
    const startTime = Date.now();
    while (Date.now() - startTime < 45000) {
        const response = await fetch('https://www.adidas.com/_sec/cp_challenge/verify', { headers });
        const text = await response.text();
        const data = JSON.parse(text);
        if (data.success == 'true') {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return false;
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
    const answer = await inquirer.prompt({
        type: 'input',
        name: 'browsersCount',
        message: 'How many browsers do you want to open?',
        validate: function (value) {
          const valid = !isNaN(parseFloat(value));
          return valid || 'Please enter a number';
        },
        filter: Number,
      });

    const browsersCount = answer.browsersCount;
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

    if (proxies.length === 0) {
        logger.error('No Proxies Found...');
        return;
      }

    const adidasAccountsPath = path.join(directory, 'adidasAccounts.txt');

        if (!fs.existsSync(adidasAccountsPath)) {
            logger.error('Missing adidasAccounts.txt...');
            process.exit(1);
        }

    let accountsData = fs.readFileSync(adidasAccountsPath, 'utf8').split('\n');
    accountsData = accountsData.filter(line => line.trim() !== '');

    const promises = accountsData.map(async (line) => {
        if (line) {
            return pool.add(async () => {
                const [ email, password ] = line.split(':');
                const randomIndex = Math.floor(Math.random() * proxies.length);
                const proxy = proxies[randomIndex];
                const [ip, port, username, passwordProxy] = proxy.split(':');
                const dirName = path.join(directory, 'Adidas Sessions', email.split('@')[0]);
                const cookiesFilePath = path.join(dirName, 'cookies.json');
                const taskid = uuidv4();

        if (fs.existsSync(cookiesFilePath)) {
            logger.info(`Session already exists for ${email}, skipping...`);
            return;
        }

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
        const maxRetries = 3;
        let retries = 0;


while (retries < maxRetries) {
    try {
        logger.info(`Task ${taskid}: Logging In...`);
        await page.goto('https://www.adidas.com/us/account-login', { waitUntil: 'networkidle2' });
        await page.waitForSelector('div[data-auto-id="account-portal-LANDING_SCREEN"]');
        break;

    } catch (error) {
        logger.error(`Task ${taskid}: Error Loading Login Page...`);
        retries++;
        if (retries >= maxRetries) {
            logger.error(`Task ${taskid}: Failed To Load Login Page After ${maxRetries} Attempts...`);
        }
    }
}

while (retries < maxRetries) {
    try {
        logger.info(`Task ${taskid}: Inputting Email...`);
        await cursor.click('input[id="email"]');
        await page.type('input[id="email"]', email, { delay: 100 });
        await cursor.click('button[data-auto-id="login-auto-flow-form-button"]');
        await page.waitForSelector('input[id="password"]');
        break;

    } catch (error) {
        logger.error(`Task ${taskid}: Error Processing Login...`);
        retries++;
        if (retries >= maxRetries) {
            logger.error(`Task ${taskid}: Failed To Input Email After ${maxRetries} Attempts...`);
        }
    }
}


while (retries < maxRetries) {
    try {
        logger.warn(`Task ${taskid}: Inputting Password...`);
        await cursor.click('input[id="password"]');
        await page.type('input[id="password"]', password, { delay : 100 })
        await page.waitForSelector('button[data-auto-id="login-submit-button"]');
        await clickButtonAndWaitForIframe(page, cursor);
        break;

    } catch (error) {
        logger.error(`Task ${taskid}: Error Inputting Password, Retrying...`);
        retries++;
        if (retries >= maxRetries) {
            logger.error(`Task ${taskid}: Failed To Input Password After ${maxRetries} Attempts.`);
        }
    }
}

try {
    await page.waitForSelector('div[data-auto-id="members-home-sticky-navigation"]');  

} catch (error) {
    logger.error('Error Checking Account...');
}
            
            try {
                if (!fs.existsSync(dirName)) {
                    fs.mkdirSync(dirName, { recursive: true });
                }

                const client = await page.target().createCDPSession();
                await client.send('Network.enable');
                const { cookies } = await client.send('Network.getAllCookies');
                const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
                const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
                fs.writeFileSync(path.join(dirName, 'cookies.json'), JSON.stringify(cookies, null, 2));
                fs.writeFileSync(path.join(dirName, 'localStorage.json'), localStorage);
                fs.writeFileSync(path.join(dirName, 'sessionStorage.json'), sessionStorage);

                logger.verbose(`Task ${taskid}: Login Session Saved...`);
                await browser.close();
            } catch (error) {
                logger.error(`Task ${taskid}: Error Saving Session...`);
            }
        });
    }
    logger.info('Looping Task In 30s...');
    await new Promise(resolve => setTimeout(resolve, 30000));
})
    await Promise.all(promises);
};
    
module.exports.run = run;