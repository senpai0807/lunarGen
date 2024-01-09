const fs = require('fs');
const os = require('os');
const path = require('path');
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
const logger = createColorizedLogger()


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
            await page.goto('https://www.adidas.com/us/account-login', { waitUntil: 'networkidle2' });
            await page.waitForSelector('div[data-auto-id="members-home-sticky-navigation"]');

        }


        try {
            logger.info(`Task ${taskid}: Deleting Account...`);
            await cursor.click('button[id="ACCOUNT"]');
            await page.waitForSelector('div[data-auto-id="personal-information-page"]', { timeout: 1000 });
            await cursor.click('button[data-auto-id="manage-account:delete-account:button"]');
            await page.waitForSelector('button[data-auto-id="manage-account:delete-account:modal-confirm-button"]');
            await cursor.click('button[data-auto-id="manage-account:delete-account:modal-confirm-button"]');
            await page.waitForSelector('div[data-auto-id="account-portal-LANDING_SCREEN"]');
            logger.info('Account Successfully Deleted...');
                
            } catch (error) {
                logger.info(`Task ${taskid}: Error Deleting Account...`);
            };

            logger.info(`Task ${taskid}: Sending Webhook...`);
            let hook = new Webhook(`${settings.successWebhookUrl}`);
            hook.setUsername('Toolbox');
            hook.setAvatar('https://imgur.com/Vn4CEtQ.png');

            const success = new MessageBuilder()
                .setTitle("Account Deleted 🌙")
                .setColor("#5665DA")
                .addField('**Module**', `Adidas Account Deleter`, false)
                .addField('**Email**', `||${email}||`, false)
                .setThumbnail("https://imgur.com/Vn4CEtQ.png")
                .setTimestamp();
            try {
                await hook.send(success);
            } catch (err) {
                logger.error(`Task ${taskid}: ${err}`);
            }

            await browser.close();
        });
    }
})
    await Promise.all(promises);
};
    
module.exports.run = run;