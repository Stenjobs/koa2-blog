const redisStore = require('koa-redis')

const REDIS_CONF = require('../config/db.js')

const redisClient = new redisStore({
    host: REDIS_CONF.host,
    port: REDIS_CONF.port
})

module.exports = {
    redisClient
}

