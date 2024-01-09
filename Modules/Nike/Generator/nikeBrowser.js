const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const taskid = uuidv4();
const puppeteer = require('puppeteer');
var random_name = require('node-random-name');
const { createCursor } = require('ghost-cursor');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { incrementTotalGenerated } = require('../../../Functions/analyticsUpdate');


const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
let licenseKey = settings.licenseKey;
const incrementValue = 1;

const sleep = require('./Functions/delay')
const PromisePool = require('./Functions/promisePool');
const generatePassword = require('./Functions/generatePassword');
const createImapConnection = require('../../../Functions/imap');
const createColorizedLogger = require('../../../Functions/logger');
const logger = createColorizedLogger();


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

  const answerEmail = await inquirer.prompt({
    type: 'confirm',
    name: 'useCatchall',
    message: 'Do you want to use catchall for emails?',
  });

  const answerSmsProvider = await inquirer.prompt({
    type: 'list',
    name: 'smsProvider',
    message: 'Which SMS provider would you like to use?',
    choices: ['SMS-Man']
  });

  let getNumber, getSmsCode;

  if (answerSmsProvider.smsProvider === 'SMS-Man') {
    const smsMan = require('../../../Functions/smsMan');
    getNumber = smsMan.getNumber;
    getSmsCode = smsMan.getSmsCode;
  }
  
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

const promisePool = new PromisePool(browsersCount);
let emailsPath = path.join(directory, 'emails.txt');

if (!fs.existsSync(emailsPath)) {
  logger.error('Missing emails.txt...');
  process.exit(1);
}
let emails = fs.readFileSync(emailsPath, 'utf8').split('\n');

for(let i = 0; i < accountsCount; i++) {
  let randomMonth = Math.floor(Math.random() * 12) + 1;
  let monthString = randomMonth < 10 ? `0${randomMonth}` : `${randomMonth}`;
  let randomDay = ("0" + Math.floor(Math.random() * 28 + 1)).slice(-2);
  let randomYear = Math.floor(Math.random() * (2006 - 1970 + 1)) + 1970;
  const firstName = random_name({ first: true });
  const lastName = random_name({ last: true });
  let accountBirthday = monthString + randomDay + randomYear;
  let formattedBirthday = monthString + '/' + randomDay + '/' + randomYear;
  let shoppingPreference = Math.random() <= 0.5 ? "MENS" : "WOMENS";
  let accountEmail = '';
  if (answerEmail.useCatchall) {
    accountEmail = `${firstName}${lastName}${randomYear.toString()}@${settings.catchall}`;
  } else {
    accountEmail = emails.splice(0, 1)[0];
    console.log(accountEmail);
  }
  let accountPassword = generatePassword(12);

  
const promise = promisePool.add(async () => {
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
    logger.info(`Task ${taskid}: Navigating To Sign Up Page...`);
    await page.goto('https://www.nike.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[data-type="click_navMembership"]', { visible: true, timeout: 5000 });
    await cursor.click('button[data-type="click_navMembership"]');
    break;

  } catch (error) {
    logger.error(`Task ${taskid}: Error Navigating To Sign Up Page, Retrying...`);
    retries++;
    await page.reload({ waitUntil: 'domcontentloaded' });

    if (retries >= maxRetries) {
      logger.error(`Task ${taskid}: Failed to Load Login Page After ${maxRetries} Attempts.`);
    }
  }
}

while (retries < maxRetries) {
  try {
    logger.info(`Task ${taskid}: Inputting Email...`);
    await page.waitForSelector('input[id="username"]', { visible: true });
    await page.type('input[id="username"]', accountEmail, { delay: 100 });
    await sleep(2000);
    await cursor.click('button[aria-label="continue"]');
    break;

  } catch (error) {
    logger.error(`Task ${taskid}: ${error}`);
    retries++;
    if (retries >= maxRetries) {
        logger.error(`Task ${taskid}: Failed to Load Login Page After ${maxRetries} Attempts.`);
    }
  }
}

try {
  logger.info(`Task ${taskid}: Waiting for 2FA code...`);
  await page.waitForSelector('input[name="verificationCode"]', { visible: true })
  await cursor.click('input[name="verificationCode"]');
  const { imap, code } = await createImapConnection(accountEmail);
  logger.info(`Task ${taskid}: Inputting 2FA code...`);
  await page.type('input[name="verificationCode"]', code, { delay: 100 });

} catch (error) {
  logger.error(`Task ${taskid}: Error Fetching 2FA Code...`)
}


try {
  logger.info(`Task ${taskid}: Inputting First Name...`);
  await cursor.click('input[name="firstName"]');
  await page.waitForSelector('input[name="firstName"]');
  await page.type('input[name="firstName"]', firstName, { delay: 100 });

} catch (error) {
  logger.error(`Task ${taskid}: Error Inputting First Name...`);
}

try {
  logger.info(`Task ${taskid}: Inputting Last Name...`);
  await cursor.click('input[name="lastName"]');
  await page.type('input[name="lastName"]', lastName, { delay: 100 });

} catch (error) {
    logger.error(`Task ${taskid}: Error Inputting Last Name...`);
}

try {
  logger.info(`Task ${taskid}: Inputting Password...`);
  await cursor.click('input[name="password"]');
  await page.type('input[name="password"]', accountPassword, { delay: 100 });

} catch (error) {
    logger.error(`Task ${taskid}: Error Inputting Password, Retrying...`);
}

try {
  logger.info(`Task ${taskid}: Selecting Shopping Preference...`);
  await page.select('select[name="shoppingPreference"]', shoppingPreference);
} catch (error) {
  logger.error(`Task ${taskid}: Error Selecting Shopping Preference...`);
}

try {
  logger.info(`Task ${taskid}: Inputting Birthday...`);
  await cursor.click('input[name="month"]');
  await page.type('input[name="month"]', monthString, { delay: 100 });

  await cursor.click('input[name="day"]');
  await page.type('input[name="day"]', randomDay, { delay: 100 });

  await cursor.click('input[name="year"]');
  await page.type('input[name="year"]', randomYear.toString(), { delay: 100 });

} catch (error) {
    logger.error(`Task ${taskid}: Error Inputting Birthday...`);
}

async function isCheckboxChecked(selector) {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return element && element.checked;
  }, selector);
};

