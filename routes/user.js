const router = require('koa-router')()
const { login,registeUser,getUserList,updateUser,exportUserList,userInfo } = require('../controller/user')
const { SuccessModel, ErrorModel } = require('../model/resModel')
const { getUserStats } = require('../controller/blog')
router.prefix('/api/user')
const jwt = require('jsonwebtoken')
const { SECRET_KEY } = require('../config/key')


router.post('/login', async (ctx) => {
    const { username, pppp } = ctx.request.body;
    try {
        const data = await login(username, pppp);
        if (data.username) {
            // 生成 JWT token，包含用户信息
            const token = jwt.sign({
                id: data._id,
                username: data.username,
                realname: data.realname,
                avatar: data.avatarPath
            }, SECRET_KEY, { 
                expiresIn: '24h' 
            });

            // 获取用户统计信息
            const userStats = await getUserStats(data._id);
            data.userStats = userStats;

            // 返回 token 和用户信息
            ctx.body = new SuccessModel({ 
                token, 
                userinfo: data 
            });
        } else {
            ctx.body = new ErrorModel('账号或密码错误');
        }
    } catch (error) {
        console.error('Error in login:', error);
        ctx.body = new ErrorModel('登录失败');
    }
});

router.post('/register', function (ctx, next) {
    const { username, pppp, realname, avatarPath } = ctx.request.body;
    const result = registeUser(username, pppp, realname, avatarPath)
    return result.then(data => {
        if (data) {
            ctx.body = new SuccessModel('注册成功')
        } else {
            ctx.body = new ErrorModel('注册失败:用户已存在')
        }
    })
});

router.get('/info', function (ctx, next) {
    const { _id } = ctx.request.query;
    const result = userInfo(_id)
    return result.then(data => {
        ctx.body = new SuccessModel(data)
    })
});

router.get('/list', function (ctx, next) {
    const { username, realname, page, pageSize } = ctx.request.query;
    const result = getUserList(username, realname, page, pageSize)
    return result.then(data => {
        ctx.body = new SuccessModel(data)
    })
});

router.post('/update', function (ctx, next) {
    const { _id, realname, avatarPath } = ctx.request.body;
    const result = updateUser(_id, realname, avatarPath)
    return result.then(data => {
        ctx.body = new SuccessModel(data)
    })
});

router.get('/export', async function (ctx, next) {
    const { username, realname } = ctx.request.query;
    try {
        const excelBuffer = await exportUserList(username, realname);
        
        // 同时支持中文文件名和英文文件名
        ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        ctx.set('Content-Disposition', `attachment; filename="userlist.xlsx"; filename*=UTF-8''${encodeURIComponent('用户列表.xlsx')}`);
        
        // 发送文件
        ctx.body = excelBuffer;
    } catch (error) {
        console.error('Export error:', error);
        ctx.body = new ErrorModel('导出失败');
    }
});



module.exports = router