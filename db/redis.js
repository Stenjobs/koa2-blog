const Redis = require('ioredis');
const redisStore = require('koa-redis');
const REDIS_CONF = require('../config/db.js');

// 创建 Redis 客户端实例
const redis = new Redis({
    host: REDIS_CONF.host,
    port: REDIS_CONF.port
});

// 创建 session 存储实例
const sessionStore = new redisStore({
    host: REDIS_CONF.host,
    port: REDIS_CONF.port
});

module.exports = {
    redis,  // 用于普通的 Redis 操作
    sessionStore  // 用于 session 存储
};