const privacyTermsSelector = 'input[name="privacyTerms"]';

async function clickCheckbox(selector) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      logger.warn(`Task ${taskid}: Attempting to accept Privacy Terms (Attempt ${attempts + 1})...`);
      await page.waitForSelector(selector, { visible: true });

      const isChecked = await isCheckboxChecked(selector);
      if (!isChecked) {
        try {
          await cursor.click(selector);
        } catch {
          await page.click(selector);
        }

        const isNowChecked = await isCheckboxChecked(selector);
        if (isNowChecked) {
          logger.warn(`Task ${taskid}: Successfully accepted Privacy Terms.`);
          return;
        }
      } else {
        logger.warn(`Task ${taskid}: Privacy Terms already accepted.`);
        return;
      }
    } catch (error) {
      logger.error(`Task ${taskid}: Error while trying to accept Privacy Terms: ${error}`);
      throw error;
    }
    attempts++;
  }

  logger.error(`Task ${taskid}: Failed to accept Privacy Terms after ${maxAttempts} attempts.`);
    await browser.close();
    return;
}

await clickCheckbox(privacyTermsSelector);

async function solveCaptcha() {
  try {
      const response = await fetch('https://api.capmonster.cloud/createTask', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              clientKey: settings.capmonsterKey,
              task: {
                  type: 'RecaptchaV2TaskProxyless',
                  websiteURL: page.url(),
                  websiteKey: '6LcXU9cmAAAAAMXBihp92S7rVrcL--SgaL0yLCQG'
              }
          })
      });
      const data = await response.json();

      if (data.errorId === 0) {
          return data.taskId;
      } else {
          throw new Error(data.errorCode);
      }
  } catch (error) {
      console.error('Error submitting CAPTCHA for solving:', error);
      return null;
  }
}

async function retrieveCaptchaSolution(requestId) {
  try {
      await new Promise(resolve => setTimeout(resolve, 30000));

      const solutionResponse = await fetch(`https://api.capmonster.cloud/getTaskResult`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              clientKey: settings.capmonsterKey,
              taskId: requestId
          })
      });
      const solutionData = await solutionResponse.json();

      if (solutionData.errorId === 0 && solutionData.status === 'ready') {
          return solutionData.solution.gRecaptchaResponse;
      } else {
          throw new Error(solutionData.errorCode);
      }
  } catch (error) {
      console.error('Error retrieving CAPTCHA solution:', error);
      return null;
  }
}

try {
  logger.warn(`Task ${taskid}: Submitting Account...`);
  await page.click('button[aria-label="Create Account"]');

  try {
    const recaptchaSelector = 'div[id="rc-anchor-container"]';
    const captcha = await page.$(recaptchaSelector, { timeout: 5000 });
    logger.warn(`Task ${taskid}: Captcha Found...`);

    if (captcha) {
      const requestId = await solveCaptcha();
      logger.warn(`Task ${taskid}: Solving Captcha...`);
      const solution = await retrieveCaptchaSolution(requestId);
      await page.evaluate((solution) => {
        document.querySelector('#captcha-solution-input').value = solution;
      }, solution);
      await page.click('button[aria-label="Create Account"]');

    } else {
      logger.info(`Task ${taskid}: No Captcha Found...`);
    }
  } catch (error) {
    logger.error(`Task ${taskid}: ${error}`);

  }
} catch (error) {
  logger.error(`Task ${taskid}: Error Submitting Account...`);
}

