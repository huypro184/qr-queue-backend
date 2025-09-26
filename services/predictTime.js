const { Ticket } = require('../models');
const axios = require('axios');

function extractTimeFeatures(joinedAt) {
  const date = new Date(joinedAt);
  const hour = date.getHours();
  const jsDay = date.getDay();
  const day_of_week = (jsDay + 6) % 7;
  return { hour, day_of_week };
}

// async function predictWaitingTime(ticketId) {

//     const ticket = await Ticket.findByPk(ticketId);
//     if (!ticket) throw new Error('Ticket not found');

//     const queue_length =  ticket.queue_length_at_join;
//     const { hour, day_of_week } = extractTimeFeatures(ticket.joined_at);

//     const payload = { queue_length, hour, day_of_week };

//     const response = await axios.post('http://ai-service:9100/predict', payload);

//     return response.data.waiting_time_prediction;
// }

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

    const payload = { tickets: ticketsPayload };

  const response = await axios.post('http://ai-service:9100/predict', payload);

  const predictions = response.data; // [{ ticketId, waiting_time_prediction }]

  // update DB + return
  for (const p of predictions) {
    await Ticket.update(
      { waiting_time: Math.round(p.waiting_time_prediction) },
      { where: { id: p.ticketId } }
    );
  }

  return predictions;
}

module.exports = { predictWaitingTime };