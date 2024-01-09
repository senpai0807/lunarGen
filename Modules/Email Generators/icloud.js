require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { incrementTotalGenerated } = require('../../Functions/analyticsUpdate');
const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
let licenseKey = settings.licenseKey;
const incrementValue = 1;

const createColorizedLogger = require('../../Functions/logger');
const logger = createColorizedLogger();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
            `--proxy-server=http://${ip}:${port}`,
            '--window-size=550,800'
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

let allPromises = [];
const run = async () => {
  const answer = await inquirer.prompt({
    type: 'input',
    name: 'accountsCount',
    message: 'How many accounts do you want to generate?',
    validate: function (value) {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    },
    filter: Number,
  });

  const answers = await inquirer.prompt([
    {
        type: 'confirm',
        name: 'useAttachedProxies',
        message: 'Do you want to use the proxies attached to the accounts?',
        default: false
    }
]);

const accountsCount = answer.accountsCount; 
const useAttachedProxies = answers.useAttachedProxies; 
const promisePool = new PromisePool(accountsCount);
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

    const promise = promisePool.add(async () => {
    let proxy;
    const taskid = uuidv4();
    if (useAttachedProxies && ip && port && username && passwordProxy) {
        proxy = [ip, port, username, passwordProxy].join(':');
    } else {
        const randomIndex = Math.floor(Math.random() * proxies.length);
        proxy = proxies[randomIndex];
        [ip, port, username, passwordProxy] = proxy.split(':');
    }
 
    const browser = await launchBrowser(settings.browserName, ip, port);
    const page = await browser.newPage();
    await page.setViewport({ width: 550, height: 800 });
    const cursor = createCursor(page)

    await page.authenticate({
        username: username,
        password: passwordProxy
    });

    await page.evaluateOnNewDocument(() => {
        console.log = () => {};
    });

    page.setDefaultNavigationTimeout(100000);
    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.href.includes('getFamilyDetails')) {
            const pNumberMatch = url.href.match(/https:\/\/(p\d+)-/);
            const clientIdMatch = url.href.match(/clientId=([\w-]+)/);

            if (pNumberMatch) {
                pNumber = pNumberMatch[1];
            }

            if (clientIdMatch) {
                clientId = clientIdMatch[1];
            }
        }

        request.continue();
    });
    let pNumber;
    let clientId;