try {
  await page.waitForSelector('ul[class="pre-desktop-menu"]', { visible: true });
  logger.info(`Task ${taskid}: Account Created Successfully...`);

} catch (error) {
  logger.error(`Task ${taskid}: Error Creating Account...`);
}

while (retries < maxRetries) {
  try {
    logger.info(`Task ${taskid}: Navigating To Accounts Settings...`);
    await page.goto('https://www.nike.com/member/settings', { waitUntil: 'domcontentloaded' });
    break;

  } catch (error) {
      logger.error('Error Navigating To Account Settings')
      retries++;
      if (retries >= maxRetries) {
          logger.error(`Task ${taskid}: Failed to Load Account Settings After ${maxRetries} Attempts.`);
      }
  }
}


let attempts = 0;
let smsCode;

while (attempts < 3 && !smsCode) {
  try {
      logger.info(`Task ${taskid}: Setting Up Phone Verification...`);
      await page.waitForSelector('button[aria-label="Add Mobile Number"]', { visible: true });
      await page.click('button[aria-label="Add Mobile Number"]');

      const phoneNumberData = await getNumber(249);
      let phoneNumber = phoneNumberData.number;
      const requestId = phoneNumberData.request_id;

      if (phoneNumber.startsWith('1')) {
        phoneNumber = phoneNumber.substring(1);
      } else {
        let phoneNumber = phoneNumberData.number;
      }

      await page.waitForSelector('input[id="phoneNumber"]');
      await page.click('input[id="phoneNumber"]');
      logger.info(`Task ${taskid}: Inputting Phone Number...`);
      await page.type('input[id="phoneNumber"]', phoneNumber, { delay: 100 });

      try {
          await page.check('input[id="agreeToTerms"]');
      } catch (error) {
          await page.click('input[id="agreeToTerms"]');
      }

      try {
        await page.click('button[data-testid="send-code-button"]');
        await page.waitForSelector('input[type="number"]', { timeout: 5000 });

      } catch (error) {
        await page.click('button[data-testid="send-code-button"]');
        await page.waitForSelector('input[type="number"]', { timeout: 5000 });
      };

      smsCode = await getSmsCode(requestId);
      logger.info(`Task ${taskid}: Entering SMS Code...`);

      await page.click('input[type="number"]');
      await page.type('input[type="number"]', smsCode, { delay: 100 });
      await page.click('button[data-testid="done-button"]');

      const editButton = await page.waitForSelector('button[aria-label="Edit Mobile Number"]');

      if (editButton) {
        await browser.close();
        logger.verbose(`Task ${taskid}: Successfully Generated, Sending Webhook...`);
        
        const fileName = path.join(directory, 'nikeOutput.txt');
        fs.appendFileSync(fileName, `${accountEmail}:${accountPassword}\n`);
        
        
        let hook = new Webhook(`${settings.successWebhookUrl}`);
        hook.setUsername('Toolbox');
        const success = new MessageBuilder()
          .setTitle("Success")
          .setColor("#5665DA")
          .addField('**Module**', `Nike Account Generator`, false)
          .addField('**Email**', `||${accountEmail}||`, false)
          .addField('**Password**', `||${accountPassword}||`, false)
          .addField('**First Name**', firstName, false)
          .addField('**Last Name**', lastName, false)
          .addField('**Birthday**', formattedBirthday, false)
          .addField('**Phone Number**', phoneNumber, false)
          .addField('**Proxy**', `||${proxy}||`, false)
          .setTimestamp();
        await hook.send(success);
        await incrementTotalGenerated(licenseKey, incrementValue)
        
        let globalHook = new Webhook(``); // Set Global Webhook
        globalHook.setUsername('Toolbox');
        
        
        const globalSuccessEmbed = new MessageBuilder()
            .setTitle("Successfully Generated Nike Account!")
            .setColor("#5665DA")
            .addField('**Module**', 'Nike Account Generator', false)
            .addField('**User**', 'Anonymous', false)
            .setTimestamp();
        
        await globalHook.send(globalSuccessEmbed);

      } else {
        logger.error(`Task ${taskid}: Failed To Verify SMS...`);
        await browser.close();
        return;
      }
  } catch (error) {
      if (error.message === 'Timeout exceeded. Unable to fetch SMS code.') {
          attempts++;
          logger.warn(`Task ${taskid}: Dead Number, Retrying...`);
          await page.click('button[data-testid="dialog-close-button"]');
          await page.waitForSelector('button[aria-label="Add Mobile Number"]', { visible: true });
          await page.reload();

      } else {
          logger.error(error);
          await browser.close();
          return;
      }
    }
  }

  if (!smsCode && attempts >= 3) {
    logger.error(`Task ${taskid}: Failed To Set SMS In 3 Attempts...`);
    await browser.close();
    return;
  }
});
  allPromises.push(promise);
}
fs.writeFileSync(emailsPath, emails.join('\n'));
await Promise.all(promisePool.waiting);
}

module.exports.run = run;
module.exports.waitForCompletion = async () => {
  await Promise.all(allPromises);
};