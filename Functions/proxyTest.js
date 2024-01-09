const fs = require("fs");
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const axios = require('axios-https-proxy-fix');
const createColorizedLogger = require('./logger');

const logger = createColorizedLogger();

const CONCURRENT_TESTS = 10; // Number of proxies to test concurrently. Adjust as needed.
const DELAY_BETWEEN_GROUPS = 2000; // Delay in ms between groups of concurrent tests.

const run = async () => {
    const directory = path.join(os.homedir(), 'Toolbox');
    const proxiesPath = path.join(directory, 'proxies.txt');

    const proxiesData = fs.readFileSync(proxiesPath, 'utf8').split('\n').filter(line => {
        const trimmedLine = line.trim();
        return trimmedLine && !trimmedLine.startsWith('#');
    });

    const answers = await inquirer.prompt([
        {
            name: 'site',
            message: 'Input Site (Example: www.kith.com):',
            default: 'http://www.google.com',
        }
    ]);

    const site = answers.site.startsWith('https://') ? answers.site : `https://${answers.site}`;

    const badProxies = [];
    let index = 0;

    while (index < proxiesData.length) {
        const currentProxies = proxiesData.slice(index, index + CONCURRENT_TESTS);
        const testPromises = currentProxies.map(async proxy => {
            const [ip, port, username, passwordProxy] = proxy.split(':');
            const speed = await testProxy({ ip, port, username, passwordProxy }, site);

            if (speed === "Error") {
                logger.error(`${proxy}: Bad Proxy`);
                badProxies.push(proxy);
            } else {
                logger.info(`${proxy} - Speed: ${speed}ms`);
            }
        });

        await Promise.all(testPromises);
        await delay(DELAY_BETWEEN_GROUPS);
        index += CONCURRENT_TESTS;
    }

    const updatedProxies = proxiesData.filter(proxy => !badProxies.includes(proxy));
    fs.writeFileSync(proxiesPath, updatedProxies.join('\n'));
}

async function testProxy({ ip, port, username, passwordProxy }, site) {
    const start = Date.now();

    try {
        await axios({
            url: site,
            method: "GET",
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36",
            },
            timeout: 10000,
            proxy: {
                protocol: "https",
                host: ip,
                port,
                auth: {
                    username,
                    password: passwordProxy
                }
            },
        });

        return Date.now() - start;
    } catch {
        return "Error";
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.run = run;