const fs = require('fs');
const os = require('os');
const ip = require('ip');
const path = require('path');
const fetch = require('node-fetch');
const inquirer = require('inquirer');
const { connectDB } = require('./db');
const si = require('systeminformation');
const Analytics = require('./analytics');
const { Webhook, MessageBuilder } = require('discord-webhook-node');

async function ensureAnalyticsRecord(licenseKey) {
  let analytics = await Analytics.findOne({ licenseKey: licenseKey });

  if (!analytics) {
    analytics = new Analytics({
      licenseKey: licenseKey,
      totalCheckouts: 0,
      totalGenerated: 0,
    });
    await analytics.save();
  }
  
  return analytics;
}


const imapTest = require('../Functions/imapTest');
const webhook = require('../Functions/testWebhook');
const proxyTest = require('../Functions/proxyTest');
const createColorizedLogger = require('../Functions/logger');
const logger = createColorizedLogger();

const nikeDraw = require('../Modules/Nike/Nike Checkout/defaultMode');

// Nike Order Check
const nikeFetchAllOrders = require('../Modules/Nike/Order Check/fetchAllOrders');
const nikeFetchByDate = require('../Modules/Nike/Order Check/filterByDate');

// Nike Browser
const nikeBrowserAccountDelete = require('../Modules/Nike/Tools/Browser/accountDelete');
const nikeBrowserChangeEmail = require('../Modules/Nike/Tools/Browser/changeEmail');
const nikeBrowserChangePassword = require('../Modules/Nike/Tools/Browser/changePassword');
const nikeBrowserProfileDelete = require('../Modules/Nike/Tools/Browser/profileDelete');
const nikeBrowserProfileFiller = require('../Modules/Nike/Tools/Browser/profileFiller');

// Nike Request
const nikeAccountDefaults = require('../Modules/Nike/Tools/Request/accountDefaults');
const nikeRequestAccountDelete = require('../Modules/Nike/Tools/Request/accountDelete');
const nikeRequestChangePassword = require('../Modules/Nike/Tools/Request/changePassword');
const nikeRequestProfileDelete = require('../Modules/Nike/Tools/Request/profileDelete');

// Nike Utilities
const nikeLogin = require('../Modules/Nike/Utilities/login');
const nikeSessionRestore = require('../Modules/Nike/Utilities/sessionRestore');
const nikeReturn = require('../Modules/Nike/Utilities/return');


// Adidas Tools
const adidasTools = require('../Modules/Adidas/Tools/tools');
const adidasOrderCheck = require('../Modules/Adidas/Order Check/orderCheck');
const adidasUtilities = require('../Modules/Adidas/Utilities/utilities');


// Generators
const icloudGenerator = require('../Modules/Email Generators/icloud');
const nikeGenerator = require('../Modules/Nike/Generator/nikeBrowser');
const adidasGenerator = require('../Modules/Adidas/Generator/adidasBrowser');

const userHomeDirectory = os.homedir();
const directory = path.join(userHomeDirectory, 'Toolbox');


async function securityCheck(license, deviceName, userName) {
  const forbiddenProcesses = [
    'postman.exe', 
    'fiddler.exe', 
    'fiddler everywhere',
    'tcpview.exe', 
    'smsniff.exe',
    'socketsniff.exe', 
    'charles.exe',
    'mitmweb.exe', 
    'mitmdump.exe',
    'burpsuite.exe', 
    'burp.exe',
    'fiddle everywhere.exe', 
    'ghidra.exe',
    'fiddle.exe', 
    'wireshark.exe', 
    'ilspy.exe'
  ];
  const runningProcesses = await si.processes();
  const runningForbiddenProcesses = runningProcesses.list.filter(proc => forbiddenProcesses.includes(proc.name.toLowerCase()));

  if (runningForbiddenProcesses.length > 0) {
    const hook = new Webhook(""); //Set Webhook
    hook.setUsername('Toolbox');

    const embed = new MessageBuilder()
      .setTitle('Security Threat Detected! ⚠️')
      .addField('License', license, false)
      .addField('IP', ip.address(), false)
      .addField('Device Name', deviceName, false)
      .addField('User', userName, false)
      .setColor("#5665DA")
      .setTimestamp();
    
    await hook.send(embed);

    await fetch('https://localhost:3000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: license,
        ip: ip.address(),
        deviceName,
      }),
    });
    
    process.exit(1);
  }
}


