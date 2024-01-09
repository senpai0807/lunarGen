const fetch = require('node-fetch');
const fs = require('fs');
const os = require('os');
const path = require('path');
const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
const createColorizedLogger = require('./logger');
const logger = createColorizedLogger();

const token = settings.smsManToken;

async function getBalance() {
  const balanceUrl = `http://api.sms-man.com/control/get-balance?token=${token}`;
  const response = await fetch(balanceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  return data;
}

async function getNumber(application_id) {
  const url = `http://api.sms-man.com/control/get-number?token=${token}&country_id=5&application_id=${application_id}`;
  
  while (true) {
    let response;
    let data;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      data = await response.json();
    } catch (error) {
      logger.error('Error during fetch: ', error);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    const number = data.number;
    const errorMsg = data.error_msg;

    if (errorMsg === 'The price is more than the balance. Need more funds, please charge your balance' || number === null) {
      logger.error('Balance Empty, Retrying...');
      await new Promise(r => setTimeout(r, 2000));
    } else {
      return data;
    }
  }
}

async function getSmsCode(request_id) {
  const startTime = Date.now();
  const timeout = 30000;
  const interval = 5000;

  while (true) {
    const smsUrl = `http://api.sms-man.com/control/get-sms?token=${token}&request_id=${request_id}`;

    let response;
    let data;

    try {
      response = await fetch(smsUrl);
      data = await response.json();
    } catch (error) {
      logger.error('Error during fetch: ', error);
      await new Promise(r => setTimeout(r, interval));
      continue;
    }

    if (data.error_code === 'wait_sms') {
      logger.http('Waiting For SMS Code...');

      if (Date.now() - startTime > timeout) {
        await cancelNumber(request_id);
        throw new Error('Timeout exceeded. Unable to fetch SMS code.');

      } else {
        await new Promise(r => setTimeout(r, interval));
      }
    } else if (data.sms_code) {
        await usedNumber(request_id);
        return data.sms_code;
    } else {
      throw new Error('No SMS code received');
    }
  }
}

async function cancelNumber(request_id) {
  const cancelUrl = `http://api.sms-man.com/control/set-status?token=${token}&request_id=${request_id}&status=reject`;
  const response = await fetch(cancelUrl, {
    method: 'POST',
  });

  const data = await response.json();

  if (!data.success) {
    let errorMessage = `Failed to cancel number. Error: ${data.error_code}, Message: ${data.error_msg}`;
    throw new Error(errorMessage);
  }
}

async function usedNumber(request_id) {
  const usedUrl = `http://api.sms-man.com/control/set-status?token=${token}&request_id=${request_id}&status=close`;
  const response = await fetch(usedUrl, {
    method: 'POST',
  });

  const data = await response.json();

  if (!data.success) {
    let errorMessage = `Failed to set status to used. Error: ${data.error_code}, Message: ${data.error_msg}`;
    throw new Error(errorMessage);
  }
}

module.exports = {
  getBalance,
  getNumber,
  getSmsCode,
  cancelNumber
};