const { Ticket } = require('../models');
const logger = require('../utils/logger');
const { getChannel } = require('../utils/rabbit'); // Giả sử hàm này trả về channel rabbitmq
const { v4: uuidv4 } = require('uuid');

async function getPredictionsFromAI(payload) {
    const channel = await getChannel();
    const correlationId = uuidv4();
    const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

    return new Promise(async (resolve, reject) => {
        let consumerTag = null;

        const timeout = setTimeout(() => {
            if (consumerTag) channel.cancel(consumerTag).catch(() => {});
            reject(new Error('AI Service timeout'));
        }, 10000);

        const { consumerTag: tag } = await channel.consume(
            REPLY_QUEUE,
            (msg) => {
                if (!msg) return;

                if (msg.properties.correlationId === correlationId) {
                    clearTimeout(timeout);
                    const result = JSON.parse(msg.content.toString());
                    channel.cancel(tag).catch(() => {});
                    resolve(result);
                }
            },
            { noAck: true, exclusive: true }
        );

        consumerTag = tag;

        channel.sendToQueue(
            'ai_queue_prediction',
            Buffer.from(JSON.stringify(payload)),
            {
                correlationId: correlationId,
                replyTo: REPLY_QUEUE
            }
        );
    });
}


async function predictWaitingTime(lineId) {
    try {
        // 1. Lấy dữ liệu từ DB
        const waitingTickets = await Ticket.findAll({
            where: { line_id: lineId, status: 'waiting' },
            order: [['joined_at', 'ASC']]
        });

        if (!waitingTickets.length) return [];

        // 2. Chuẩn bị Payload (Extract Features)
        const aiPayload = waitingTickets.map((t, idx) => {
            const date = new Date(t.joined_at);
            const hour = date.getHours();
            const jsDay = date.getDay();
            const day_of_week = (jsDay + 6) % 7; // Convert Sun(0) -> 6, Mon(1) -> 0 như Python train

            return {
                ticketId: t.id,
                queue_length: idx + 1,
                hour: date.getHours(),
                day_of_week: (date.getDay() + 6) % 7
            };
        });

        console.log(`Sending ${aiPayload.length} tickets to AI...`);

        // 3. GỌI AI QUA RABBITMQ
        const predictions = await getPredictionsFromAI(aiPayload);
        
        // 4. Update Database với kết quả nhận được
        // predictions = [{ ticketId: 1, predicted_wait_time: 15.5 }, ...]
        
        // Cách tối ưu: Update hàng loạt (Bulk Update) thay vì loop await
        const updatePromises = predictions.map(pred => {
            return Ticket.update(
                { waiting_time: Math.round(pred.predicted_wait_time) },
                { where: { id: pred.ticketId } }
            );
        });

        await Promise.all(updatePromises);
        console.log("Updated waiting time successfully!");

        return predictions;

    } catch (error) {
        logger.error("Error predicting wait time:", error);
        throw error;
    }
}

module.exports = { predictWaitingTime };