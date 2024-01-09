const fs = require('fs');
const os = require('os');
const path = require('path');
var Imap = require('node-imap');

const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

const createColorizedLogger = require('./logger');
const logger = createColorizedLogger();

const { once } = require('events');

const run = async () => {
    let host;
    if (settings.imapEmail.includes('gmail.com')) {
        host = 'imap.gmail.com';
    } else if (settings.imapEmail.includes('outlook.com')) {
        host = 'outlook.office365.com';
    } else if (settings.imapEmail.includes('icloud.com')) {
        host = 'imap.mail.me.com';
    } else {
        console.error('No supported emails');
        return;  // or throw new Error('No supported emails');
    }
    
    let imap = new Imap({
        user: settings.imapEmail,
        password: settings.imapPassword,
        host: host,
        port: 993,
        tls: true,
        authTimeout: 3000
    });
    
    const ready = once(imap, 'ready');
    const error = once(imap, 'error');

    imap.connect();

    try {
        await Promise.race([ready, error]);
    } catch (err) {
        logger.error('IMAP Connection Failed...');
        return;
    }

    logger.info('IMAP Connection Successful...');
    imap.end();
}

module.exports.run = run;
