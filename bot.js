import sdk from 'matrix-bot-sdk';
import config from './_config.json' assert { type: 'json' };

import { sleep, sl, ml, il } from './modules/helpers/index.js';
import { commandHandler } from './modules/commands/index.js';
import { oldTickets, newTickets } from './modules/helpers/index.js';
import cron from 'node-cron';

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

      ml({ room: roomId, sender: event['sender'], body: event['content']['body'] });
      sl(`Sending read receipt for ${event['event_id']}`);
      await this.client.sendReadReceipt(roomId, event['event_id']);

      let body = event['content']['body'];

      if (body.startsWith('!')) {
        await commandHandler(this.client, roomId, body, event['sender']);
      }
    });

    cron.schedule('*/10 9-16 * * 1-5', async () => {
      oldTickets(this.client);
      newTickets(this.client);
    });
  }

  async login() {
    il('Logging in with username and password');
    this.client = await this.auth.passwordLogin(config.username, config.password);
    this.accessToken = this.client.accessToken;
  }

  async initalizeClient() {
    il('Stabalizing Client');
    this.client = new sdk.MatrixClient(config.homeserverUrl, this.accessToken, this.storage, this.cryptoProvider);
    this.client.start();
  }
}

export default MatrixChatBot;
