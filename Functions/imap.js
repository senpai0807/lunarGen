const fs = require('fs');
const os = require('os');
const path = require('path');
var Imap = require('node-imap');
var iconv = require('iconv-lite');
const cheerio = require('cheerio');
var quotedPrintable = require('quoted-printable');

const directory = path.join(os.homedir(), 'Toolbox');
const settingsPath = path.join(directory, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));


let host;
if (settings.imapEmail.includes('gmail.com')) {
    host = 'imap.gmail.com';
} else if (settings.imapEmail.includes('outlook.com')) {
    host = 'outlook.office365.com';
} else if (settings.imapEmail.includes('icloud.com')) {
    host = 'imap.mail.me.com';
} else if (settings.imapEmail.includes('thexyzstore.com')) {
    host = 'imap.thexyzstore.com';
} else {
    console.error('No supported emails');
    return;
}


const extractCode = (html) => {
    if (html) {
        const $ = cheerio.load(html);
        const bodyText = $('body').text();
        const match = bodyText.match(/Here's the one-time verification code you requested: (\d+)\./);
        if (match) {
            return match[1];
        }
    }
    return null;
};

const createImapConnection = (email) => {
    return new Promise((resolve, reject) => {
        let timerId = null;

        var imap = new Imap({
            user: settings.imapEmail,
            password: settings.imapPassword,
            host: host,
            port: 993,
            tls: true,
            authTimeout: 3000
        });

        const checkForNewEmails = () => {
            var searchCriteria = [
                'UNSEEN', 
                ['OR', 
                    ['FROM', 'nike@notifications.nike.com'], 
                    ['FROM', 'nike_at_notifications_nike_com_zbt69ef34kqde2_a6zj0326@icloud.com']
                ], 
                ['TO', email]
            ];
            var fetchOptions = {
                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
                struct: true
        };

        imap.search(searchCriteria, function(err, results) {
            if (err) throw err;
                if (results.length > 0) {
                    var f = imap.fetch(results, fetchOptions);
                    f.on('message', function(msg, seqno) {
                        var buffer = '';
                        msg.on('body', function(stream, info) {
                            stream.on('data', function(chunk) {
                                buffer += chunk.toString('utf8');
                            });

                            stream.once('end', function() {
                                if (info.which !== 'TEXT') return;
                                let decodedBody;
                                try {
                                    decodedBody = iconv.decode(Buffer.from(quotedPrintable.decode(buffer)), 'utf-8');
                                } catch (error) {
                                    console.error('Decoding error:', error);
                                    decodedBody = buffer;
                                }

                                    const code = extractCode(decodedBody);
                                    
                                if (code) {
                                    clearInterval(timerId);
                                    resolve({ imap, code });
                                }
                            });
                        });
                        msg.once('attributes', function(attrs) {
                            if (attrs && attrs.uid) {
                                imap.addFlags(attrs.uid, '\\Seen', function(err) {
                                    if (err) console.log('Error marking email as read:', err);
                                });
                            }
                        });
                    });
                }
            });
        };

        imap.once('ready', function() {
            imap.openBox('INBOX', false, function(err, box) {
                if (err) {
                    reject(err);
                }
                timerId = setInterval(checkForNewEmails, 10000);
            });
        });

        imap.once('error', function(err) {
            reject(err);
        });

        imap.once('end', function() {
            if (timerId) clearInterval(timerId);
        });

        imap.connect();
    });
};

module.exports = createImapConnection;