const inquirer = require('inquirer');
const filterByDate = require('./filterByDate');
const filterByOrder = require('./filterByOrderNumber');
const fetchAllOrders = require('./fetchAllOrders');


const run = async () => {
    const modeAnswer = await inquirer.prompt({
        type: 'list',
        name: 'mode',
        message: 'Choose mode:',
        choices: ['Fetch All Orders', 'Filter By Order Number', 'Filter By Date'],
    });

    switch(modeAnswer.mode) {
        case 'Filter By Order Number':
            await filterByOrder.run();
            break;
        case 'Filter By Date':
            await filterByDate.run();
            break;
        case 'Fetch All Orders':
            await fetchAllOrders.run()
            break;
    }
}

module.exports.run = run;