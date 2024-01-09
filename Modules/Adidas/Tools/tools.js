const inquirer = require('inquirer');
const accountDelete = require('./accountDelete');
const changeEmail = require('./changeEmail');
const changePassword = require('./changePassword');
const addressFiller = require('./addressFiller');


const run = async () => {
    const modeAnswer = await inquirer.prompt({
        type: 'list',
        name: 'mode',
        message: 'Choose mode:',
        choices: ['Address Filler', 'Change Email', 'Change Password', 'Account Delete'],
    });

    switch(modeAnswer.mode) {
        case 'Address Filler':
            await addressFiller.run();
            break;

        case 'Change Email':
            await changeEmail.run();
            break;

        case 'Change Password':
            await changePassword.run();
            break;

        case 'Account Delete':
            await accountDelete.run();
            break;
    }
}

module.exports.run = run;