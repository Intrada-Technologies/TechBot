import config from '../../_config.json' assert { type: 'json' };
import fetch from 'node-fetch';

export const commandHandler = async (client, roomid, message, sender) => {
  let command = message.substring(1);
  command = command.split(' ')[0];
  switch (command) {
    case 'help':
      await help(client, roomid);
      break;
    case 'whereis':
      await whereis(client, roomid, message);
      break;
    case 'ext':
      await ext(client, roomid, message);
      break;
    case 'oncall':
      await oncall(client, roomid, message, sender);
      break;
    case 'suggestion':
      await suggestion(client, roomid, message, sender);
      break;
    default:
      client.sendNotice(roomid, `Command ${command} not found, maybe make a suggestion?`);
      break;
  }
};

const help = async (client, roomid) => {
  await client.setTyping(roomid, true, 1000);
  let msg = `Intrada's Tech Bot 
    Version: 1.0.0 
    Github: https://github.com/Intrada-Technologies/TechBot.git \n
    Commands: 
        !help - Displays this message 
        !oncall - Displays the current on call list
        !oncall <add|remove/delete|set>:<department> <firstname|lastname|id> - Add to oncall list|Remove from oncall list|Set oncall per department by firstname lastname or id  ***
        !whereis <domain> - Displays the current location of the domain 
        !ext - Displays the current extension list 
        !ext <name|ext num> - Displays the current extension list for the given name
        !suggestion <suggestion> - Sends a suggestion to the bot developer
        !suggestion - List All Open Suggestions

        *** - Requires elevated permissions
    `;
  await client.sendNotice(roomid, msg);
  await client.setTyping(roomid, false);
};

const whereis = async (client, roomid, message) => {
  await client.setTyping(roomid, true, 1000);
  let args = message.split(' ');

  if (args.length < 2) {
    await client.sendNotice(roomid, 'Please provide a domain name to search for');
    await client.setTyping(roomid, false);
    return;
  }
  let domain = args[1];
  domain = domain.replace('https://', '');
  domain = domain.replace('http://', '');
  domain = domain.replace('www.', '');
  domain = domain.split('/')[0];
  let response = await fetch(`http://${config.botapiuri}/domain/${domain}`, { methiod: 'GET', headers: { 'x-api-key': config.botapikey } });
  response = await response.json();
  let msg = response.message;

  await client.sendNotice(roomid, msg);
  await client.setTyping(roomid, false);
};

const ext = async (client, roomid, message) => {
  await client.setTyping(roomid, true, 1000);
  let args = message.split(' ');
  let msg = '';

  if (args.length < 2) {
    let response = await fetch(`http://${config.botapiuri}/ext`, { method: 'GET', headers: { 'x-api-key': config.botapikey } });
    response = await response.json();
    msg = `Intrada's Extension List \n\n`;
    for (let i = 0; i < response.length; i++) {
      msg += `${response[i].Name}: ${response[i].Department} - ${response[i].Extension} \n`;
    }
  } else {
    let response = await fetch(`http://${config.botapiuri}/ext/${args[1].toString()}`, { method: 'GET', headers: { 'x-api-key': config.botapikey } });
    response = await response.json();
    msg = `Intrada's Extension List For ${args[1]}\n\n`;
    for (let i = 0; i < response.length; i++) {
      msg += `${response[i].Name}: ${response[i].Department} - ${response[i].Extension} \n`;
    }
  }

  await client.sendNotice(roomid, msg);
  await client.setTyping(roomid, false);
};

const oncall = async (client, roomid, message, sender) => {
  await client.setTyping(roomid, true, 1000);

  let args = message.split(' ');
  let msg = '';

  if (args.length < 2) {
    let response = await fetch(`http://${config.botapiuri}/employees/oncall`, { methiod: 'GET', headers: { 'x-api-key': config.botapikey } });
    response = await response.json();
    msg = `The following employees are on call: \n\n`;
    for (let i = 0; i < response.length; i++) {
      msg += `${response[i].Department} - ${response[i].Name} \n`;
    }
  } else {
    let subCommand = args[1];
    let modifer = subCommand.split(':')[0];
    let department = subCommand.split(':')[1];

    let modified = args[2];

    if (!modifer || !department || !modified) {
      await client.sendNotice(roomid, 'Please provide a valid command');
      await client.setTyping(roomid, false);
      return;
    }

    let body = { sender: sender, modifer: modifer, department: department, modified: modified };

    let response = await fetch(`http://${config.botapiuri}/employees/oncall`, {
      method: 'post',
      headers: { 'x-api-key': config.botapikey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    response = await response.json();
    console.log(response);
    msg = response;
  }

  await client.sendNotice(roomid, msg);
  await client.setTyping(roomid, false);
};

const suggestion = async (client, roomid, message, sender) => {
  let suggestion = message.split('!suggestion ')[1];
  let username = sender;

  await client.setTyping(roomid, true, 1000);

  if (suggestion) {
    let response = await fetch(`http://${config.botapiuri}/suggestion`, {
      method: 'POST',
      headers: { 'x-api-key': config.botapikey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion: suggestion, username: username }),
    });
    response = await response.json();
    let msg = response.message;
    client.sendNotice(roomid, msg);
  } else {
    let response = await fetch(`http://${config.botapiuri}/suggestion`, { method: 'get', headers: { 'x-api-key': config.botapikey } });
    response = await response.json();
    let msg = `Current suggestions: \n\n`;
    if (response.length > 0) {
      for (let i = 0; i < response.length; i++) {
        msg += `  ${response[i].firstname}: ${response[i].status}\n${response[i].suggestion} \n\n`;
      }
    } else {
      msg = 'No suggestions have been made yet';
    }
    client.sendNotice(roomid, msg);
  }
};
