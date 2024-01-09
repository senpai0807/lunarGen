const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');
const inquirer = require('inquirer');

const createColorizedLogger = require('./logger');
const logger = createColorizedLogger();

async function checkForUpdates() {
    const packageJson = require('../package.json');
    const localVersion = packageJson.version;

    const response = await fetch('/version.json'); // Create a place to store updates and versions | I used Digital Oceans
    const data = await response.json();
    const remoteVersion = data.version;

    const homeDir = os.homedir();
    let exePath;
    const desktopPath = path.join(homeDir, 'Desktop', 'Toolbox.exe');
    const downloadsPath = path.join(homeDir, 'Downloads', 'Toolbox.exe');
    const oneDriveDesktopPath = path.join(homeDir, 'OneDrive', 'Desktop', 'Toolbox.exe');
    const oneDriveDownloadsPath = path.join(homeDir, 'OneDrive', 'Downloads', 'Toolbox.exe');

    if (fs.existsSync(desktopPath)) {
        exePath = desktopPath;
    } else if (fs.existsSync(downloadsPath)) {
        exePath = downloadsPath;
    } else if (fs.existsSync(oneDriveDesktopPath)) {
        exePath = oneDriveDesktopPath;
    } else if (fs.existsSync(oneDriveDownloadsPath)) {
        exePath = oneDriveDownloadsPath;
    } else {
        logger.error('Application not found in Desktop or Downloads directory');
        return;
    }
    const oldExePath = path.join(path.dirname(exePath), 'Toolbox Old.exe');

    if (localVersion < remoteVersion) {
        logger.warn('Update Found...');
        const answers = await inquirer.prompt([{
            type: 'confirm',
            name: 'download',
            message: 'Do you want to download the latest update?',
            default: false
        }]);

        if (answers.download) {
            logger.warn('Downloading...');
            const response = await fetch(data.url);

            if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

            const buffer = await response.buffer();
            const updateFile = path.join(path.dirname(exePath), 'Toolbox Update.exe');

            await fsPromises.writeFile(updateFile, buffer);
            logger.warn('Download Complete...');


            setTimeout(() => {
                try {
                  if (fs.existsSync(oldExePath)) {
                    fs.unlinkSync(oldExePath);
                  }
                  fs.renameSync(exePath, oldExePath);
                  fs.renameSync(updateFile, exePath);
          
                  process.exit(0);
                } catch (err) {
                  logger.error(`${err}`);
                }
              }, 500);
        }
    } else {
        logger.info('No Updates Found...');
    
        if (fs.existsSync(oldExePath)) {
          try {
            fs.unlinkSync(oldExePath);
          } catch (error) {
            logger.error('Error deleting old version:', error);
          }
        } 
      }
    }
    
module.exports = checkForUpdates;