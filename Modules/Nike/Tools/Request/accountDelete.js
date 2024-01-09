const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const csvParser = require('csv-parser');


const createColorizedLogger = require('../../../../Functions/logger');
const logger = createColorizedLogger();


const run = async () => {
    const directory = path.join(os.homedir(), 'Toolbox');
    const nikeAccountsPath = path.join(directory, 'nikeAccounts.txt');
    const accountsCsvPath = path.join(directory, 'accounts.csv');
    let accountsMap = new Map();

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
                if (!fs.existsSync(cookiesFilePath)) {
                    logger.error(`No active session for ${email}`);
                    return;
                };
                const data = fs.readFileSync(cookiesFilePath, 'utf8');
                const cookies = JSON.parse(data);
                const cookieStrings = cookies.map(cookie => `${cookie.name}=${cookie.value}`);
                const cookieHeader = cookieStrings.join('; ');
                let accessToken = accountsMap.get(email);


                if (fs.existsSync(cookiesFilePath)) {
                    try {
                        logger.info(`Task ${taskid}: Deleting Account...`);
                        const response = await fetch(`https://gdpr.nike.com/delete/me/v1`, {
                            method: 'DELETE',
                                headers: {
                                    'Accept': 'application/json',
                                    'Accept-Language': 'en-US,en;q=0.9',
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Cookie': cookieHeader,
                                    'Origin': 'https://www.nike.com',
                                    'Referer': 'https://www.nike.com/',
                                    'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                                    'sec-ch-ua-mobile': '?0',
                                    'sec-ch-ua-platform': '"Windows"',
                                    'sec-fetch-dest': 'empty',
                                    'sec-fetch-mode': 'cors',
                                    'sec-fetch-site': 'same-site'
                                }
                            });
                            if (response.ok) {
                                logger.info(`Task ${taskid}: Successfully Deleted Account...`);
                            } else {
                                logger.error(`Task ${taskid}: Failed To Delete Account...`);
                            }
                        } catch (error) {
                            logger.error(`Task ${taskid}: Error Deleting Account...`);
                        }
                    };        
                };
            })
            await Promise.all(promises);
            resolve();
        })
    });
};
    
module.exports.run = run;