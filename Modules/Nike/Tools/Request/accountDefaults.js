const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const csvParser = require('csv-parser');


const createColorizedLogger = require('../../../../Functions/logger');
const logger = createColorizedLogger();

function getRandomShoeSize() {
    return (Math.floor(Math.random() * 29) + 8) / 2;
}


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
  
          let shoeSize = getRandomShoeSize().toString();
          var genders = ['MENS', 'WOMENS'];
          var randomGender = genders[Math.floor(Math.random() * genders.length)];

          if (fs.existsSync(cookiesFilePath)) {
              try {
                  logger.info(`Task ${taskid}: Setting Account Defaults...`);
                  const response = await fetch(`https://api.nike.com/identity/user/v1/${uid}`, {
                      method: 'PATCH',
                          headers: {
                              'Accept': 'application/json',
                              'Accept-Language': 'en-US,en;q=0.9',
                              'Authorization': `Bearer ${accessToken}`,
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
                              'measurements': {
                                  'shoeSize': shoeSize,
                                },
                                'preferences': {
                                  'distanceUnit': 'IMPERIAL',
                                  'heightUnit': 'IMPERIAL',
                                  'shoppingGender': randomGender,
                                  'weightUnit': 'IMPERIAL',
                                  'secondaryShoppingPreference': [
                                    'GIRLS',
                                    'BOYS',
                                    'WOMENS'
                                  ]
                                }
                          })
                      });
                      if (response.ok) {
                          logger.info(`Task ${taskid}: Successfully Set Account Defaults...`);
                        } else {
                          logger.error(`Task ${taskid}: Failed To Set Defaults...`);
                        }
                    } catch (error) {
                      logger.error(`Task ${taskid}: Error Setting Defaults...`);
                    }
          };        
        };
      });
      await Promise.all(promises);
      resolve();
    })
  })
};
    
module.exports.run = run;