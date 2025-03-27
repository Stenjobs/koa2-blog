const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/key');
const { redis } = require('../db/redis');
const { ChatMessage } = require('../db/model/chat');

class SocketService {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.NODE_ENV === 'development' ? 'http://localhost:8866' : 'http://8.134.205.132:6677',
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.io.use(this.authenticate);
        this.setupEventHandlers();
    }

    // Socket.IO 认证中间件
    authenticate = async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                throw new Error('No token provided');
            }

            // 验证 token
            const decoded = jwt.verify(token, SECRET_KEY);
            socket.userId = decoded.id;
            socket.user = decoded;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    }

    // 设置事件处理器
    setupEventHandlers() {
        this.io.on('connection', async (socket) => {
            const userId = socket.userId;
            
            // 将用户添加到在线用户集合
            await redis.sadd('online_users', userId);
            socket.join(userId); // 加入以用户ID命名的房间

            // 广播在线用户列表
            const onlineUsers = await redis.smembers('online_users');
            this.io.emit('users_online', onlineUsers);

            // 处理私聊消息
            socket.on('private_message', async (data) => {
                try {
                    const message = await ChatMessage.create({
                        sender: userId,
                        receiver: data.receiver,
                        content: data.content,
                        type: data.type || 'text'
                    });

                    // 发送给接收者（特定的房间）
                    this.io.to(data.receiver).emit('private_message', message);

                    // 发送确认给发送者
                    socket.emit('message_sent', {
                        messageId: message._id,
                        status: 'sent'
                    });
                } catch (error) {
                    console.error('发送消息失败:', error);
                    socket.emit('message_error', {
                        error: '发送消息失败'
                    });
                }
            });

            // 处理消息已读状态
            socket.on('message_read', async (data) => {
                try {
                    await ChatMessage.updateMany(
                        {
                            sender: data.sender,
                            receiver: userId,
                            status: { $ne: 'read' }
                        },
                        {
                            $set: { status: 'read' }
                        }
                    );

                    // 通知发送者消息已读
                    this.io.to(data.sender).emit('messages_read', {
                        reader: userId
                    });
                } catch (error) {
                    console.error('更新消息状态失败:', error);
                }
            });

            // 断开连接处理
            socket.on('disconnect', async () => {
                await redis.srem('online_users', userId);
                const onlineUsers = await redis.smembers('online_users');
                this.io.emit('users_online', onlineUsers);
            });
        });
    }
}

module.exports = SocketService;