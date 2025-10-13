const { Ticket } = require('../models');
const logger = require('../utils/logger');
const { getChannel, releaseChannel } = require('../utils/rabbit');
const { v4: uuidv4 } = require('uuid');

function extractTimeFeatures(joinedAt) {
  const date = new Date(joinedAt);
  const hour = date.getHours();
  const jsDay = date.getDay();
  const day_of_week = (jsDay + 6) % 7;
  return { hour, day_of_week };
}

async function predictWaitingTime(lineId) {
  const waitingTickets = await Ticket.findAll({
    where: { line_id: lineId, status: 'waiting' },
    order: [['joined_at', 'ASC']]
  });

  if (!waitingTickets.length) return [];

  const ticketsPayload = waitingTickets.map((t, idx) => {
    const { hour, day_of_week } = extractTimeFeatures(t.joined_at);
    return {
      ticketId: t.id,
      queue_length: idx,
      hour,
      day_of_week
    };
  });

  const channel = await getChannel();
  const correlationId = uuidv4();

  logger.info(`Sending ${ticketsPayload.length} tickets for prediction`);

  // Gửi message đơn giản
  await channel.sendToQueue('predict_request', 
    Buffer.from(JSON.stringify({
      tickets: ticketsPayload,
      correlationId
    }))
  );

  // Chờ response
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      releaseChannel(channel);
      reject(new Error('Prediction timeout'));
    }, 10000);

    channel.consume('predict_response', async (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        
        if (data.correlationId === correlationId) {
          clearTimeout(timeout);
          
          // Update database
          for (const p of data.predictions) {
            await Ticket.update(
              { waiting_time: Math.round(p.waiting_time_prediction) },
              { where: { id: p.ticketId } }
            );
          }
          
          channel.ack(msg);
          releaseChannel(channel);
          resolve(data.predictions);
        } else {
          channel.nack(msg, false, true);
        }
      }
    });
  });
}

module.exports = { predictWaitingTime };