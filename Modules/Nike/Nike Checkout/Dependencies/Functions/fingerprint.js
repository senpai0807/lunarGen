const fs = require('fs');
const os = require('os');
const path = require('path');
const actualDeviceMemory = os.totalmem() / (1024 * 1024 * 1024);

const graphicsCardsPath = path.resolve(__dirname, '../Fingerprint Data/graphicsCards.json');
const userAgentsPath = path.resolve(__dirname, '../Fingerprint Data/userAgents.json');

const graphicsCards = JSON.parse(fs.readFileSync(graphicsCardsPath, 'utf8'));
const userAgents = JSON.parse(fs.readFileSync(userAgentsPath, 'utf8'));

const randomGraphicsCard = graphicsCards[Math.floor(Math.random() * graphicsCards.length)];
const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

module.exports = async (page) => {
    await page.evaluateOnNewDocument((randomGraphicsCard, randomUserAgent) => {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) {
                return 'NVIDIA Corporation';
            }

            if (parameter === 37446) {
                return randomGraphicsCard;
            }
            return getParameter.call(this, parameter);
        };

        // Screen override
        Object.defineProperty(screen, 'width', { get: () => 1024 });
        Object.defineProperty(screen, 'height', { get: () => 768 });
        Object.defineProperty(screen, 'availWidth', { get: () => 1024 });
        Object.defineProperty(screen, 'availHeight', { get: () => 768 });
        Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
        Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

        // Navigator override
        const originalNavigator = navigator;
        const newNavigator = Object.create(navigator);
        Object.defineProperty(newNavigator, 'userAgent', {
            get: () => randomUserAgent,
        });
        Object.defineProperty(newNavigator, 'language', {
            get: () => 'en-US',
        });
        Object.defineProperty(newNavigator, 'hardwareConcurrency', {
            get: () => getRandomInt(2, originalNavigator.hardwareConcurrency),
        });
        Object.defineProperty(newNavigator, 'deviceMemory', {
            get: () => getRandomInt(2, actualDeviceMemory),
        });
        Object.defineProperty(newNavigator, 'platform', {
            get: () => 'Win64',
        });
        window.navigator = newNavigator;

    }, randomGraphicsCard, randomUserAgent, actualDeviceMemory);
};
