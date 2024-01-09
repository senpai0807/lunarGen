const { Webhook, MessageBuilder } = require('discord-webhook-node');
const fs = require('fs');
const os = require('os');
const path = require('path');
const createColorizedLogger = require('../Functions/logger');
const logger = createColorizedLogger();

const run = async () => {
    const directory = path.join(os.homedir(), 'Toolbox');
    const settingsPath = path.join(directory, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    if (!settings.successWebhookUrl || settings.successWebhookUrl === "") {
        logger.error('Webhook Not Set...');
        return;
    }

    let hook = new Webhook(`${settings.successWebhookUrl}`);
    hook.setUsername('Toolbox');

    const success = new MessageBuilder()
    .setTitle("Test Webhook 🌙")
    .setColor("#5665DA")
    .setTimestamp();

    try {
        await hook.send(success);
        logger.info('Webhook Test Sent...');
    } catch (error) {
        logger.error('Webhook Error...');
    }
}

module.exports.run = run;