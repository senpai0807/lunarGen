const fs = require('fs');
const os = require('os');
const path = require('path');
var Spinner = require('cli-spinner').Spinner;
const { exec } = require('child_process');
const player = require('node-wav-player');

const createColorizedLogger = require('./Functions/logger');
const logger = createColorizedLogger();

const checkForUpdates = require('./Functions/checkForUpdate');
const Analytics = require('./src/analytics');


const packageJson = require('./package.json');
const localVersion = packageJson.version;

const directory = path.join(os.homedir(), 'Toolbox');

function createFiles() {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

    const filesToCheck = ['adidasAccounts.txt', 'emails.txt', 'nikeAccounts.txt', 'proxies.txt', 'nikeOrders.json', 'settings.json'];
    const directoriesToCheck = ['Nike Sessions', 'Adidas Sessions', 'Dependencies'];

    const settingsContent = {
      licenseKey: "",
      successWebhookUrl: "",
      catchall: "",
      imapEmail: "",
      imapPassword: "",
      smsManToken: "",
      capmonsterKey: "",
      concurrentBrowsers: "",
      browserName: "",
      fileType: "",
      playStartMusic: "false",
      monitorKeywords: "",
      playMonitorSound: "false"
    };

    directoriesToCheck.forEach(directory => {
      const directoryPath = path.join(directory, directory);
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
      }
    });

    filesToCheck.forEach((file, index) => {
      const filePath = path.join(directory, file);
      if (!fs.existsSync(filePath)) {
        if (file === 'settings.json') {
          fs.writeFileSync(filePath, JSON.stringify(settingsContent, null, 2));
          logger.warn(`${file} was created.`);
        } else if (file === 'nikeOrders.json') {
          fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
          logger.warn(`${file} was created.`);
        } else {
          fs.writeFileSync(filePath, '');
          logger.warn(`${file} was created.`);
        }
      } else if (file === 'settings.json') {
        const existingSettings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const updatedSettings = { ...settingsContent, ...existingSettings };
        fs.writeFileSync(filePath, JSON.stringify(updatedSettings, null, 2));
      }
      
        if (index === filesToCheck.length - 1) {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}



const { Client } = require('discord-rpc');
const client = new Client({ transport: 'ipc' });

const clientId = ''; // Set client ID if you want to use RPC

const loginInterval = setInterval(() => {
  client.login({ clientId }).catch((error) => {
  });
}, 10000);

client.on('ready', () => {
  client.setActivity({
    state: 'Getting Help From Toolbox',
    details: 'Version ' + localVersion + ' Beta',
    startTimestamp: new Date(),
    largeImageKey: '', // Set Image
    instance: true,
  });
  
  clearInterval(loginInterval);
});

function setWindowTitle(title) {
  exec(`title ${title}`, (error) => {
    if (error) {
      console.error(`An error occurred: ${error}`);
    }
  });
}

async function main() {
  var spinner = new Spinner('Loading Toolbox... %s');
  spinner.start();

setTimeout(() => {
  spinner.stop(true);
  const toolboxArt = `
  _______          _ _               
 |__   __|        | | |              
    | | ___   ___ | | |__   _____  __
    | |/ _ \ / _ \| | '_ \ / _ \ \/ /
    | | (_) | (_) | | |_) | (_) >  < 
    |_|\___/ \___/|_|_.__/ \___/_/\_\
`

console.log(toolboxArt);
  createFiles().then(async () => {
    const settingsPath = path.join(directory, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const dependenciesPath = path.join(directory, 'Dependencies')
    fs.readdir(dependenciesPath, (err, files) => {
          if (err) {
            console.error("Error reading the directory:", err);
            return;
          }
        
          const wavFiles = files.filter(file => path.extname(file).toLowerCase() === '.wav');
        
          wavFiles.forEach(wavFile => {
            const wavFilePath = path.join(dependenciesPath, wavFile);
        
          if (settings.playStartMusic === 'true') {
            player.play({
              path: wavFilePath,
              sync: true
            }).catch((error) => {
              console.error(error);
            });
          }
        });
      })

    logger.http('Checking For Updates...');
    await checkForUpdates().catch((err) => {
        logger.error('Error Updating Application:', err);
      });
      logger.warn('Logging in...');
      const toolbox = require('./src/index');
      await toolbox();
      const analytics = await Analytics.findOne({ licenseKey: settings.licenseKey });
      setWindowTitle(`Toolbox v${localVersion} - TC: ${analytics.totalCheckouts} - TG: ${analytics.totalGenerated}`);

    }).catch((error) => {
      console.error(error);
    });
  }, 5000);
}

main();