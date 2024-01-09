const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const { Webhook, MessageBuilder } = require('discord-webhook-node');

const createColorizedLogger = require('../../../Functions/logger');
const logger = createColorizedLogger();


const run = async () => {
    const dateAnswer = await inquirer.prompt({
      type: 'input',
      name: 'date',
      message: 'What date do you want to fetch orders from? (yyyy-mm-dd)',
      validate: function (value) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return dateRegex.test(value) || 'Please enter a date in the format yyyy-mm-dd';
      },
    });
    const directory = path.join(os.homedir(), 'Toolbox');
    const nikeAccountsPath = path.join(directory, 'nikeAccounts.txt');

    if (!fs.existsSync(nikeAccountsPath)) {
      logger.error('Missing nikeAccounts.txt...');
      process.exit(1);
  }
  
const nikeAccountsData = fs.readFileSync(nikeAccountsPath, 'utf8')
await new Promise((resolve) => {
    fs.createReadStream(accountsCsvPath)
      .pipe(csvParser(['email', 'password', 'firstName', 'lastName', 'phoneNumber', 'accessToken']))
      .on('data', (row) => {
        accountsMap.set(row.email, row.accessToken);
      })
      .on('end', async () => {
        const promises = nikeAccountsData.split('\n').map(async (line) => {
            if (line) {
                const [email, password] = line.split(':');
                const taskid = uuidv4();
                const dirName = path.join(directory, 'Nike Sessions', email.split('@')[0]);
                const cookiesFilePath = path.join(dirName, 'cookies.json');
                const data = fs.readFileSync(cookiesFilePath, 'utf8');
                const cookies = JSON.parse(data);
                const cookieStrings = cookies.map(cookie => `${cookie.name}=${cookie.value}`);
                const cookieHeader = cookieStrings.join('; ');
                let accessToken = accountsMap.get(email);


                if (fs.existsSync(cookiesFilePath)) {
                    try {
                        logger.info(`Task ${taskid}: Searching For Order(s)...`);
                        const response = await fetch(`https://api.nike.com/orders/history/v1?sort=orderSubmitDateDesc&country=US&language=en&giftcards=true&filter=orderType%28SALES_ORDER%29`, {
                            method: 'GET',
                                headers: {
                                'Accept': 'application/json',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Authorization': `Bearer ${accessToken}`,
                                'Cookie': cookieHeader,
                                'Origin': 'https://www.nike.com',
                                'Referer': 'https://www.nike.com/'
                                }
                            });
                            if (response.ok) {
                                logger.info(`Task ${taskid}: Successfully Found Order(s)...`);
                            } else {
                                logger.error(`Task ${taskid}: Failed To Fetch Order(s)...`);
                            }

                            const orders = await response.json();
                            const userDate = new Date(dateAnswer.date);
                            const ordersPath = path.join(directory, 'nikeOrders.json');
                            let orderData;
                            try {
                                orderData = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
                            } catch (error) {
                                orderData = {};
                            }

                            for (let order of orders.orderItems) {
                                const orderDate = new Date(order.orderDate);
                                if (orderDate.getFullYear() === userDate.getFullYear() &&
                                    orderDate.getMonth() === userDate.getMonth() &&
                                    orderDate.getDate() === userDate.getDate()) {
                            
                                        
                                orderData[email] = {
                                    productOrderNumber: order.orderid,
                                    productTitle: order.title,
                                    productSize: order.size.replace("Size ", ""),
                                    productStyle: order.styleColor,
                                    productStatus: order.lineItemStatus,
                                    productImage: order.image
                                };
                            
                                fs.writeFileSync(ordersPath, JSON.stringify(orderData, null, 2));
                                    
                                logger.info(`Task ${taskid}: Sending Webhook...`);
                                let hook = new Webhook(`${settings.successWebhookUrl}`);
                                hook.setUsername('Toolbox');
                            
                                const success = new MessageBuilder()
                                    .setTitle("Order Found 🌙")
                                    .setColor("#5665DA")
                                    .addField('**Account**', email, false)
                                    .addField('**Product Name**', order.title, true)
                                    .addField('**Style Code**', order.styleColor, true)
                                    .addField('**Size**', order.size, true)
                                    .addField('**Order Number**', order.orderid, true)
                                    .addField('**Status**', order.lineItemStatus, true)
                                    .setThumbnail(order.image)
                                    .setTimestamp();
                                
                                        await hook.send(success);
                                    }
                                }
                        } catch (error) {
                            logger.error(`Task ${taskid}: ${error}`);
                        }
                    }
                };       
            })
            await Promise.all(promises);
            resolve();
        });
    });
};
    
module.exports.run = run;