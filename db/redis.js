const Redis = require('ioredis');
const redisStore = require('koa-redis');
const REDIS_CONF = require('../config/db.js');

// 创建 Redis 客户端的工厂函数
const createRedisClient = () => {
    return new Redis({
        host: REDIS_CONF.host,
        port: REDIS_CONF.port
    });
};

// 创建主 Redis 客户端实例
const redis = createRedisClient();

// 创建 session 存储实例
const sessionStore = new redisStore({
    host: REDIS_CONF.host,
    port: REDIS_CONF.port
});

module.exports = {
    redis,
    sessionStore,
    createRedisClient
};


