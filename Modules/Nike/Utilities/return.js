const fs = require('fs');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const puppeteer = require('puppeteer');
const { createCursor } = require('ghost-cursor');
const { Poppler } = require("node-poppler");
const poppler = new Poppler();
const { Webhook, MessageBuilder } = require('discord-webhook-node');


const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const createColorizedLogger = require('../../../Functions/logger');
const logger = createColorizedLogger();

const returnReason = [
    'Not as expected', 
    'Item is too big', 
    'Item is too small', 
    'Quality unsatisfactory', 
    'Color not as expected', 
    'Lost/damaged in transit', 
    'Item did not arrive on time', 
    'Wrong item', 
    'Ordered multiple',
    'Damaged packaging',
    'Product is defective',
    'Didn’t like the material',
    'Arrived too late',
    'Found a better price elsewhere',
    "Just didn't like it",
    "Ordered by mistake",
    'Size did not match',
    'Too complex to use',
    'Inaccurate website description',
    'Received wrong color',
    'Not value for money',
    'Did not fit well',
    'Not required anymore',
    'Received an incomplete order',
    'Product is outdated',
    'Different from what was ordered',
    'Did not match the pictures',
    'Changed mind',
    'Not comfortable',
    'Not durable',
    'Does not meet expectation',
    'Poor quality material',
    'Not authentic',
    'Unsatisfactory customer service',
    'Product too noisy',
    'Item smells bad',
    "Doesn't work as described",
    'Prefer a different model',
    'Looks too old',
    "Doesn't suit my purpose",
    'Poor battery life',
    'Not environmentally friendly',
    'Missing parts',
    'Color faded quickly',
    'Not easy to use',
    'Delivery took too long',
    'Product too heavy',
    'Bad taste',
    'Lacks features',
    'Not safe to use',
    'Poor design',
    'Inaccurate sizing',
    'Received a used item',
    'Allergic reaction',
    'Bad side effects',
    'Difficult to assemble',
    'Too much assembly required',
    "Doesn't match my decor",
    'Lacks durability'
];

const randomIndex = Math.floor(Math.random() * returnReason.length);
const randomReturnReason = returnReason[randomIndex];

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
    const answer = await inquirer.prompt([
        {
            type: 'list',
            name: 'orderInput',
            message: 'Would you like to input email and order number or cancel a saved order?',
            choices: ['Input email and order number', 'Cancel a saved order'],
        },
    ]);
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

        if (answer.orderInput === 'Input email and order number') {
            const orderDetails = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'orderEmail',
                    message: 'Please enter the order email:',
                },
                {
                    type: 'input',
                    name: 'orderNumber',
                    message: 'Please enter the order number:',
                },
            ]);
        
            let orderEmail = orderDetails.orderEmail;
            let orderNumber = orderDetails.orderNumber;

            await page.goto('https://www.nike.com/orders/details/', { waitUntil: 'networkidle2' });
            await page.waitForSelector('input[id="orderNumber"]');
            await cursor.click('input[id="orderNumber"]');
            await page.type('input[id="orderNumber"]', orderNumber, { delay: 100 });

            await cursor.click('input[id="email"]');
            await page.type('input[id="email"]', orderEmail, { delay: 100 });


            await page.waitForSelector('button[data-testid="lookup-submit"]');
            await cursor.click('button[data-testid="lookup-submit"]');

            await page.waitForSelector('button[data-testid="returnItemsButton"]');
            await cursor.click('button[data-testid="returnItemsButton"]');


            try {
                await page.waitForSelector('select[class="nds-dropdown-select-container css-1jjxzuj erx5h8s0"]');
                await page.select('select[class="nds-dropdown-select-container css-1jjxzuj erx5h8s0"]', { value: 'notAsExpected' });
            } catch (err) {
                logger.error(err);
            }

            try {
                await cursor.click('textarea[class="nds-textarea css-mmdwhs e14657ab0"]');
                await page.type('textarea[class="nds-textarea css-mmdwhs e14657ab0"]', randomReturnReason);
            } catch (error) {
                logger.error(error);
            }

            try {
                await cursor.click('button[data-testid="Submit Return Button"]');
                await page.waitForSelector('div[id="ups-dropoff-heading"]');
                await cursor.click('div[id="ups-dropoff-heading"]');
            } catch (error) {
                logger.error(error);
            }

            try {
                await cursor.click('button[data-testid="Submit Return Button"]');
                await page.waitForSelector('div[data-testid="upsDropoff"]');
                await cursor.click('div[data-testid="upsDropoff"]');
                await cursor.click('button[aria-label="Submit Return"]');
                await page.waitForSelector('p[class="headline-4 mb1-sm"]');
            } catch (error) {
                logger.error(error);
            }

            try {
                await page.waitForSelector('a[download="label.pdf"]');
                await cursor.click('a[download="label.pdf"]');
                const download = await page.waitForEvent('download');
            
                const downloadPath = await download.path();
                const labelImg = `label.png`;
                let options = {
                    pngFile: true
                };
                
                await poppler.pdfToCairo(downloadPath, labelImg, options);
                logger.info('Successfully converted');
            
                logger.info('Sending Webhook...');
                let hook = new Webhook(`${settings.successWebhookUrl}`);
                hook.setUsername('Toolbox');
            
                const success = new MessageBuilder()
                    .setTitle("Return Submitted 🌙")
                    .setColor("#5665DA")
                    .addField('**Module**', `Return Submitter`, false)
                    .addField('**Email**', orderEmail, false)
                    .addField('**Order Number**', orderNumber, false)
                    .setImage(`attachment://${path.basename(labelImg, '.pdf')}.png`)
                    .setTimestamp();
                
                await hook.send(success);
                await browser.close();

            } catch (error) {
                logger.error(error);
            }

        } else {
            const cookiesFilePath = path.join(dirName, 'cookies.json');
                
            if (fs.existsSync(cookiesFilePath)) {
                const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
                await context.addCookies(cookies);


            }
        }
}
    
module.exports.run = run;