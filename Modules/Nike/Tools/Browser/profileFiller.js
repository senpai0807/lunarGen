const fs = require('fs');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');

const createColorizedLogger = require('../../../../Functions/logger');
const logger = createColorizedLogger();
const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const stateAbbreviations = {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'District of Columbia': 'DC',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Pennsylvania': 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY'
};

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
              logger.error(`No active session for ${email}`);
            };

        const profilesPath = path.join(directory, 'profiles.json');
        const profilesData = fs.readFileSync(profilesPath, 'utf-8');
        const profiles = JSON.parse(profilesData);

        const profile = profiles.find(profile => profile.billingAddress.email === email);
        let cardNumber = '';
        let expirationDate = '';
        let cvv = '';

        let firstName = '';
        let lastName = '';
        let address1 = '';
        let address2 = '';
        let city = '';
        let zipCode = '';
        let phoneNumber = '';
        let stateAbbreviation = '';
    
if (profile) {
    cardNumber = profile.paymentDetails.cardNumber;
    expirationMonth = profile.paymentDetails.cardExpMonth;
    expirationYear = profile.paymentDetails.cardExpYear;
    expirationDate = expirationMonth + expirationYear.substring(2);
    cvv = profile.paymentDetails.cardCvv;

    let fullName = profile.billingAddress.name;
    [firstName, ...lastName] = fullName.split(' ');
    lastName = lastName.join(' ');
    address1 = profile.billingAddress.line1;
    address2 = profile.billingAddress.line2;
    city = profile.billingAddress.city;
    zipCode = profile.billingAddress.postCode;
    let state = profile.billingAddress.state;
    stateAbbreviation = stateAbbreviations[state];
    country = profile.billingAddress.country;
    phoneNumber = profile.billingAddress.phone;

} else {
    return;
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
    await page.goto('https://www.nike.com/us/member/settings/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[class="nds-btn css-ew3ocj btn-primary-dark  btn-md"]');
    await cursor.click('button[class="nds-btn css-ew3ocj btn-primary-dark  btn-md"]');
    await page.waitForSelector('h2[class="headline-3 mb3-sm mb9-lg css-1ook0yt enurkn00"]');
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
        logger.info(`Task ${taskid}: Phone Verified...`);
    }
};

try {
    await cursor.click('div[aria-label=" Delivery Addresses"]');
    await page.waitForSelector('h2[class="headline-3 mb3-sm mb9-lg css-1ook0yt enurkn00"]');

 try {
    await page.waitForSelector('button[data-testid="edit-button"]', { timeout: 5000 });
    logger.info(`Task ${taskid}: Default Address Already Set...`);
        
} catch (error) {
    logger.warn(`Task ${taskid}: Filling Account Defaults...`);
    await page.waitForSelector('button[data-testid="add-address"]');
    await cursor.click('button[data-testid="add-address"]');
    await page.waitForSelector('input[id="nameGiven"]');

    logger.info(`Task ${taskid}: Inputting Address Default...`);
    await page.type('input[id="nameGiven"]', firstName, { delay: 100 });
    await page.type('input[id="nameFamily"]', lastName, { delay: 100 });
    await page.type('input[id="line1"]', address1, { delay: 100 });
    await page.type('input[id="line2"]', address2, { delay: 100 });
    await page.type('input[id="locality"]', city, { delay: 100 });
    await page.type('input[id="code"]', zipCode, { delay: 100 });


    await page.select('select[id="province"]', stateAbbreviation);
    await page.type('input[id="phone"]', phoneNumber, { delay: 100 });

    await cursor.click('input[id="preferred"]');
    await page.click('button[data-testid="submit-button"]');
    await page.waitForSelector('div[data-testid="entered-address"]');
    await cursor.click('div[data-testid="entered-address"]');
    await cursor.click('button[data-testid="submit-validated-address-button"]');
    await page.waitForSelector('div[data-testid="address-item"]');
    await sleep(10000);
    logger.info(`Task ${taskid}: Successfully Set Address Default...`)

}} catch (error) {
    logger.error(`Task ${taskid}: ${error}`);
    await browser.close();
    return;
}

try {
    await cursor.click('div[aria-label=" Payment Methods"]');
        try {
            await page.waitForSelector('button[class="nds-btn underline d-sm-ib css-ve57e ex41m6f0 cta-primary-dark underline"]', { timeout: 5000 });
            logger.info(`Task ${taskid}: Default Payment Already Set...`);

        } catch (error) {
            logger.info(`Task ${taskid}: Inputting Payment Default...`)
            await cursor.click('button[class="nds-btn add-new-button css-1hizdnv ex41m6f0 btn-primary-dark  btn-responsive"]');
            const frameElement = await page.waitForSelector('iframe[title="Payment Options"]');
            const frame = await frameElement.contentFrame();


            await frame.type('input[id="creditCardNumber"]', cardNumber, { delay: 100 });
            await frame.type('input[id="expirationDate"]', expirationDate, { delay: 100 });
            await frame.type('input[id="cvNumber"]', cvv, { delay: 100 });


            await cursor.click('input[id="billingAddress.sameAsDefaultShipping"]');
            await cursor.click('input[id="preferred"]');
            await cursor.click('button[class="nds-btn save-payment-button mb6-sm mb0-md css-f2fyoj ex41m6f0 btn-primary-dark  btn-responsive"]');
            await page.waitForSelector('div[class="payment-method"]');
            logger.info(`Task ${taskid}: Successfully Set Payment Default...`);
        }
} catch (error) {
    logger.error(`Task ${taskid}: Error Setting Default Payment...`);
    await browser.close();
    return;
};
 

        logger.info(`Task ${taskid}: Successfully Filled Account...`);
        await browser.close();
        if (index < nikeAccountsData.length - 1) {
            logger.http(`Task ${taskid}: Looping Task In 15s...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    });
}})
    await Promise.all(promises);
};
    
module.exports.run = run;