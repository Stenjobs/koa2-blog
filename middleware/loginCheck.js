const jwt = require('jsonwebtoken')
const { ErrorModel } = require('../model/resModel')
const { SECRET_KEY } = require('../config/key')

module.exports = async (ctx, next) => {
    const token = ctx.header.authorization
    if (!token) {
        ctx.body = new ErrorModel('未登录')
        return
    }

    try {
        // 验证token
        const decoded = jwt.verify(token.split(' ')[1], SECRET_KEY) //这里为什么要token.split(' ')[1]，因为token是Authorization: Bearer <token>，所以需要去掉Bearer
        ctx.state.user = decoded // 将解码后的用户信息存储到ctx.state中供后续使用
        await next()
    } catch (err) {
        console.error('登录验证失败:', err)
        ctx.body = new ErrorModel('请重新登录', '', 401)
        return
    }
}

// module.exports = async(ctx, next) => {
//     if (!ctx.session.username) {
//         ctx.body = new ErrorModel('Not Login')
//         return
//     }
//     await next()
// }
