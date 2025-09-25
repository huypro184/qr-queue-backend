const { Ticket } = require('../models');
const axios = require('axios');

function extractTimeFeatures(joinedAt) {
  const date = new Date(joinedAt);
  const hour = date.getHours();
  const jsDay = date.getDay();
  const day_of_week = (jsDay + 6) % 7;
  return { hour, day_of_week };
}

async function predictWaitingTime(ticketId) {

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const queue_length =  ticket.queue_length_at_join;
    const { hour, day_of_week } = extractTimeFeatures(ticket.joined_at);

    const payload = { queue_length, hour, day_of_week };

    const response = await axios.post('http://ai-service:9100/predict', payload);

    return response.data.waiting_time_prediction;
}

module.exports = { predictWaitingTime };