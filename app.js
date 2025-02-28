const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const session = require('koa-generic-session')
const redisStore = require('koa-redis')
const path = require('path')
const fs = require('fs')
const morgan = require('koa-morgan')
const static = require('koa-static')
const cors = require('koa2-cors')
const Visit = require('./db/model/visit')

// 设置静态文件目录
app.use(static(path.join(__dirname, 'uploads')));

// 添加cors中间件配置 
app.use(cors({
  // origin: function(ctx) { // 设置允许来自指定域名请求
  //   return '*'; // 允许来自所有域名请求
  // },
  origin: ['http://localhost:8866'],
  maxAge: 5, // 指定本次预检请求的有效期，单位为秒。
  credentials: true, // 是否允许发送Cookie
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 设置所允许的HTTP请求方法
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'], // 设置服务器支持的所有头信息字段
  exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'] // 设置获取其他自定义字段
}));

const REDIS_CONF = require('./config/db.js')

const index = require('./routes/index')
const users = require('./routes/users')
const blog = require('./routes/blog')
const user = require('./routes/user')
const common = require('./routes/common')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text'] // 解析支持的格式
}))
app.use(json()) // json解析
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

const ENV = process.env.NODE_ENV;
if (ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  const logStream = fs.createWriteStream(path.join(__dirname, 'logs/access.log'), { flags: 'a' });
  app.use(morgan('combined', {
    // stream: process.stdout,// 输出在控制台
    stream: logStream // 输出在日志文件中
  }
  ));
}

// session配置
app.keys = ['caoliwenping'] //秘钥，相当于express中的session.secret
app.use(session({
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  },
  store: new redisStore({
    // all: '127.0.0.1:6379' // redis的地址
    all: `${REDIS_CONF.host}:${REDIS_CONF.port}`
  })
}))

// 添加访问记录中间件
app.use(async (ctx, next) => {
    try {
        await Visit.create({
            ip: ctx.ip,
            url: ctx.url
        })
    } catch (err) {
        console.error('记录访问失败:', err)
    }
    await next()
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())
app.use(blog.routes(), blog.allowedMethods())
app.use(user.routes(), user.allowedMethods())
app.use(common.routes(), common.allowedMethods())
// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
