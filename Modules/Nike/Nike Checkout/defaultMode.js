const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const { Sema } = require('async-sema');
const moment = require('moment-timezone');
const notifier = require('node-notifier');
const wavPlayer = require('node-wav-player');
const puppeteer = require('puppeteer-extra');
const { createCursor } = require('ghost-cursor');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { incrementTotalCheckouts } = require('../../../Functions/analyticsUpdate');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())


const overrideProperties = require('./Dependencies/Functions/fingerprint');
const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
let licenseKey = settings.licenseKey;
const incrementValue = 1
const createColorizedLogger = require('../../../Functions/logger');
const logger = createColorizedLogger();
let startTime;
let endTime;
let checkoutTime;


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
        case 'Chrome':
        case 'Google':
            options.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
            break;
        case 'Brave':
            options.executablePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
            break;
        case 'Microsoft Edge':
        case 'Edge':
            options.executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
            break;

        default:
            throw new Error(`Unsupported browser: ${browserName}`);
    }

    browser = await puppeteer.launch(options);

    return browser;
};

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

function splitIntoGroups(array, groupSize) {
    const groups = [];
    while (array.length) {
        groups.push(array.splice(0, groupSize));
    }
    return groups;
}

const semaphore = new Sema(settings.concurrentBrowsers, { capacity: settings.concurrentBrowsers });

