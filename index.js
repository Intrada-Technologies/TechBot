import MatrixChatBot from './bot.js';

const bot = new MatrixChatBot();
bot.start().then(() => {
  console.log('Matrix chatbot started!');
}).catch(err => {
  console.error('Failed to start the bot:', err);
});