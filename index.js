import MatrixChatBot from './bot.js';
import { il } from './modules/helpers/index.js';


const bot = new MatrixChatBot();
bot.start().then(() => {
  il('Matrix chatbot started!');
}).catch(err => {
  console.error('Failed to start the bot:', err);
});