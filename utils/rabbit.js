const amqp = require('amqplib');

let connection;

async function getConnection() {
  if (!connection) {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
  }
  return connection;
}

async function getChannel() {
  const conn = await getConnection();
  const channel = await conn.createChannel();
  
  await channel.assertQueue('predict_request', { durable: true });
  await channel.assertQueue('predict_response', { durable: true });
  
  return channel;
}

function releaseChannel(channel) {
  if (channel) {
    channel.close().catch(() => {});
  }
}

module.exports = { getChannel, releaseChannel };