const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');
const crypto = require('crypto');
const request = require('request');
const { get } = require('lodash');

// IMAP settings
const IMAP_SERVER = 'imap-mail.outlook.com';
const IMAP_PORT = 993;

// Binance API settings
const API_KEY = '5nR46x9Vigutmp61W6MBRZQojqoDD2WY5sLjWMexSU1WuKwyjcgFAC7h6FqUac4V';
const API_SECRET = 'XHRw4CEdxWKxtLRqPzCgL9LTX120kbTYxbcabOlbvs8UCirRyH3Enz05yPnc9IMB';
const BASE_URL = 'https://api.binance.com';

// Credentials
const EMAIL_ADDRESS = 'aagortey@hotmail.com';
const EMAIL_PASSWORD = 'conDom77';

function generateSignature(queryString) {
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(queryString)
    .digest('hex');
}

function placeMarketOrder(symbol, side, quantity) {
  const endpoint = '/api/v3/order';
  const url = BASE_URL + endpoint;
  const timestamp = Date.now();
  const params = {
    symbol,
    side,
    type: 'MARKET',
    quantity,
    timestamp,
  };
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const signature = generateSignature(queryString);
  params.signature = signature;

  const headers = {
    'X-MBX-APIKEY': API_KEY,
  };

  const options = {
    url,
    method: 'POST',
    headers,
    qs: params,
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

// Create an IMAP client
const client = new Imap({
  user: EMAIL_ADDRESS,
  password: EMAIL_PASSWORD,
  host: IMAP_SERVER,
  port: IMAP_PORT,
  tls: true,
});

// Event handler for successful connection
client.once('ready', () => {
  console.log('Connected to the IMAP server');

  // Open the INBOX mailbox
  client.openBox('INBOX', false, (error, mailbox) => {
    if (error) {
      console.error('Error while opening the mailbox:', error);
      return;
    }

    console.log(`Listening for new emails in ${mailbox.name}`);

    // Event handler for new emails
    client.on('mail', () => {
      // Search for unread emails
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', '']
      };

      client.search(searchCriteria, (searchError, results) => {
        if (searchError) {
          console.error('Error while searching for new emails:', searchError);
          return;
        }

        results.forEach((result) => {
          const messageData = client.fetch(result, fetchOptions);

          messageData.on('message', (message) => {
            message.on('body', (stream, info) => {
              simpleParser(stream, async (parseError, parsedEmail) => {
                if (parseError) {
                  console.error('Error while parsing email:', parseError);
                  return;
                }

                const { subject, from, html, text } = parsedEmail;

                if (subject && subject.includes('tradeAlert')) {
                  console.log('New Email:');
                  console.log('Subject:', subject);
                  console.log('From:', get(from, 'text', ''));
                  console.log('Content:');

                  let body = '';

                  if (html) {
                    const $ = cheerio.load(html);
                    body = $('body').text();
                  } else if (text) {
                    body = text;
                  }

                  console.log(body);

                  if (body.toLowerCase().includes('buy')) {
                    try {
                      const response = await placeMarketOrder('BTCTUSD', 'BUY', '0.00042');
                      console.log('Buy order placed:', response);
                    } catch (error) {
                      console.error('Error placing buy order:', error);
                    }
                  } else if (body.toLowerCase().includes('sell')) {
                    try {
                      const response = await placeMarketOrder('BTCTUSD', 'SELL', '0.00042');
                      console.log('Sell order placed:', response);
                    } catch (error) {
                      console.error('Error placing sell order:', error);
                    }
                  } else {
                    console.log('No valid signal found in email body');
                  }
                } else {
                  console.log('Unrelated Message:');
                  console.log('Subject:', subject);
                  console.log('From:', get(from, 'text', ''));
                }

                console.log('----------------------');
              });
            });
          });
        });
      });
    });
  });
});

// Event handler for connection errors
client.on('error', (error) => {
  console.error('An error occurred while connecting to the IMAP server:', error);
});

// Connect to the IMAP server
client.connect();

//print server ip
request('https://api.ipify.org?format=json', (error, response, body) => {
  if (error) {
    console.error('An error occurred while fetching the IP address:', error);
    return;
  }

  if (response.statusCode !== 200) {
    console.error('Failed to fetch IP address. Status code:', response.statusCode);
    return;
  }

  const ipAddress = JSON.parse(body).ip;
  console.log('Your IP address is:', ipAddress);
});