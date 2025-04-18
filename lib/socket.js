const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/key');
const { redis, createRedisClient } = require('../db/redis');
const { ChatMessage } = require('../db/model/chat');
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require('ioredis');
const REDIS_CONF = require('../config/db.js');

class SocketService {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.NODE_ENV === 'development' ? 'http://localhost:8866' : 'http://8.134.205.132:6677',
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        // 直接创建新的 Redis 实例，而不是使用现有的
        const pubClient = new Redis({
            host: REDIS_CONF.host,
            port: REDIS_CONF.port,
            lazyConnect: true
        });

        const subClient = new Redis({
            host: REDIS_CONF.host,
            port: REDIS_CONF.port,
            lazyConnect: true
        });

        // 连接并设置适配器
        Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]).then(() => {
            this.io.adapter(createAdapter(pubClient, subClient));
            console.log('Redis 适配器设置成功');
        }).catch(err => {
            console.error('Redis 适配器设置失败:', err);
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

                    // 更新消息状态
                    await ChatMessage.updateOne({ _id: message._id }, { $set: { status: 'delivered' } });

                    message.status = 'delivered';

                    // 发送确认给发送者
                    socket.emit('message_sent', {
                        receiverId: data.receiver,
                        message: message
                    });
                } catch (error) {
                    console.error('发送消息失败:', error);
                    socket.emit('message_error', {
                        error: '发送消息失败'
                    });
                }
            });

            // 处理消息已读状态
            socket.on('message_read', async ({ senderId,messageIds }) => {
                try {
                    await ChatMessage.updateMany(
                        {
                            sender: senderId,
                            receiver: userId,
                            _id: { $in: messageIds },
                            status: { $ne: 'read' }
                        },
                        {
                            $set: { status: 'read' }
                        }
                    );

                    // 通知发送者消息已读
                    this.io.to(senderId).emit('messages_read', {
                        messageIds,
                        senderId:userId
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