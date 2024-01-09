const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { v4: uuidv4 } = require('uuid');
const csvParser = require('csv-parser');
const { Webhook, MessageBuilder } = require('discord-webhook-node');


const createColorizedLogger = require('../../../../Functions/logger');
const logger = createColorizedLogger();
const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));


function findUpmId(obj) {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        try {
          let parsed = JSON.parse(obj[key]);
  
          if (parsed.upmId) {
            return parsed.upmId.replace(/"/g, "");
          }
  
          let result = findUpmId(parsed);
          if (result) {
            return result;
          }
          
        } catch (error) {}
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
          let result = findUpmId(obj[key]);
          if (result) {
              return result;
          }
      } else if (key === "upmId") {
          return obj[key];
      }
    }
    return null;
  }

const run = async () => {
    const newPasswordObject = await inquirer.prompt({
        type: 'password',
        name: 'newPassword',
        message: 'Input new password:',
        validate: function (value) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/;
            const valid = passwordRegex.test(value);
            return valid || 'Password must contain at least one lowercase letter, one uppercase letter, one numeric digit, and one special character';
        },
        mask: '*'
    });
    
    const newPassword = newPasswordObject.newPassword;
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
            const storageFilePath = path.join(dirName, 'sessionStorage.json');
            const data = fs.readFileSync(cookiesFilePath, 'utf8');
            const cookies = JSON.parse(data);
            const cookieStrings = cookies.map(cookie => `${cookie.name}=${cookie.value}`);
            const cookieHeader = cookieStrings.join('; ');
            let storageState = JSON.parse(fs.readFileSync(storageFilePath, 'utf8'));
            let uid = findUpmId(storageState);
            let accessToken = accountsMap.get(email);

            if (fs.existsSync(cookiesFilePath)) {
                try {
                    logger.info(`Task ${taskid}: Updating Password...`);
                    const response = await fetch(`https://api.nike.com/identity/password/${uid}`, {
                        method: 'PUT',
                            headers: {
                                'Accept': 'application/json',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Locale': 'en-US',
                                'Content-Type': 'application/json',
                                'Cookie': cookieHeader,
                                'Origin': 'https://www.nike.com',
                                'Referer': 'https://www.nike.com/',
                                'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                                'sec-ch-ua-mobile': '?0',
                                'sec-ch-ua-platform': '"Windows"',
                                'sec-fetch-dest': 'empty',
                                'sec-fetch-mode': 'cors',
                                'sec-fetch-site': 'same-site',
                                'x-nike-ux-id': 'HlHa2Cje3ctlaOqnxvgZXNaAs7T9nAuH'
                            },
                            body: JSON.stringify({
                                'existingPassword': password,
                                'newPassword': newPassword
                            })
                        });
                        if (response.ok) {
                            logger.info(`Task ${taskid}: Successfully Updated Password...`);
                        } else {
                            logger.error(`Task ${taskid}: Failed To Update Password...`);
                        }

                        let hook = new Webhook(`${settings.successWebhookUrl}`);
                        hook.setUsername('Toolbox');

                                const success = new MessageBuilder()
                                    .setTitle("Password Updated 🌙")
                                    .setColor("#5665DA")
                                    .addField('**Module**', `Nike Password Updater (Request)`, false)
                                    .addField('**Account**', `||${email}||`, false)
                                    .addField('**Old Password**', `||${password}||`, false)
                                    .addField('**New Password**', `||${newPassword}||`, false)
                                    .setTimestamp();
                                try {
                                    await hook.send(success);
                                } catch (err) {
                                    logger.error(err);
                                }
                        } catch (error) {
                            logger.error(error);
                        }
                    };
                }
            })
            await Promise.all(promises);
            resolve();      
        });
    })
};   
module.exports.run = run;