try {
    logger.info(`Task ${taskid}: Loading Homepage...`);
    await page.goto('https://www.icloud.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('ui-button[class="push primary sign-in-button"]');
} catch {
    logger.error(`Task ${taskid}: Error Loading Homepage...`);
}

try {
    logger.info(`Task ${taskid}: Navigating To Sign In Page...`);
    await cursor.click('ui-button[class="push primary sign-in-button"]');
    await page.waitForSelector('div[class="apple-id-container apple-id-frame-value"]');
} catch {
    logger.error(`Task ${taskid}: Error Navigating To Sign In Page...`)
}

try {
    await inquirer.prompt([
        {
            type: 'confirm',
            name: 'signIn',
            message: 'Complete Sign In manually on the browser. Confirm when done.',
            default: false,
        },
    ]);
} catch {
    logger.error(`Task ${taskid}: Error Signing In...`);
}

try {
    await page.waitForXPath('/html/body/div[1]/ui-main-pane/div/div[2]/div[1]/div[3]/div/main/div/div/div[1]/div[1]/div/div/div/div/div[3]');
    logger.info(`Task ${taskid}: Navigating To HME Page...`);
    await page.goto('https://www.icloud.com/icloudplus/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('button[class="unstyled-button tile-button"]');
    await cursor.click('button[class="unstyled-button tile-button"]');
    const frameElement = await page.$('iframe.child-application[data-name="hidemyemail"]');
    const frame = await frameElement.contentFrame();

    await frame.waitForSelector('.IconButton.AddButton.color-primary button');
    await frame.click('.IconButton.AddButton.color-primary button');
} catch (error) {
    logger.error(`Task ${taskid}: ${error}`);
}

try {
    for(let j = 0; j < accountsCount; j++) {
        logger.info(`Task ${taskid}: Generating Hide My Emails...`);
        let cookies = await page.cookies();
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
        let appleWebAuthUserCookie = cookies.find(cookie => cookie.name === 'X-APPLE-WEBAUTH-USER');
        let match = appleWebAuthUserCookie.value.match(/d=([0-9]+)/);
        let sid = match ? match[1] : null;
        const generateEndpoint = `https://${pNumber}-maildomainws.icloud.com/v1/hme/generate?clientBuildNumber=2313Project35&clientMasteringNumber=2313B20&clientId=${clientId}&dsid=${sid}`
        
        const options = {
            method: 'POST',
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/plain;charset=UTF-8',
                "Cookie": cookieString,
                'Origin': 'https://www.icloud.com',
                'Pragma': 'no-cache',
                'Referer': 'https://www.icloud.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            },
            body: JSON.stringify({ langCode: 'en-us' }),
        };
        
        const response = await fetch(generateEndpoint, options);
        const jsonResponse = await response.json();

        await sleep(5000);
        
        if (jsonResponse.success) {
            const confirmEndpoint = `https://${pNumber}-maildomainws.icloud.com/v1/hme/reserve?clientBuildNumber=2317Project38&clientMasteringNumber=2313B20&clientId=${clientId}&dsid=${sid}`
            const payload = {
                "hme": jsonResponse.result.hme,
                "label": "Shopping",
                "note": ""
            };
        
            const options = {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Content-Type': 'text/plain;charset=UTF-8',
                    "Cookie": cookieString,
                    'Origin': 'https://www.icloud.com',
                    'Pragma': 'no-cache',
                    'Referer': 'https://www.icloud.com/',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                    'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"'
                },
                body: JSON.stringify(payload)
            };
        
            const confirmResponse = await fetch(confirmEndpoint, options);
            const confirmJsonResponse = await confirmResponse.json();
        
            if(confirmJsonResponse.success) {
                logger.verbose(`Task ${taskid}: Successfully Generated...`);

                const filePath = path.join(directory, 'hideMyEmailOutput.txt');
                fs.appendFileSync(filePath, `${confirmJsonResponse.result.hme.hme}\n`);
        
                let hook = new Webhook(`${settings.successWebhookUrl}`);
                hook.setUsername('Toolbox');
                const success = new MessageBuilder()
                  .setTitle("Success 🌙")
                  .setColor("#5665DA")
                  .addField('**Module**', `ICloud Generator`, false)
                  .addField('**Hide My Email**', `||${confirmJsonResponse.result.hme.hme}||`, false)
                  .addField('**Proxy**', `||${proxy}||`, false)
                  .setThumbnail('https://imgur.com/Vn4CEtQ.png')
                  .setTimestamp();
                hook.send(success).then(() => {
                    let globalHook = new Webhook(``); // Set Global Webhook
                    globalHook.setUsername('Toolbox');
                        
                    const globalSuccessEmbed = new MessageBuilder()
                        .setTitle("Successfully Generated HME! 🌙")
                        .setColor("#5665DA")
                        .addField('**Module**', 'ICloud Generator', false)
                        .addField('**User**', 'Anonymous', false)
                        .setTimestamp();
                        
                    globalHook.send(globalSuccessEmbed);
                    incrementTotalGenerated(licenseKey, incrementValue)
                }).catch((error) => {
                    console.error('Error sending embed:', error);
                });
            } else {
                if (confirmJsonResponse.error && confirmJsonResponse.error.errorMessage) {
                    logger.warn(`Task ${taskid}: ${confirmJsonResponse.error.errorMessage}`);

                } else {
                    logger.warn(`Task ${taskid}: Hide My Email confirmation was not successful.`);
                }
            }
            
        } else {
            logger.warn(`Task ${taskid}: Hide My Email generation was not successful.`);
        }
    }
} catch (error) {
    logger.error(`Task ${taskid}: Error Generating Hide My Emails - ${error.message}`);
}

    await browser.close();

});
    allPromises.push(promise);
    await Promise.all(promisePool.waiting);
}

module.exports.run = run;
module.exports.waitForCompletion = async () => {
  await Promise.all(allPromises);
};