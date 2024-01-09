const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const taskid = uuidv4();
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');
const { Webhook, MessageBuilder } = require('discord-webhook-node');


const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
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
};

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

      const dateAnswer = await inquirer.prompt({
        type: 'input',
        name: 'orderDate',
        message: 'Enter the date of the order you want to fetch (Format: Month Day, Year. Example: May 31, 2023):',
        validate: function (value) {
          const valid = !isNaN(Date.parse(value));
          return valid || 'Please enter a valid date';
        }
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
let accounts = fs.readFileSync(adidasAccountsPath, 'utf8').split('\n').filter(line => line.length > 0);

for (const account of accounts) {
    const [email, password] = account.split(':');
    return pool.add(async () => {
        const randomIndex = Math.floor(Math.random() * proxies.length);
        const proxy = proxies[randomIndex];
        const [ip, port, username, passwordProxy] = proxy.split(':');
                
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
        logger.info(`Task ${taskid}: Navigating To Login Page...`);
        await page.goto('https://www.adidas.com/us/account-login', { waitUntil: 'networkidle0' });
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
    logger.info(`Task ${taskid}: Navigating To Orders Page...`);
    await cursor.click('button[id="ORDER"]');
    await page.waitForSelector('div[class="gl-flex-display gl-vspace"]');

} catch (error) {
    logger.error(`Task ${taskid}: Error Navigating To Order Page...`);
};

try {
    const noOrderElement = await page.$('div[class="gl-flex-display gl-vspace"]');
    if (noOrderElement) {
        logger.error(`Task ${taskid}: No Order Found...`);
        await browser.close();

        let hook = new Webhook(`${settings.successWebhookUrl}`);
        hook.setUsername('Toolbox');
        hook.setAvatar('https://imgur.com/Vn4CEtQ.png');
        
        const noOrdersEmbed = new MessageBuilder()
          .setTitle("No Orders Found 🌙")
          .setColor("#5665DA")
          .addField('**Email**', email, false)
          .addField('**Password**', password, false)
          .setTimestamp();
    
        await hook.send(noOrdersEmbed);

        accounts = accounts.filter(acc => acc !== account);
        fs.writeFileSync(path.join(directory, 'adidasAccounts.txt'), accounts.join('\n'), 'utf8');
        return;
    };

    await page.waitForSelector('article[data-auto-id="order-history-list"] section[data-auto-id="order-history-card"]');
    const orderCards = await page.$$('article[data-auto-id="order-history-list"] section[data-auto-id="order-history-card"]');

    for (let i = 0; i < orderCards.length; i++) {
        const orderSubtitle = await orderCards[i].$eval('div[data-auto-id="order-history-card-subtitle"]', el => el.innerText);
        const orderDateFromPage = orderSubtitle.split('|')[0].trim();

        if (orderDateFromPage === dateAnswer.orderDate) {
            logger.info(`Task ${taskid}: Sending Webhook...`);

            let productTitle = await orderCards[i].$eval('h5[data-auto-id="order-history-card-title"]', el => el.innerText);
            productTitle = productTitle.replace('YOUR ORDER: ', '');
            const productImage = await orderCards[i].$eval('img', el => el.src);
            const orderSubtitle = await orderCards[i].$eval('div[data-auto-id="order-history-card-subtitle"]', el => el.innerText);
            const productPrice = orderSubtitle.split('|')[1].trim();
        
            let hook = new Webhook(`${settings.successWebhookUrl}`);
            hook.setUsername('Toolbox');
            hook.setAvatar('https://imgur.com/Vn4CEtQ.png');
            
            const success = new MessageBuilder()
            .setTitle("Order Found 🌙")
            .setColor("#5665DA")
            .addField('**Account**', email, false)
            .addField('**Order Number**', productTitle, false)
            .addField('**Price**', productPrice, false)
            .setThumbnail(productImage)
            .setTimestamp();
        
            await hook.send(success);
        } else {
            logger.warn(`Task ${taskid}: No Orders Found On This Date: ` + (i+1));

            let hook = new Webhook(`${settings.successWebhookUrl}`);
            hook.setUsername('Toolbox');
            hook.setAvatar('https://imgur.com/Vn4CEtQ.png');
            
            const noOrdersDate = new MessageBuilder()
            .setTitle(`No Orders Found On ${dateAnswer.orderDate} 🌙`)
            .setColor("#5665DA")
            .addField('**Email**', email, false)
            .addField('**Password**', password, false)
            .setTimestamp();
        
            await hook.send(noOrdersDate);
        }
    }} catch (error) {
        logger.error(`Task ${taskid}: ${error}`);
    }
await browser.close();
accounts = accounts.filter(acc => acc !== account);
fs.writeFileSync(path.join(directory, 'adidasAccounts.txt'), accounts.join('\n'), 'utf8');

})}}

module.exports.run = run;