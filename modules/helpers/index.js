import chalk from 'chalk';
import config from '../../_config.json' assert { type: 'json' };
import fetch from 'node-fetch';

export const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export const sl = (msg) => {
  console.log(chalk.green('[+]'), chalk.white(msg));
};

export const ml = (msg) => {
  let room = msg.room,
    sender = msg.sender,
    body = msg.body;

  console.log(chalk.green('[m]'), `Message received in room: ${room}\n    From: ${sender}\n    Message:\n         ${chalk.italic(body)}\n`);
};

export const il = (msg) => {
  console.log(chalk.green('[i]'), chalk.white(msg));
};

const ticketCheck = async () => {
  let cfg = config.connectwise;
  let endpoint = cfg.endpoint + cfg.version + cfg.api;
  let auth = 'Basic ' + Buffer.from(cfg.company + '+' + cfg.publicKey + ':' + cfg.privateKey).toString('base64');

  let resp = await fetch(endpoint + `service/tickets?conditions=(board/name = "Help Desk") and status/name = "New"`, {
    method: 'GET',
    headers: {
      Authorization: auth,
      clientId: cfg.clientId,
    },
  });

  resp = await resp.json();
  let now = new Date();
  let tickets = {};
  tickets.old = [];
  tickets.new = [];

  for await (const r of resp) {
    let hours = Math.abs(now - new Date(r['_info']['dateEntered'])) / 36e5;
    if (hours > 1.65) {
      tickets.old.push({
        TicketNumber: r.id,
        LifeSpan: hours.toFixed(3),
        Company: r.company.name != 'Catchall' ? r.company.name : null,
        Person: r.contact && r.contact.name ? r.contact.name : null,
        Title: r.summary,
        Priority: r.priority.name,
      });
    }
    if (hours < 0.117) {
      if (r.priority.name.split(' ')[1] == '2' || r.priority.name.split(' ')[1] == '1') {
        tickets.new.push({
          TicketNumber: r.id,
          LifeSpan: hours.toFixed(3),
          Company: r.company.name != 'Catchall' ? r.company.name : null,
          Person: r.contact && r.contact.name ? r.contact.name : null,
          Title: r.summary,
          Priority: r.priority.name,
        });
      }
    }
  }

  return tickets;
};

export const newTickets = async (client) => {
  sl('Checking for new tickets');
  let tickets = await ticketCheck();
  tickets = tickets.new;
  if (tickets?.length == 0) {
    return null;
  }

  for await (const ticket of tickets) {
    let message = ``;
    if (ticket.Person && ticket.Company) {
      message = `${ticket.Person} from ${ticket.Company} put in a new ${ticket.Priority} ticket - #${ticket.TicketNumber}: ${ticket.Title}`;
    } else if (!ticket.Person && ticket.Company) {
      message = `${ticket.Company} put in a new ${ticket.Priority} ticket - #${ticket.TicketNumber}: ${ticket.Title}`;
    } else if (ticket.Person && !ticket.Company) {
      message = `${ticket.Person} put in a new ${ticket.Priority} ticket - #${ticket.TicketNumber}: ${ticket.Title}`;
    } else {
      message = `${ticket.Person ? ticket.Person : ''} from ${ticket.Company ? ticket.Company : ''} put in a new ${ticket.Priority} ticket - #${ticket.TicketNumber}: ${ticket.Title}`;
    }
    await client.sendText(config.connectwise.notifRoom, message);
  }
};

export const oldTickets = async (client) => {
  sl('Checking for old tickets');
  let tickets = await ticketCheck();
  tickets = tickets.old;

  if (tickets?.length == 0) {
    return null;
  }

  for await (const ticket of tickets) {
    let message = ``;
    let minutestill = 120 - ticket.LifeSpan * 60;
    if (ticket.LifeSpan < 1.99) {
      if (ticket.Person && ticket.Company) {
        message = `Ticket ${ticket.TicketNumber} from ${ticket.Person} at ${ticket.Company} is ${minutestill.toFixed(2)} minutes away from being overdue!!`;
      } else if (!ticket.Person && ticket.Company) {
        message = `Ticket ${ticket.TicketNumber} from ${ticket.Company} is ${minutestill.toFixed(2)} minutes away from being overdue!!`;
      } else if (ticket.Person && !ticket.Company) {
        message = `Ticket ${ticket.TicketNumber} from ${ticket.Person} is ${minutestill.toFixed(2)} minutes away from being overdue!!`;
      } else {
        message = `Ticket ${ticket.TicketNumber} from ${ticket.Person ? ticket.Person : ''} at ${ticket.Company ? ticket.Company : ''} is ${minutestill.toFixed(2)} minutes away from being overdue!!`;
      }
    } else {
      if (ticket.Person && ticket.Company) {
        message = `Ticket ${ticket.TicketNumber} from ${ticket.Person} at ${ticket.Company} is currently over due!!`;
      } else if (!ticket.Person && ticket.Company) {
        message = `Ticket ${ticket.TicketNumber} from ${ticket.Company} is currently over due!!`;
      } else if (ticket.Person && !ticket.Company) {
        message = `Ticket ${ticket.TicketNumber} from ${ticket.Person} is currently over due!!`;
      } else {
        message = `Ticket ${ticket.TicketNumber} from  ${ticket.Person ? ticket.Person : ''} at ${ticket.Company ? ticket.Company : ''} is currently over due!!`;
      }
    }
    await client.sendText(config.connectwise.notifRoom, message);
  }
};
