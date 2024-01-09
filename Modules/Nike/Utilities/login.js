const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const createImapConnection = require('../../../Functions/imap');
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
                if (!fs.existsSync(cookiesFilePath)) {
                const base64Credentials = Buffer.from(`${username}:${passwordProxy}`).toString('base64');


        async function clickButtonAndWaitForIframe(page, cursor) {
            while (true) {
                await cursor.click('button[type="submit"]');
                    try {
                        await page.waitForSelector('iframe[id="sec-text-if"]', { timeout: 5000 });
                        logger.debug(`Task ${taskid}: Handling Challenge...`);
                        await new Promise(resolve => setTimeout(resolve, 30000));
                        const isSuccess = await challengeCheck(page);

                        if (isSuccess) {
                            await cursor.click('button[type="submit"]');
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
                'authority': 'accounts.nike.com',
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
                'x-newrelic-id': 'undefined'
            };
            const startTime = Date.now();
            while (Date.now() - startTime < 45000) {
                const response = await fetch('https://accounts.nike.com/_sec/cp_challenge/verify', { headers });
                const text = await response.text();
                const data = JSON.parse(text);
                if (data.success == 'true') {
                    return true;
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            return false;
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
            logger.http(`Task ${taskid}: Navigating To Login Page...`);
            await page.goto('https://www.nike.com/login', { waitUntil: 'networkidle2' });
            break;

        } catch (error) {
            console.log(`Task ${taskid}: Error Loading Login Page. Attempt ${retries + 1} of ${maxRetries}...`);
            retries++;
            if (retries >= maxRetries) {
                logger.error(`Task ${taskid}: Failed to Load Login Page After ${maxRetries} Attempts.`);
            }
        }
    }

    while (retries < maxRetries) {
        try {
            logger.warn(`Task ${taskid}: Inputting Email...`);
            await page.waitForSelector('input[id="username"]');
            await page.type('input[id="username"]', email, { delay : 100 })
            await clickButtonAndWaitForIframe(page, cursor);
            await page.waitForSelector('input[name="password"]');
            break;
    
        } catch (error) {
            logger.error(`Task ${taskid}: Error Inputting Email, Retrying...`);
            retries++;
            if (retries >= maxRetries) {
                logger.error(`Task ${taskid}: Failed To Input Email After ${maxRetries} Attempts.`);
            }
        }
    }


    while (retries < maxRetries) {
        try {
            logger.warn(`Task ${taskid}: Inputting Password...`);
            await cursor.click('input[name="password"]');
            await page.type('input[name="password"]', password, { delay : 100 })
            await page.waitForSelector('button[type="submit"]');
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


    while (retries < maxRetries) {
        try {
            await page.waitForSelector('input[id="send-code"]');
            logger.http(`Task ${taskid}: Waiting for 2FA code...`);
            const { imap, code } = await createImapConnection(email);
    
            logger.warn(`Task ${taskid}: Inputting 2FA Code...`);
            await page.type('input[id="send-code"]', code, { delay: 100 });
            await cursor.click('button[type="submit"]');
            await page.waitForSelector('div[id="AccountMenu"]');
            imap.end();
            break;
    
        } catch (error) {
            logger.error(`Task ${taskid}: Error Inputting 2FA Code, Retrying...`);
            retries++;
            if (retries >= maxRetries) {
                logger.error(`Task ${taskid}: Failed To Input 2FA Code After ${maxRetries} Attempts.`);
            }
        }
    }




        try {
            logger.http(`Task ${taskid}: Navigating To Settings Page...`);
            await page.goto('https://www.nike.com/member/settings', { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('a[aria-label="Nike Home Page"]');

        } catch (error) {
            logger.error(`Task ${taskid}: Error Navigating To Settings Page...`);
        }

            try {
                logger.warn(`Task ${taskid}: Checking Account...`);
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

            } catch (error) {
                logger.error(error);
            }

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
                
                    fs.writeFileSync(path.join(dirName, 'cookies.json'), JSON.stringify(cookies, null, 2));
                    fs.writeFileSync(path.join(dirName, 'localStorage.json'), JSON.stringify(localStorageData, null, 2));
                    fs.writeFileSync(path.join(dirName, 'sessionStorage.json'), JSON.stringify(sessionStorageData, null, 2));

                
                    const key = 'oidc.user:https://accounts.nike.com:4fd2d5e7db76e0f85a6bb56721bd51df';
                    const value = await page.evaluate(key => {
                        return localStorage.getItem(key);
                    }, key);
                
                    const parsedValue = JSON.parse(value);
                    const accessToken = parsedValue.access_token;
                
                    const profile = parsedValue.profile;
                
                    const directory = path.join(os.homedir(), 'Toolbox');

                    if (!fs.existsSync(directory)) {
                        fs.mkdirSync(directory, { recursive: true });
                    }

                    const csvPath = path.join(directory, 'accounts.csv');
                
                    const csvWriter = createCsvWriter({
                        path: csvPath,
                        header: [
                            {id: 'email', title: 'email'},
                            {id: 'password', title: 'password'},
                            {id: 'firstName', title: 'firstName'},
                            {id: 'lastName', title: 'lastName'},
                            {id: 'phoneNumber', title: 'phoneNumber'},
                            {id: 'accessToken', title: 'accessToken'},
                        ],
                        append: fs.existsSync(csvPath)
                    });
                
                    function sanitizeField(field) {
                        return (field || "").toString().replace(/[\n\r]+|,/g, ' ').trim();
                    }

                    const record = {
                        email: sanitizeField(email),
                        password: sanitizeField(password),
                        firstName: sanitizeField(profile.given_name),
                        lastName: sanitizeField(profile.family_name),
                        phoneNumber: sanitizeField(profile.phone_number),
                        accessToken: sanitizeField(accessToken),
                    };

                    await csvWriter.writeRecords([record]);
                
                
                    await browser.close();
                    logger.verbose(`Task ${taskid}: Account Session Stored...`);


                } catch (error) {
                    logger.error(error);
                }

                    if (index < nikeAccountsData.length - 1) {
                        logger.http(`Task ${taskid}: Looping Task In 15s...`);
                        await new Promise(resolve => setTimeout(resolve, 15000));
                    }
                };
            })
        }
    });
    await Promise.all(promises);
};
    
module.exports.run = run;