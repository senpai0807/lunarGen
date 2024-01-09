const inquirer = require('inquirer');
const adidasLogin = require('./login');


const run = async () => {
    const modeAnswer = await inquirer.prompt({
        type: 'list',
        name: 'mode',
        message: 'Choose mode:',
        choices: ['Account Login'],
    });

    switch(modeAnswer.mode) {
        case 'Account Login':
            await adidasLogin.run();
            break;
    }
}

module.exports.run = run;