const launchTask1 = async (line, sku, sizes, productURL, profiles, proxies, fillDetails, useAttachedProxies) => {
    if (line) {
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
        const storageFilePath = path.join(dirName, 'storageState.json');
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
    
    if (!fs.existsSync(cookiesFilePath)) {
        return;
    };
    
    const browser = await launchBrowser(settings.browserName, ip, port);
    const page = await browser.newPage();
    await overrideProperties(page);
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
    if (fs.existsSync(cookiesFilePath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
        const localStorage = fs.readFileSync(path.join(dirName, 'localStorage.json'), 'utf8');
        const sessionStorage = fs.readFileSync(path.join(dirName, 'sessionStorage.json'), 'utf8');

        await page.setCookie(...cookies);
        await page.evaluate(savedLocalStorage => { localStorage = JSON.parse(savedLocalStorage); }, localStorage);
        await page.evaluate(savedSessionStorage => { sessionStorage = JSON.parse(savedSessionStorage); }, sessionStorage);

        logger.info(`Task ${taskid}: Navigating To Account Settings...`);
        await page.goto(`https://www.nike.com/us/member/settings/`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('button[type="submit"]');
        await sleep(5000);
        await page.click('button[type="submit"]');
        await page.waitForSelector('h2[class="headline-3 mb3-sm mb9-lg css-1ook0yt enurkn00"]');

    };
} catch (error) {
    logger.error(`Task ${taskid}: Error Navigating To Account Settings...`);
};


try {
    if (fillDetails) {
        try {
            await cursor.click('div[aria-label=" Delivery Addresses"]');
            await page.waitForSelector('h2[class="headline-3 mb3-sm mb9-lg css-1ook0yt enurkn00"]');

         try {
            await page.waitForSelector('button[data-testid="edit-button"]', { timeout: 5000 });
            logger.info(`Task ${taskid}: Default Address Already Set...`);
                
        } catch (error) {
            logger.warn(`Task ${taskid}: Filling Account Defaults...`);
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
            await sleep(2500)
            await cursor.click('button[data-testid="submit-button"]');
            await page.waitForSelector('div[data-testid="entered-address"]');
            await cursor.click('div[data-testid="entered-address"]');
            await sleep(2500)
            await cursor.click('button[data-testid="submit-validated-address-button"]');
            await page.waitForSelector('div[data-testid="address-item"]');
            await sleep(5000);
            logger.info(`Task ${taskid}: Successfully Set Address Default...`)
        }
    } catch (error) {
        logger.error(`Task ${taskid}: Error Setting Default Address...`);
    }


    try {
         await page.click('div[aria-label=" Payment Methods"]');
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
                await sleep(2500)
                await cursor.click('input[id="preferred"]');
                await sleep(2500)
                await cursor.click('button[class="nds-btn save-payment-button mb6-sm mb0-md css-f2fyoj ex41m6f0 btn-primary-dark  btn-responsive"]');
                await page.waitForSelector('div[class="payment-method"]');
                logger.info(`Task ${taskid}: Successfully Set Payment Default...`);
            }
        } catch (error) {
            logger.error(`Task ${taskid}: Error Setting Default Payment...`);
        }
    }
} catch (error) {
    logger.error(`Task ${taskid}: Error Setting Account Defaults...`);
} 
    
try {
    logger.info(`Task ${taskid}: Navigating To Product Page...`);
    await page.goto(productURL, { waitUntil: 'domcontentloaded' });

    let pageContent = await page.content();
    while (pageContent.includes('502 Bad Gateway')) {
        logger.info(`Task ${taskid}: 502 Bad Gateway error, reloading page...`);
        await page.reload({ waitUntil: 'domcontentloaded' });
        pageContent = await page.content();
    }

} catch (error) {
    logger.error(`Task ${taskid}: Error Navigating To Product Page...`);
};

let title = "";
let size = "";
let image = "";
    
try {
    let response = await fetch(`https://api.nike.com/product_feed/threads/v2?filter=language(en)&filter=marketplace(US)&filter=channelId(d9a5bc42-4b9c-4976-858a-f159cf99c647)&filter=productInfo.merchProduct.styleColor(${sku.toUpperCase()})`)
    let responseData = await response.json();
    
    if (responseData.objects.length === 0) {
        logger.warn(`${sku.toUpperCase()} Not Found, Retrying...`);

        response = await fetch(`https://api.nike.com/product_feed/threads/v3/?filter=marketplace%28US%29&filter=language%28en%29&filter=channelId%28010794e5-35fe-4e32-aaff-cd2c74f89d61%29&filter=exclusiveAccess%28true%2Cfalse%29&filter=productInfo.merchProduct.styleColor(${sku.toUpperCase()})`);
        responseData = await response.json();

        if (responseData.objects.length === 0) {
            logger.error(`${sku.toUpperCase()} Not Loaded...`);
            return;
        }
    }
    
    for (const product of responseData.objects) {
        const data = product.productInfo[0];
        const launchMethod = data.launchView.method.toString();
        const threadId = product.id;
        const productId = data.merchProduct.id;
        const channel = product.channelName;
        const launchId = data.launchView.id;
        const dropTimeMoment = moment.tz(data.launchView.startEntryDate, 'UTC');
        dropTimeMoment.tz('America/New_York');

        title = data.productContent.title
        //image = data.imageUrls.productImageUrl
    
        const threadIdString = threadId.toString();
        const productIdString = productId.toString();
        const channelString = channel.toString().toLowerCase();
        const launchIdString = launchId.toString();
        const randomSizeIndex = Math.floor(Math.random() * sizes.length);
        size = sizes[randomSizeIndex];
        logger.info(`Task ${taskid}: Size: ${size} - CVV: ${cvv}`);
    
        const checkoutForm = `https://www.nike.com/US/en/launch-checkout?productId=${productIdString}&threadId=${threadIdString}&channel=${channelString}&size=${size}`;
    
        logger.info(`Task ${taskid}: Navigating To Checkout Form...`);
        await page.goto(checkoutForm, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('div[data-qa="shipping-section"]');
        const frameElement = await page.waitForSelector('iframe[title="creditCardIframeForm"]');
        const frame = await frameElement.contentFrame();

        await sleep(5000);
        logger.info(`Task ${taskid}: Inputting CVV...`);
        await frame.type('input[id="cvNumber"]', cvv, { delay: 100 });


        const buttons = await page.$$('button[class="ncss-btn-primary-dark btn-lg selectable"]');
        await buttons[0].click();

        const waitTime = dropTimeMoment.valueOf() - moment().valueOf();
        logger.warn(`Task ${taskid}: Waiting Until ${dropTimeMoment.format(`MM/DD/YYYY, h:mm:ss A`)}`);

    return { page, browser, taskid, waitTime, title, image, launchIdString, size, sku };

    };
} catch (error) {
    logger.error(`Task ${taskid}: ${error}`);
    await browser.close();
    return;
    }};
}

const launchTask2 = async ({ page, browser, taskid, waitTime, title, image, launchIdString, size, sku, accountsCsvPath, email }) => {
    await sleep(waitTime);
    const accountsMap = new Map();
    await new Promise((resolve) => {
        fs.createReadStream(accountsCsvPath)
        .pipe(csvParser(['email', 'password', 'firstName', 'lastName', 'phoneNumber', 'accessToken']))
        .on('data', (row) => {
            accountsMap.set(row.email, row.accessToken);
        })
        .on('end', resolve);
    });

    let accessToken = accountsMap.get(email);
    if (!accessToken) {
        throw new Error(`Access token not found for email: ${email}`);
    }

    let jobId = null;
    page.on('request', request => {
        if (request.url().startsWith('https://api.nike.com/payment/preview/v2/jobs/')) {
            jobId = request.url().split('/').pop();
        }
    });
    const cookies = await page.cookies();

while (true) {
    try {
        await page.waitForSelector('button[data-qa="save-button"]', {timeout: 2500});
        await cursor.click('button[data-qa="save-button"]');
            
        while (!jobId) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const jobIdResponse = await fetch(`https://api.nike.com/payment/preview/v2/jobs/${jobId}`, {
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.7',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'Origin': 'https://www.nike.com',
                'Referer': 'https://www.nike.com/'
            }
        });
            
         const jobIdResponseData = await jobIdResponse.json();
            
        if (jobIdResponseData.status === 'COMPLETED') {
            logger.info(`Task ${taskid}: Entry Submitted`);
            break;
        } else {
            logger.warn(`Task ${taskid}: Entry not completed yet. Retrying...`);
             await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error) {
        logger.error(`Task ${taskid}: ${error}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
    
    try {
        const startTime = new Date().getTime();
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        const fetchResult = async () => {
            const resultRequest = await fetch(`https://api.nike.com/launch/entries/v2?filter=launchId(${launchIdString})`, {
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.7',
                    'Cookie': cookieString,
                    'Authorization': `Bearer ${accessToken}`,
                    'content-type': 'application/json; charset=UTF-8'
                }
            });
        
            const resultRequestData = await resultRequest.json();
            if (resultRequestData.objects && resultRequestData.objects.length > 0 && resultRequestData.objects[0].result) {
                const result = resultRequestData.objects[0].result;
        
                if (result.status || result.reason) {
                    return result;
                }
            }
            throw new Error('Result is not yet available.');
        }
    
        let status, reason;
        
        while(true) {
            try {
                const result = await fetchResult();
                status = result.status;
                reason = result.reason;
                endTime = new Date().getTime();
        
                if (status === "NON_WINNER") {
                    logger.error(`Task ${taskid}: ${status} - ${reason}`)
                
                    notifier.notify({
                        title: 'Checkout Failure',
                        message: `Product: ${title}\nStyle Code: ${sku}\nSize: ${size}`,
                        sound: false
                    });
                    break;
                }
        
                else if (status === "WINNER") {
                    logger.verbose(`Task ${taskid}: Checkout Success 🌙...`);
                    checkoutTime = endTime - startTime;
                    let hook = new Webhook(`${settings.successWebhookUrl}`);
                    hook.setUsername('Toolbox');
        
                    const success = new MessageBuilder()
                        .setTitle("Checkout Success 🌙")
                        .setColor("#50C878")
                        .addField('**Site**', 'Nike US', true)
                        .addField('**Product**', title, true)
                        .addField('**Style Color**', sku, true)
                        .addField('**Size**', size, true)
                        .addField('**Results Time**', `${checkoutTime}ms`, true)
                        .addField('**Account**', email, false)
                        .setThumbnail(image)
                        .setTimestamp();
        
                    try {
                        await incrementTotalCheckouts(licenseKey, incrementValue)
                        await hook.send(success).then(() => {
                            const audioFilePath = path.resolve(__dirname, './Dependencies/success.wav');
                            wavPlayer.play({ path: audioFilePath }).catch((error) => {
                                console.error('Error playing the sound:', error);
                            });
        
                        notifier.notify({
                            title: 'Checkout Success',
                            message: `Product: ${title}\nStyle Code: ${sku}\nSize: ${size}\nOrder Number: ${orderNumber}`,
                            sound: false
                        });
                    });
        
                    } catch (err) {
                        logger.error(err);
                    } 

                const globalSuccess = new MessageBuilder()
                    .setTitle("Checkout Success")
                    .setColor("#50C878")
                    .addField('**Site**', 'Nike US', true)
                    .addField('**Product**', title, true)
                    .addField('**Style Color**', sku, true)
                    .addField('**Size**', size, true)
                    .addField('**Results Time**', `${checkoutTime}ms`, true)
                    .setThumbnail(image)
                    .setTimestamp();
                    await hook.send(globalSuccess)

                    break;
                }
            } catch (error) {
                if (error.message === 'Result is not yet available.') {
                    logger.info(`Task ${taskid}: Waiting For Results...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    logger.error(`Task ${taskid}: Unexpected error: ${error}`);
                }
            }
        }
    } catch (error) {
        logger.error(`Task ${taskid}: ${error}`);
    };
};

const run = async () => {
    const answer = await inquirer.prompt([
        {
            type: 'input',
            name: 'sku',
            message: 'Please enter the SKU:',
        },
        {
            type: 'input',
            name: 'sizes',
            message: 'Please enter sizes separated by comma (e.g., 8,9,10,11,12,13):',
        },
        {
            type: 'confirm',
            name: 'fillDetails',
            message: 'Do you want to fill your accounts with profile details?',
            default: false
        },
        {
            type: 'confirm',
            name: 'useAttachedProxies',
            message: 'Do you want to use the proxies attached to the accounts?',
            default: false
        },
        {
            type: 'confirm',
            name: 'scheduleTask',
            message: 'Do you want to schedule your task?',
            default: false
          },
          {
            type: 'input',
            name: 'scheduleTime',
            message: 'Please enter the Unix timestamp of the scheduled time:',
            when: (answers) => answers.scheduleTask,
          }
    ]);

    const skus = answer.sku.toUpperCase().split(',').map(sku => sku.trim());
    const sizesInput = answer.sizes;
    const fillDetails = answer.fillDetails;
    const useAttachedProxies = answer.useAttachedProxies;

    if (!skus || !sizesInput) {
        logger.error('SKU and sizes are required. Please try again.');
        return;
    }

    const sizes = sizesInput.split(',').map(size => size.trim());

    const directory = path.join(os.homedir(), 'Toolbox');
    const proxiesPath = path.join(directory, 'proxies.txt');
    let proxiesData = fs.readFileSync(proxiesPath, 'utf8').split('\n');
    let proxies = [];

    proxiesData.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [ip, port, username, passwordProxy] = line.split(':');
            if (ip && port && username && passwordProxy) {
                proxies.push(line);
            } else {
                logger.warn(`Invalid proxy configuration: ${line}`);
            }
        }
    });

    const nikeAccountsPath = path.join(directory, 'nikeAccounts.txt');

    if (!fs.existsSync(nikeAccountsPath)) {
        logger.error('Missing nikeAccounts.txt...');
        process.exit(1);
    };

    const lines = fs.readFileSync(nikeAccountsPath, 'utf8').split('\n');
    const groups = splitIntoGroups(lines, settings.concurrentBrowsers);
    const profilesPath = path.join(directory, 'profiles.json');
    const profilesData = fs.readFileSync(profilesPath, 'utf-8');
    const profiles = JSON.parse(profilesData);

    if (answer.scheduleTask) {
        const scheduleTime = moment.unix(answer.scheduleTime);
        const currentTime = moment();
      
        if (scheduleTime.isAfter(currentTime)) {
          const waitTime = scheduleTime.diff(currentTime);
          logger.warn(`Task scheduled for: ${scheduleTime.format('MM/DD/YYYY HH:mm:ss')}`);
      
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          logger.warn(`The entered time (${scheduleTime.format('MM/DD/YYYY HH:mm:ss')}) is in the past, please enter a future time.`);
          return;
        }
      }

      let task1Promises = [];
      let task1Data = [];
  
      for (let sku of skus) {
          const productURL = 'https://www.nike.com/us/t/-/' + sku;
          for (let group of groups) {
            let tasks1 = group.map(line => () => {
                return new Promise(async (resolve) => {
                    await semaphore.acquire();
                    try {
                        const taskData = await launchTask1(line, sku, sizes, productURL, profiles, proxies, fillDetails, useAttachedProxies);
                        if (taskData !== undefined) {
                            task1Data.push(taskData);
                        }
                    } finally {
                        semaphore.release();
                        resolve();
                    }
                });
            });
            task1Promises.push(...tasks1);
          }
      }
  
      const chunkSize = settings.concurrentBrowsers;
        for (let i = 0; i < task1Promises.length; i += chunkSize) {
            const chunk = task1Promises.slice(i, i + chunkSize);
            await Promise.all(chunk.map(task => task()));
        }
        
      let tasks2 = task1Data.map(taskData => async () => {
          await semaphore.acquire();
          try {
              return await launchTask2(taskData);
          } finally {
              semaphore.release();
          }
      });
  
      let results = await Promise.allSettled(tasks2.map(task => task()));
      results.forEach((result, index) => {
          if (result.status === 'rejected') {
              logger.error(`Task ${index + 1} failed with reason: ${result.reason}`);
          }
      });
  };

module.exports.run = run;