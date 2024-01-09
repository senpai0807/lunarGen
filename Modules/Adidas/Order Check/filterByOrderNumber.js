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
    const { orderNumber } = await inquirer.prompt({
        type: 'input',
        name: 'orderNumber',
        message: 'Enter the order number you want to fetch:',
        validate: function (value) {
            var input = value.trim();
            return input.startsWith('AD') || 'Please enter a valid order number starting with "AD"';
        },
    });

    const { orderEmail } = await inquirer.prompt({
        type: 'input',
        name: 'orderEmail',
        message: 'Enter the email associated with the order:',
        validate: function (value) {
            var input = value.trim();
            return input.includes('@') || 'Please enter a valid email address.';
        },
    });
     
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
        logger.info(`Task ${taskid}: Navigating To Order Page...`);
        await page.goto('https://www.adidas.com/us/order-tracker', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('h1[data-auto-id="order-tracker-page-title"]');

    } catch (error) {
        logger.error(`Task ${taskid}: Error Loading Orders Page...`);
        retries++;
        if (retries >= maxRetries) {
            logger.error(`Task ${taskid}: Failed to Load Orders Page After ${maxRetries} Attempts.`);
        }
    }
}

while (retries < maxRetries) {
    try {
        logger.info(`Task ${taskid}: Inputting Order Number...`);
        await cursor.click('input[id="order-tracker-page-order-number-field"]')
        await page.type('input[id="order-tracker-page-order-number-field"]', orderNumber, { delay: 100 });

    } catch (error) {
        logger.error(`Task ${taskid}: Erroring Inputting Order Number...`);
        retries++;
        if (retries >= maxRetries) {
            logger.error(`Task ${taskid}: Failed To Input Order Number After ${maxRetries} Attempts.`);
        }
    }
}

while (retries < maxRetries) {
    try {
        await page.waitForSelector('input[id="order-tracker-page-email-field"]');
        logger.info(`Task ${taskid}: Inputting Order Email...`);
        await cursor.click('input[id="order-tracker-page-email-field"]')
        await page.type('input[id="order-tracker-page-email-field"]', orderEmail, { delay: 100 });
        await cursor.click('button[data-auto-id="order-tracker-page-view-order-button"]');

    } catch (error) {
        logger.error(`Task ${taskid}: Error Inputting Order Email...`);
        retries++;
        if (retries >= maxRetries) {
            logger.error(`Task ${taskid}: Failed To Input Order Email After ${maxRetries} Attempts.`);
        }
    }
}          

try {
    await page.waitForSelector('div[data-auto-id="order-shipment-estimated-delivery-date-label"]');
    logger.info(`Task ${taskid}: Successfully Found Order...`);
} catch (error) {
    logger.error(`Task ${taskid}: Invalid Order...`);
};
        
try {
    logger.info(`Task ${taskid}: Fetching Recent Order...`);
    
    const orderNumber  = await page.$eval('ul.gl-vspace li:first-child', el => el.innerText);
    let estimatedDelivery;
    try {
        estimatedDelivery = await page.$eval('div[data-auto-id="order-shipment-expected-delivery-date-date"]', el => el.innerText);
    } catch (error) {
        estimatedDelivery = 'N/A';
    }
    const orderAddress = await page.$$eval('address[data-auto-id="order-details-address-shipping"] ul li', lis => lis.map(li => li.innerText).join('\n'));
    const productTitle = await page.$eval('h3[data-auto-id="product-name"]', el => el.innerText);
    const productSize = await page.$eval('dd[data-auto-id="product-size"]', el => el.innerText.replace("Size ", ""));
    const productSKU = await page.$eval('dd[data-auto-id="product-code"]', el => el.innerText.replace("Style ", ""));
    const productStatus = await page.$eval('div[data-testid="status-label"]', el => el.innerText);
    
    await page.waitForSelector('img[data-auto-id="image"]');
    const productImage = await page.$eval('img[data-auto-id="image"]', el => el.getAttribute('src'));

    
    logger.info(`Task ${taskid}: Sending Webhook...`);
    let hook = new Webhook(`${settings.successWebhookUrl}`);
    hook.setUsername('Toolbox');
    hook.setAvatar('https://imgur.com/Vn4CEtQ.png');
    
const success = new MessageBuilder()
    .setTitle("Order Found 🌙")
    .setURL(page.url().toString())
    .setColor("#5665DA")
    .addField('**Product Name**', productTitle, true)
    .addField('**Product Code**', productSKU, true)
    .addField('**Size**', productSize, true)
    .addField('**Status**', productStatus, true)
    .addField('**Estimated Delivery**', estimatedDelivery, true)
    .addField('**Order Number**', orderNumber, true)
    .addField('**Shipping Address**', `||${orderAddress}||`, false)
    .setThumbnail(productImage)
    .setTimestamp();
    await hook.send(success);

} catch (err) {
    logger.error(`Task ${taskid}: ${err}`);
};

await browser.close();

};

module.exports.run = run;