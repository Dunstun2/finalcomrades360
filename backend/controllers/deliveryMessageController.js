const { DeliveryMessage, User, Order } = require('../models');
const { getIO } = require('../realtime/socket');

// List messages for an order
const getOrderMessages = async (req, res) => {
    try {
        const { orderId } = req.params;
        const messages = await DeliveryMessage.findAll({
            where: { orderId },
            include: [
                { model: User, as: 'sender', attributes: ['id', 'name', 'role'] }
            ],
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching delivery messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// Send a message via REST (for initial message or non-socket fallback)
const sendMessage = async (req, res) => {
    try {
        const { orderId, receiverId, message, type = 'text' } = req.body;
        const senderId = req.user.id;

        const newMessage = await DeliveryMessage.create({
            orderId,
            senderId,
            receiverId,
            message,
            type
        });

        const fullMessage = await DeliveryMessage.findByPk(newMessage.id, {
            include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }]
        });

        // Broadcast via Socket
        const io = getIO();
        if (io) {
            io.to(`user_${receiverId}`).emit('delivery_message_receive', fullMessage);
        }

        res.status(201).json(fullMessage);
    } catch (error) {
        console.error('Error sending delivery message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// Mark messages as read
const markAsRead = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        await DeliveryMessage.update(
            { isRead: true },
            {
                where: {
                    orderId,
                    receiverId: userId,
                    isRead: false
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to update messages' });
    }
};

module.exports = {
    getOrderMessages,
    sendMessage,
    markAsRead
};
