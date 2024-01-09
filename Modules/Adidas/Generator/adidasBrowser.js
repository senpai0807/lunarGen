const fs = require('fs');
const os = require('os');
const path = require('path')
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');
var random_name = require('node-random-name');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { incrementTotalGenerated } = require('../../../Functions/analyticsUpdate');
require('events').EventEmitter.defaultMaxListeners = 50;


const appendToFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    lock.acquire(filePath, () => {
      fs.appendFileSync(filePath, data);
      resolve();
    }, (err) => {
      reject(err);
    });
  });
};


const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const fileType = settings.fileType.toLowerCase();
const createColorizedLogger = require('../../../Functions/logger');
const logger = createColorizedLogger();
let licenseKey = settings.licenseKey;
const incrementValue = 1;


async function clickButtonAndWaitForIframe(page) {
    while (true) {
        const loginButton = await page.$('button[data-auto-id="login-auto-flow-form-button"]');
        const registrationButton = await page.$('button[data-auto-id="registration-submit-button"]');
        if (loginButton) {
            await loginButton.click();
          } else if (registrationButton) {
            await registrationButton.click();
          } else {
            break;
          }

            try {
                await page.waitForSelector('iframe[id="sec-text-if"]', { timeout: 10000 });
                logger.debug(`Task ${taskid}: Handling Challenge...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
                const isSuccess = await challengeCheck(page);

                if (isSuccess) {
                    const loginButton = await page.$('button[data-auto-id="login-auto-flow-form-button"]');
                    const registrationButton = await page.$('button[data-auto-id="registration-submit-button"]');
                    if (loginButton) {
                        await loginButton.click();
                      } else if (registrationButton) {
                        await registrationButton.click();
                      } else {
                        break;
                      }
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


function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const delay = getRandomDelay(1500, 8000);

function generatePassword(length) {
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%&';
  const allChars = upperChars + lowerChars + numberChars + symbolChars;
  
  let password = 
    upperChars[Math.floor(Math.random()*upperChars.length)] +
    lowerChars[Math.floor(Math.random()*lowerChars.length)] +
    numberChars[Math.floor(Math.random()*numberChars.length)] +
    symbolChars[Math.floor(Math.random()*symbolChars.length)];
  
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random()*allChars.length)];
  }

  password = password.split('').sort(() => Math.random() - 0.5).join('');

  return password;
}

async function randomClicks(page) {
  const bodyHandle = await page.$('body');
  const { width, height } = await bodyHandle.boundingBox();

  for (let i = 0; i < 2; i++) {
    const randomX = Math.floor(Math.random() * width);
    const randomY = Math.floor(Math.random() * height);

    await page.mouse.click(randomX, randomY);

    await page.waitForTimeout(500);
  }
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

  const answerBrowsers = await inquirer.prompt({
    type: 'input',
    name: 'browsersCount',
    message: 'How many browsers do you want to open?',
    validate: function (value) {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    },
    filter: Number,
  });

  const answerMode = await inquirer.prompt({
    type: 'list',
    name: 'emailMode',
    message: 'Select the mode for email generation:',
    choices: ['Catchall', 'Email List', 'Fake Email'],
  });

const accountsCount = answer.accountsCount; 
const browsersCount = answerBrowsers.browsersCount;  
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

const promisePool = new PromisePool(browsersCount);

for(let i = 0; i < accountsCount; i++) {
  const taskid = uuidv4();
  let accountPassword = generatePassword(12);
  let randomMonth = Math.floor(Math.random() * 12) + 1;
  let monthString = randomMonth < 10 ? `0${randomMonth}` : `${randomMonth}`;
  let randomDay = ("0" + Math.floor(Math.random() * 28 + 1)).slice(-2);
  let randomYear = Math.floor(Math.random() * (2006 - 1970 + 1)) + 1970;
  const promise = promisePool.add(async () => {
    const firstName = random_name({ first: true });
    const lastName = random_name({ last: true });
    let accountName = firstName + lastName
    const randomIndex = Math.floor(Math.random() * proxies.length);
    const proxy = proxies[randomIndex];
    const [ip, port, username, passwordProxy] = proxy.split(':');

let accountEmail;
let emailIndex;
switch (answerMode.emailMode) {
  case 'Catchall':
    accountEmail = accountName + randomYear + i + '@' + settings.catchall;
    break;
    case 'Email List':
      emailIndex = i;
      let emailsData = fs.readFileSync(path.join(directory, 'emails.txt'), 'utf8').split('\n');
      if (emailsData.length <= i || !emailsData[i].trim()) {
        logger.error('No Emails Found');
        return;
      }
      accountEmail = emailsData[i];
      break;
  case 'Fake Email':
    accountEmail = accountName + randomYear + i + '@gmail.com';
    break;
  default:
    console.error('Unexpected email mode');
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

try {
  logger.http(`Task ${taskid}: Navigating To Homepage...`);
  await page.goto('https://www.adidas.com/us', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('a[manual_cm_sp="header-_-men"]');
  await sleep(delay);

} catch (error) {
  logger.error(`Task ${taskid}: Error Loading Homepage...`);
}

try {
  logger.info(`Task ${taskid}: Generating Sensor Data...`);
  await cursor.click('a[manual_cm_sp="header-_-men"]');
  const consentButton = await page.$('button[id="glass-gdpr-default-consent-accept-button"]');
  if (consentButton) {
    await consentButton.click();
  }
  const accountButtonSelector = await page.waitForSelector('button[name="account-portal-close"]', { timeout: 5000 });
  if (accountButtonSelector) {
    await accountButtonSelector.click();
  };


  await page.waitForSelector('button[title="SNEAKERS"]');
  await sleep(delay);
  await cursor.click('button[title="SNEAKERS"]');
  await page.waitForSelector('div[data-auto-id="result-item-content"]');
  const elements = await page.$$('div[data-auto-id="result-item-content"]');
  const randomIndex = Math.floor(Math.random() * elements.length);
  await elements[randomIndex].click();
  await sleep(delay);

  const sizeButtons = await page.$$('button.gl-label.size___2lbev:not(.size-selector__size--unavailable___1EibR)');
  const randomSizeIndex = Math.floor(Math.random() * sizeButtons.length);
  await sizeButtons[randomSizeIndex].click();
  await sleep(delay);

  await cursor.click('button[data-auto-id="add-to-bag"]');
  await sleep(delay);

} catch (error) {
  logger.error(`Task ${taskid}: Error Generating Sensor Data...`);
}


try {
  const atcError = await page.$('div[data-auto-id="cart-error-message"]');
  if (atcError) {
    logger.warn(`Task ${taskid}: Unexpected Error Occurred, Redirecting To Sign-Up Page...`);
    await page.goto('https://www.adidas.com/us/account-register', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('ul[data-auto-id="main-menu"]', { timeout: 15000 });
    const consentButton = await page.$('button[id="glass-gdpr-default-consent-accept-button"]');
    if (consentButton) {
      await consentButton.click();
    };
    logger.warn(`Task ${taskid}: Inputting Email...`);
    await cursor.click('input[name="email"]');
    await page.type('input[name="email"]', accountEmail, { delay: 100 });
    await sleep(delay);
    await randomClicks(page);
    await cursor.click('button[data-auto-id="login-auto-flow-form-button"]');
    await page.waitForSelector('input[name="password"]');
    logger.warn(`Task ${taskid}: Inputting Password...`);
    await cursor.click('input[name="password"]');
    await page.type('input[name="password"]', accountPassword, { delay: 100 });
    await sleep(delay);
    await randomClicks(page);
    await clickButtonAndWaitForIframe(page);

    try {
      logger.info(`Task ${taskid}: Setting Account Information...`);
      await cursor.click('button[id="ACCOUNT"]');
      await page.waitForSelector('h4[class="col-s-12 gl-vspace-bpall-small customSpacing___2pXrC gl-heading-font-set-standard-14___8jHvP"]');
      await cursor.click('button[data-auto-id="edit-profile-information-button-PROFILE_INFORMATION_MODAL"]');
    
      logger.info(`Task ${taskid}: Inputting First Name...`);
      await page.waitForSelector('input[id="personal-info:firstName"]');
      await page.type('input[id="personal-info:firstName"]', firstName, { delay: 100 });
    
      logger.info(`Task ${taskid}: Inputting Last Name...`);
      await page.type('input[name="lastName"]', lastName, { delay: 100 });
    
    
      logger.info(`Task ${taskid}: Inputting Birthday...`);
      await page.type('input[id="date-of-birth-month"]', monthString);
      await page.type('input[id="date-of-birth-day"]', randomDay);
      await page.type('input[id="date-of-birth-year"]', randomYear.toString());
    
      const genders = ['Male', 'Female', 'Other'];
      const randomGenderIndex = Math.floor(Math.random() * genders.length);
      const randomGender = genders[randomGenderIndex];
    
      logger.info(`Task ${taskid}: Selecting Gender...`);
      await page.evaluate((genderValue) => {
      const inputs = document.querySelectorAll('input.gl-radio-input__input');
      for (const input of inputs) {
        if (input.value === genderValue) {
          input.click();
          break;
        }
      }
    }, randomGender);
    logger.info(`Task ${taskid}: Submitting Account Information...`);
    await cursor.click('button[aria-label="Update details"]');
    await sleep(delay);
    await page.waitForSelector('div[data-auto-id="personal-information-page"]');
    
    } catch (error) {
      logger.error(`Task ${taskid}: ${error}`);
      await browser.close()
      return;
    }
  } else {
    await page.waitForSelector('button[data-auto-id="membership-gateway-btn"]');
    await cursor.click('button[data-auto-id="membership-gateway-btn"]');
    await page.waitForSelector('input[name="login-register-auto-flow-input"]');
    await sleep(delay);

    logger.warn(`Task ${taskid}: Inputting Email...`);
    await page.type('input[name="login-register-auto-flow-input"]', accountEmail, { delay: 100 });
    await cursor.click('button[data-auto-id="login-auto-flow-form-button"]');
    await page.waitForSelector('input[name="registration-password-field"]');
    logger.warn(`Task ${taskid}: Inputting Password...`);
    await cursor.click('input[name="registration-password-field"]');
    await page.type('input[name="registration-password-field"]', accountPassword, { delay: 100 });
    await sleep(delay);
    await cursor.click('button[data-auto-id="registration-submit-button"]');
    await sleep(delay);

    const atcCreationError = await page.$$('div[class="gl-callout__wrapper"]');
    if (atcCreationError) {
      logger.error(`Task ${taskid}: Unexpected Error, Retrying...`);
      await page.goto('https://www.adidas.com/us/account-register', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="email"]', { timeout: 15000 });
      const consentButton = await page.$('button[id="glass-gdpr-default-consent-accept-button"]');
      if (consentButton) {
        await consentButton.click();
      }

      logger.warn(`Task ${taskid}: Inputting Email...`);
      await cursor.click('input[name="email"]');
      await page.type('input[name="email"]', accountEmail, { delay: 100 });
      await sleep(delay);
      await randomClicks(page);
      await cursor.click('button[data-auto-id="login-auto-flow-form-button"]');

      const errorElement = await page.$$('p[class*="_error_"]');
      if (errorElement) {
        logger.error(`Task ${taskid}: Akamai Blocked, Retrying...`);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('input[name="email"]');
        await cursor.click('input[name="email"]');
        await page.type('input[name="email"]', accountEmail, { delay: 100 });
        await sleep(delay);
        await randomClicks(page);
        await cursor.click('button[data-auto-id="login-auto-flow-form-button"]');
        await page.waitForSelector('input[name="password"]');
        logger.warn(`Task ${taskid}: Inputting Password...`);
        await cursor.click('input[name="password"]');
        await page.type('input[name="password"]', accountPassword, { delay: 100 });
        await sleep(delay);
        await randomClicks(page);
        await clickButtonAndWaitForIframe(page);

      } else {
        await page.waitForSelector('input[name="password"]');
        logger.warn(`Task ${taskid}: Inputting Password...`);
        await cursor.click('input[name="password"]');
        await page.type('input[name="password"]', accountPassword, { delay: 100 });
        await sleep(delay);
        await randomClicks(page);
        await clickButtonAndWaitForIframe(page);
      }



      try {
        logger.info(`Task ${taskid}: Setting Account Information...`);
        await page.waitForSelector('button[id="ACCOUNT"]');
        await cursor.click('button[id="ACCOUNT"]');
        await page.waitForSelector('h4[class="col-s-12 gl-vspace-bpall-small customSpacing___2pXrC gl-heading-font-set-standard-14___8jHvP"]');
        await cursor.click('button[data-auto-id="edit-profile-information-button-PROFILE_INFORMATION_MODAL"]');
      
        logger.info(`Task ${taskid}: Inputting First Name...`);
        await page.waitForSelector('input[id="personal-info:firstName"]');
        await page.type('input[id="personal-info:firstName"]', firstName, { delay: 100 });
      
        logger.info(`Task ${taskid}: Inputting Last Name...`);
        await page.type('input[name="lastName"]', lastName, { delay: 100 });

      
        logger.info(`Task ${taskid}: Inputting Birthday...`);
        await page.type('input[id="date-of-birth-month"]', monthString);
        await page.type('input[id="date-of-birth-day"]', randomDay);
        await page.type('input[id="date-of-birth-year"]', randomYear.toString());
        await sleep(2500);
      
        const genders = ['Male', 'Female', 'Other'];
        const randomGenderIndex = Math.floor(Math.random() * genders.length);
        const randomGender = genders[randomGenderIndex];
      
        logger.info(`Task ${taskid}: Selecting Gender...`);
        await page.evaluate((genderValue) => {
        const inputs = document.querySelectorAll('input.gl-radio-input__input');
        for (const input of inputs) {
          if (input.value === genderValue) {
            input.click();
            break;
          }
        }
      }, randomGender);
      await sleep(delay);
      logger.info(`Task ${taskid}: Submitting Account Information...`);
      await cursor.click('button[aria-label="Update details"]');
      await sleep(delay);
      await page.waitForSelector('div[data-auto-id="personal-information-page"]');
      
      } catch (error) {
        logger.error(`Task ${taskid}: ${error}`);
        await browser.close()
        return;
      }
    } else {
      try {
        await sleep(delay);
        logger.warn(`Task ${taskid}: Navigating To Accounts Page...`);
        await page.goto('https://www.adidas.com/us/my-account', { waitUntil: 'domcontentloaded' });
        await sleep(delay);
        logger.info(`Task ${taskid}: Setting Account Information...`);
        await page.waitForSelector('button[id="ACCOUNT"]');
        await cursor.click('button[id="ACCOUNT"]');
        await page.waitForSelector('h4[class="col-s-12 gl-vspace-bpall-small customSpacing___2pXrC gl-heading-font-set-standard-14___8jHvP"]');
        await cursor.click('button[data-auto-id="edit-profile-information-button-PROFILE_INFORMATION_MODAL"]');
      
        logger.info(`Task ${taskid}: Inputting First Name...`);
        await page.waitForSelector('input[id="personal-info:firstName"]');
        await page.type('input[id="personal-info:firstName"]', firstName, { delay: 100 });
      
        logger.info(`Task ${taskid}: Inputting Last Name...`);
        await page.type('input[name="lastName"]', lastName, { delay: 100 });

      
        logger.info(`Task ${taskid}: Inputting Birthday...`);
        await page.type('input[id="date-of-birth-month"]', monthString);
        await page.type('input[id="date-of-birth-day"]', randomDay);
        await page.type('input[id="date-of-birth-year"]', randomYear.toString());
        await sleep(2500);
      
        const genders = ['Male', 'Female', 'Other'];
        const randomGenderIndex = Math.floor(Math.random() * genders.length);
        const randomGender = genders[randomGenderIndex];
      
        logger.info(`Task ${taskid}: Selecting Gender...`);
        await page.evaluate((genderValue) => {
        const inputs = document.querySelectorAll('input.gl-radio-input__input');
        for (const input of inputs) {
          if (input.value === genderValue) {
            input.click();
            break;
          }
        }
      }, randomGender);
      await sleep(delay);
      logger.info(`Task ${taskid}: Submitting Account Information...`);
      await cursor.click('button[aria-label="Update details"]');
      await sleep(delay);
      await page.waitForSelector('div[data-auto-id="personal-information-page"]');
      
      } catch (error) {
        logger.error(`Task ${taskid}: ${error}`);
        await browser.close()
        return;
      }
    }
  } 
} catch (error) {
  logger.error(`Task ${taskid}: Error Generating Account...`);
}


try {
  await browser.close();
} catch (error) {
  logger.error(`Task ${taskid}: Error closing browser`);
}
logger.verbose(`Task ${taskid}: Successfully Generated, Sending Webhook...`);
if (emailIndex !== undefined) {
  emailsData.splice(emailIndex, 1);
  fs.writeFileSync(path.join(directory, 'emails.txt'), emailsData.join('\n'), 'utf8');
}

const writeData = async (accountEmail, accountPassword, firstName, lastName, proxy) => {
  let outputPath;
  let data;
  if (fileType === 'txt') {
    outputPath = path.join(directory, 'adidasOutput.txt');
    data = `${accountEmail}:${accountPassword}\n`;
  } else if (fileType === 'csv') {
    outputPath = path.join(directory, 'adidasOutput.csv');
    if (!fs.existsSync(outputPath)) {
      fs.writeFileSync(outputPath, 'Email,Password,First Name,Last Name,Proxy Used\n', 'utf-8');
    }
    data = `${accountEmail},${accountPassword},${firstName},${lastName},${proxy}\n`;
  } else {
    logger.error(`Unsupported file type: ${settings.fileType}`);
    return;
  }

  await appendToFile(outputPath, data);
};

await writeData(accountEmail, accountPassword, firstName, lastName, proxy);
proxies.splice(randomIndex, 1);
fs.writeFileSync(proxiesPath, proxies.join('\n'), 'utf8');



let hook = new Webhook(`${settings.successWebhookUrl}`);
hook.setUsername('Toolbox');
hook.setAvatar('https://imgur.com/Vn4CEtQ.png');
const success = new MessageBuilder()
  .setTitle("Success")
  .setColor("#5665DA")
  .addField('**Module**', `Adidas Account Generator`, false)
  .addField('**Email**', `||${accountEmail}||`, false)
  .addField('**Password**', `||${accountPassword}||`, false)
  .addField('**First Name**', `||${firstName}||`, false)
  .addField('**Last Name**', `||${lastName}||`, false)
  .addField('**Proxy**', `||${proxy}||`, false)
  .setThumbnail('https://imgur.com/Vn4CEtQ.png')
  .setTimestamp();
await hook.send(success);
await incrementTotalGenerated(licenseKey, incrementValue)

let globalHook = new Webhook(``); // Global webhook if you want users to see a general success hook
globalHook.setUsername('Toolbox');
globalHook.setAvatar('https://imgur.com/Vn4CEtQ.png');

const globalSuccessEmbed = new MessageBuilder()
    .setTitle("Successfully Generated Confirmed Account!")
    .setColor("#5665DA")
    .addField('**Module**', 'Adidas Account Generator', false)
    .addField('**User**', 'Anonymous', false)
    .setTimestamp();

await globalHook.send(globalSuccessEmbed);
logger.info(`Task ${taskid}: Looping Task In 30s...`);
await new Promise(resolve => setTimeout(resolve, 30000));
});
  allPromises.push(promise);
}
await Promise.all(promisePool.waiting);
}

module.exports.run = run;
module.exports.waitForCompletion = async () => {
  await Promise.all(allPromises);
};