async function logCLILoad(license, deviceName) {
  const hook = new Webhook(""); // Set Webhook

  hook.setUsername('Toolbox');

  const embed = new MessageBuilder()
    .setTitle('Toolbox Launched! 🌙')
    .addField('Key', license, false)
    .addField('IP', ip.address(), false)
    .addField('Device Name', deviceName, false)
    .setColor("#5665DA")
    .setTimestamp();

  hook.send(embed);
}

async function promptForLicense() {
  const settingsPath = path.join(directory, 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

  if (!settings.licenseKey) {
    const questions = [
      {
        type: 'input',
        name: 'licenseKey',
        message: 'Enter your license key:',
      },
    ];
  
    const { licenseKey } = await inquirer.prompt(questions);
    settings.licenseKey = licenseKey;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  }
  
  return settings.licenseKey;
}

async function authenticateUser(licenseKey) { // You will need to create an auth system that will authenticate the user
  const deviceName = os.hostname();
  let deviceID = os.hostname();
  let ipAddr = ip.address();
  try {
    const response = await fetch('https://localhost:3000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey,
        deviceName,
        deviceID,
        ip: ipAddr
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      switch (data.message) {
        case 'MaxInstancesReached':
          logger.error('Maximum Instances Reached');
          break;
        case 'InvalidLicenseKey':
          logger.error('Invalid license key');
          break;
        case 'Authentication failed: License key has expired.':
          logger.error('License key has expired');
          break;
        default:
          logger.error('Authentication failed:', data.message || 'Unknown error');
          break;
      }
      return null;
    }

    if (response.ok) {

      return {
        discordId: data.discordId,
        discordName: data.discordName,
      };
    }

    logger.error('Authentication failed:', data.message || 'Unknown error');
    return null;

  } catch (err) {
    logger.error('Authentication failed:', err.message);
    return false;
  }
}

const accountQuestions = {
  type: 'list',
  name: 'accountGenerator',
  message: 'Which account generator would you like to use?',
  choices: ['Adidas Generator', 'Nike Generator', 'ICloud Generator', 'Back'],
};

const toolboxQuestions = {
  type: 'list',
  name: 'toolbox',
  message: 'Which tool would you like to use?',
  choices: ['Adidas', 'Nike', 'Back'],
};

const adidasQuestions = {
  type: 'list',
  name: 'adidas',
  message: 'Which Adidas tool would you like to use?',
  choices: ['Order Check', 'Tools', 'Utilities', 'Back'],
};

const nikeQuestions = {
  type: 'list',
  name: 'nike',
  message: 'Which Nike tool would you like to use?',
  choices: ['Nike Draw', 'Order Check', 'Tools', 'Utilities', 'Back'],
};

const nikeModeQuestion = {
  type: 'list',
  name: 'mode',
  message: 'Choose mode:',
  choices: ['Default', 'Back'],
};

const nikeOrderCheckQuestions = {
  type: 'list',
  name: 'nike',
  message: 'Which Nike tool would you like to use?',
  choices: ['Fetch All Orders', 'Filter By Date', 'Back'],
};

const nikeToolsModeQuestions = {
  type: 'list',
  name: 'mainMode',
  message: 'Choose main mode:',
  choices: ['Browser', 'Request', 'Back'],
};

const nikeBrowserToolQuestions = {
  type: 'list',
  name: 'browserMode',
  message: 'Which Nike tool would you like to use?',
  choices: ['Profile Filler', 'Change Email', 'Change Password', 'Profile Delete', 'Account Delete', 'Back'],
};

const nikeRequestToolQuestions = {
  type: 'list',
  name: 'requestMode',
  message: 'Choose request mode:',
  choices: ['Change Password', 'Profile Delete', 'Set Account Defaults', 'Account Delete', 'Back'],
};

const nikeUtilityQuestions = {
  type: 'list',
  name: 'utilitiesMode',
  message: 'Choose mode:',
  choices: ['Account Login', 'Session Restore','Start Return', 'Back'],
}

const miscQuestions = {
  type: 'list',
  name: 'misc',
  message: 'Select an option.',
  choices: ['Test IMAP', 'Test Proxies', 'Test Webhook', 'Settings', 'Back']
}

const mainQuestion = {
  type: 'list',
  name: 'mainMode',
  message: 'Which mode would you like to use?',
  choices: ['Account Generator', 'Goat','Toolbox', 'Analytics', 'Monitors', 'Miscellaneous'],
};

async function mainMenu() {
const answers = await inquirer.prompt(mainQuestion);

switch (answers.mainMode) {
case 'Account Generator':
  const accountAnswers = await inquirer.prompt(accountQuestions);

switch (accountAnswers.accountGenerator) {
  case 'Adidas Generator':
    await adidasGenerator.run();
    await adidasGenerator.waitForCompletion();
    break;

  case 'Nike Generator':
    await nikeGenerator.run();
    await nikeGenerator.waitForCompletion();
    break;

  case 'ICloud Generator':
    await icloudGenerator.run();
    await icloudGenerator.waitForCompletion();
    break;

  case 'Back':
    await mainMenu();
    break;

  default:
    logger.error('Invalid choice');
    break;
}
await mainMenu();
break;

/* case 'Goat':
  const goatAnswers = await inquirer.prompt(goatQuestions);

switch (goatAnswers.goat) {
  case 'Goat Account Generator':
    await goatGenerator.run();
    break;

  case 'Goat Checkout':
    await goatCheckout.run();
    break;

  case 'Back':
    await mainMenu();
    break;

  default:
    logger.error('Invalid choice');
    break;
}
await mainMenu();
break; */

case 'Toolbox':
  const toolboxAnswers = await inquirer.prompt(toolboxQuestions);

  switch (toolboxAnswers.toolbox) {
    case 'Adidas':
      const adidasAnswers = await inquirer.prompt(adidasQuestions);
      switch (adidasAnswers.adidas) {
        case 'Adidas Request':
          await adidasCheckout.run();
          break;

        case 'Order Check':
          await adidasOrderCheck.run();
          break;

        case 'Tools':
          await adidasTools.run();
          break;

        case 'Utilities':
          await adidasUtilities.run();
          break;

        case 'Back':
          await mainMenu();
          break;
      }
      break;
    
    case 'Nike':
      const nikeAnswers = await inquirer.prompt(nikeQuestions);
      switch (nikeAnswers.nike) {
        case 'Nike Draw':
          const nikeModeAnswers = await inquirer.prompt(nikeModeQuestion);
          switch (nikeModeAnswers.mode) {
            case 'Default':
              await nikeDraw.run()
              break;
          
          case 'Back':
              await mainMenu();
              break;
          }

        case 'Order Check':
          const nikeOrderCheckAnswesr = await inquirer.prompt(nikeOrderCheckQuestions);
          switch (nikeOrderCheckAnswesr.nike) {
            case 'Fetch All Orders':
              await nikeFetchAllOrders.run();
              break;

            case 'Filter By Date':
              await nikeFetchByDate.run();
              break;

            case 'Back':
              await mainMenu();
              break;
          }
          break;

        case 'Tools':
          const nikeToolsModeAnswers = await inquirer.prompt(nikeToolsModeQuestions);
          
          switch (nikeToolsModeAnswers.mainMode) {
            case 'Browser':
              const nikeToolBrowserAnswsers = await inquirer.prompt(nikeBrowserToolQuestions);
              switch (nikeToolBrowserAnswsers.browserMode) {
                case 'Profile Filler':
                  await nikeBrowserProfileFiller.run();
                  break;
    
                case 'Change Email':
                  await nikeBrowserChangeEmail.run();
                  break;
    
                case 'Change Password':
                  await nikeBrowserChangePassword.run();
                  break;
    
                case 'Profile Delete':
                  await nikeBrowserProfileDelete.run();
                  break;
    
                case 'Account Delete':
                  await nikeBrowserAccountDelete.run();
                  break;
    
                case 'Back':
                  await mainMenu();
                  break;
              }
            case 'Request':
              const nikeToolRequestAnswsers = await inquirer.prompt(nikeRequestToolQuestions);
              switch (nikeToolRequestAnswsers.requestMode) {
                case 'Change Password':
                  await nikeRequestChangePassword.run();
                  break;

              case 'Profile Delete':
                  await nikeRequestProfileDelete.run();
                  break;
              
              case 'Set Account Defaults':
                  await nikeAccountDefaults.run();
                  break;

              case 'Account Delete':
                  await nikeRequestAccountDelete.run();
                  break;

              case 'Back':
                await mainMenu();
                break;
              }

          case 'Back':
            await mainMenu();
            break;
          }
          break;

        case 'Utilities':
          const nikeUtilityAnswers = await inquirer.prompt(nikeUtilityQuestions);
          switch (nikeUtilityAnswers.utilitiesMode) {
            case 'Account Login':
              await nikeLogin.run();
              break;
  
            case 'Session Restore':
              await nikeSessionRestore.run();
              break;
  
            case 'Start Return':
              await nikeReturn.run()
              break;

            case 'Back':
              await mainMenu();
              break;
          }
          break;

        case 'Back':
          await mainMenu();
          break;
      }
      break;

    case 'Back':
      await mainMenu();
      break;

    default:
      logger.error('Invalid choice');
      break;
  }
  await mainMenu();
  break;

case 'Analytics':
  const settingsPath = path.join(directory, 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  const analytics = await Analytics.findOne({ licenseKey: settings.licenseKey });
  if (analytics) {
    logger.verbose(`Total Checkouts: ${analytics.totalCheckouts}`);
    logger.verbose(`Total Generated: ${analytics.totalGenerated}`);
  } else {
    logger.error('No analytics found for this license key.');
  }
await mainMenu();
break;

/* case 'Monitors':
  const monitorChoiceAnswers = await inquirer.prompt(monitorQuestions);
  switch (monitorChoiceAnswers.monitor) {
    case 'Shopify':
      const shopifyMonitorAnswers = await inquirer.prompt(shopifyMonitorQuestions);
      switch (shopifyMonitorAnswers.monitorType) {
        case 'Shopify Checkpoint':
          await checkpointMonitor.run();
          break;

        case 'Shopify Monitor':
          await shopifymonitor.run();
          break;

        case 'Back':
          await mainMenu();
          break;
      }
      break;
    case 'Nike':
      const nikeMonitorAnswers = await inquirer.prompt(nikeMonitorQuestions);
      switch (nikeMonitorAnswers.nikeMonitor) {
        case 'Nike Monitor':
          await nikeMonitor.run();
          break;

        case 'Back':
          await mainMenu();
          break;
      }
    case 'Back':
      await mainMenu();
      break;
  }
  break; */

  
case 'Miscellaneous':
  const miscAnswers = await inquirer.prompt(miscQuestions);

switch (miscAnswers.misc) {
  case 'Test IMAP':
    await imapTest.run();
    break;

  case 'Test Proxies':
    await proxyTest.run();
    break;

  case 'Test Webhook':
    await webhook.run();
    break;

  case 'Settings':
    const settingsQuestions = {
      type: 'list',
      name: 'settings',
      message: 'Choose Settings Option.',
      choices: ['Check Settings', 'Change Settings', 'Back']
  };
            
  const settingsAnswers = await inquirer.prompt(settingsQuestions);

switch (settingsAnswers.settings) {
  case 'Check Settings':
    const settingsPath = path.join(directory, 'settings.json');
      if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            logger.info('Current Settings:');
              for (const key in settings) {
                logger.warn(`${key}: ${settings[key]}`);
              }
            } else {
                logger.error('Settings file not found.');
            }
            break;

  case 'Change Settings':
      const changeSettingsPath = path.join(directory, 'settings.json');
      if (fs.existsSync(changeSettingsPath)) {
          let settings = JSON.parse(fs.readFileSync(changeSettingsPath, 'utf-8'));
            
      const settingsNames = Object.keys(settings);
      const changeSettingQuestion = [
        {
          type: 'list',
          name: 'setting',
          message: 'Which setting do you want to change?',
          choices: settingsNames
        },

        {
          type: 'confirm',
          name: 'change',
          message: (answers) => `Current value of ${answers.setting} is ${settings[answers.setting]}. Do you want to change it?`,
          default: false
        },

        {
          type: 'input',
          name: 'newValue',
          message: (answers) => `Enter new value for ${answers.setting}:`,
          when: (answers) => answers.change
        }
      ];
            
const answers = await inquirer.prompt(changeSettingQuestion);  
if (answers.change) {
  settings[answers.setting] = answers.newValue;
  fs.writeFileSync(changeSettingsPath, JSON.stringify(settings, null, 2));
  logger.info(`Updated ${answers.setting} to ${answers.newValue}`);
}

} else {
  logger.error('Settings file not found.');
}
 break;

  default:
    logger.error('Invalid choice');
    break;
}
break;

case 'Back':
  await mainMenu();
  break;

default:
  logger.error('Invalid choice');
  break;
}
  await mainMenu();
  break;

  }
}

const toolbox = async () => {
  let licenseKey;
  const settingsPath = path.join(directory, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    if ('licenseKey' in settings) {
      licenseKey = settings.licenseKey;
    }
  }

  if (!licenseKey) {
    licenseKey = await promptForLicense();
  }

  await connectDB();

  const user = await authenticateUser(licenseKey);

  if (!user) {
    logger.error('Invalid license key or Maximum Instances Reached');
    process.exit(1);
  }
  await ensureAnalyticsRecord(licenseKey);

  const deviceName = os.hostname();
  await logCLILoad(licenseKey, deviceName);

  logger.verbose(`Welcome ${user.discordName}!`);

  setInterval(() => securityCheck(licenseKey, deviceName, user.discordName), 10000);
  
mainMenu();

}

module.exports = toolbox;