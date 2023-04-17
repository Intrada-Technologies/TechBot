import sdk from 'matrix-bot-sdk';
import config from './_config.json' assert { type: 'json' };
import fetch from 'node-fetch';

// sleep function
const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

class MatrixChatBot {
  constructor() {
    this.auth = new sdk.MatrixAuth(config.homeserverUrl);
    this.client = null;
    this.storage = new sdk.SimpleFsStorageProvider('intrada-bot-store.json');
    this.cryptoProvider = new sdk.RustSdkCryptoStorageProvider('./crypto');
  }

  async start() {
    await this.login();
    await this.initalizeClient();

    this.client.on('room.message', async (roomId, event) => {
      if (event['content']?.['msgtype'] !== 'm.text') return;
      if (event['sender'] === (await this.client.getUserId())) return;

      console.log(`[M] Message received in room ${roomId} from ${event['sender']}: ${event['content']['body']}`);
      console.log('[+] Sending Read Receipt');
      await this.client.sendReadReceipt(roomId, event['event_id']);

      // sending typeing notification

      // sending a message

      let body = event['content']['body'];

      if (body === '!oncall') {
        console.log('[+] Sending Typing Notification');
        await this.client.setTyping(roomId, true, 1000);
        await sleep(1000);
        console.log('[+] Sending Message');
        let response = await fetch(`http://${config.botapiuri}/employees/oncall`, { methiod: 'GET', headers: { 'x-api-key': config.botapikey } });
        response = await response.json();
        let message = `The following employees are on call: \n\n`;
        for (let i = 0; i < response.length; i++) {
          message += `${response[i].Department} - ${response[i].Name} \n`;
        }
        this.client.sendNotice(roomId, message);
      } else if (body.startsWith('!whereis')) {
        console.log('[+] Sending Typing Notification');
        await this.client.setTyping(roomId, true, 1000);
        await sleep(1000);
        console.log('[+] Sending Message');
        let args = body.split(' ');
        if (args.length < 2) {
          this.client.sendNotice(roomId, 'Please provide a domain name to search for');
          return;
        }
        let domain = args[1];
        domain = domain.replace('https://', '');
        domain = domain.replace('http://', '');
        domain = domain.replace('www.', '');
        domain = domain.split('/')[0];
        let response = await fetch(`http://${config.botapiuri}/domain/${domain}`, { methiod: 'GET', headers: { 'x-api-key': config.botapikey } });
        response = await response.json();
        let message = response.message;
        this.client.sendNotice(roomId, message);
      } else if (body.startsWith('!ext')) {
        let args = body.split(' ');
        if (args.length < 2) {
          let response = await fetch(`http://${config.botapiuri}/ext`, { method: 'GET', headers: { 'x-api-key': config.botapikey } });
          response = await response.json();
          let message = `Intrada's Extension List \n\n`;
          for (let i = 0; i < response.length; i++) {
            message += `${response[i].Name}: ${response[i].Department} - ${response[i].Extension} \n`;
          }
          this.client.sendNotice(roomId, message);
        } else {
          let response = await fetch(`http://${config.botapiuri}/ext/${args[1].toString()}`, { method: 'GET', headers: { 'x-api-key': config.botapikey } });
          response = await response.json();
          let message = `Intrada's Extension List \n\n`;
          for (let i = 0; i < response.length; i++) {
            message += `${response[i].Name}: ${response[i].Department} - ${response[i].Extension} \n`;
          }
          this.client.sendNotice(roomId, message);
        }
      } else if (body.startsWith('!suggestion')) {
        let suggestion = body.split('!suggestion ')[1];
        let username = event['sender'].replaceAll('<', '').replaceAll('>', '');
        console.log('[+] Sending Typing Notification');
        await this.client.setTyping(roomId, true, 1000);
        await sleep(1000);
        if (suggestion) {
          let response = await fetch(`http://${config.botapiuri}/suggestion`, {
            method: 'POST',
            headers: { 'x-api-key': config.botapikey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ suggestion: suggestion, username: username }),
          });
          response = await response.json();
          let message = response.message;
          this.client.sendNotice(roomId, message);
        } else {
          let response = await fetch(`http://${config.botapiuri}/suggestion`, { method: 'get', headers: { 'x-api-key': config.botapikey } });
          response = await response.json();
          let message = `Current suggestions: \n\n`;
          if(response.length > 0){
            for (let i = 0; i < response.length; i++) {
              message += `  ${response[i].firstname}: ${response[i].status}\n${response[i].suggestion} \n\n`;
            }
          }else{
            message = 'No suggestions have been made yet'
          }
          this.client.sendNotice(roomId, message);
        }
      }
    });
  }


  async login() {
    console.log('[+] Logging in with username and password');
    this.client = await this.auth.passwordLogin(config.username, config.password);
    this.accessToken = this.client.accessToken;

    

  }

  async initalizeClient() {
    console.log('[+] Stabalizing Client');
    this.client = new sdk.MatrixClient(config.homeserverUrl, this.accessToken, this.storage, this.cryptoProvider);
    this.client.start();
  }
}

export default MatrixChatBot;
