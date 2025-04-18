const router = require('koa-router')()
const { SuccessModel, ErrorModel } = require('../model/resModel')
const {getUserStats, addStar, delBlog, getList, newBlog, updataBlog, getDetail, likeBlog, addComment, replyComment, getAnalytics } = require('../controller/blog')
const loginCheck = require('../middleware/loginCheck')

router.prefix('/api/blog')

// 模拟pm2发生错误时路由
router.get('/error', async function (ctx, next) {
    throw new Error('发生错误')
})

router.get('/test', async function (ctx, next) {
    ctx.body = '113331 test ok -- deploy success3333'
})

router.get('/list', async function (ctx, next) {
    const { author, keyword, page, pageSize,mode } = ctx.query
    const result = await getList(author, keyword, page, pageSize,mode)
    ctx.body = (new SuccessModel(result))
});

router.get('/mylist', loginCheck, async function (ctx, next) {
    const author = ctx.state.user.username
    const { keyword, page, pageSize } = ctx.query
    const result = await getList(author, keyword, page, pageSize)
    ctx.body = (new SuccessModel(result))
});

router.post('/new', loginCheck, async function (ctx, next) {
    const blogData = ctx.request.body
    blogData.author = ctx.state.user.username
    const result = await newBlog(blogData)
    ctx.body = (new SuccessModel(result))

})

router.post('/update', loginCheck, async function (ctx, next) {
    const blogData = ctx.request.body
    blogData.author = ctx.state.user.username
    const result = await updataBlog(blogData)
    ctx.body = (new SuccessModel(result))
})

router.get('/detail', async function (ctx, next) {
    const { id } = ctx.query
    const result = await getDetail(id)
    ctx.body = (new SuccessModel(result))

})

router.post('/del', loginCheck, async function (ctx, next) {
    const { id } = ctx.request.body
    const author = ctx.state.user.username
    const result = await delBlog(id, author)
    if (result) {
        ctx.body = (new SuccessModel())
    }
    else {
        ctx.body = (new SuccessModel('删除失败'))
    }
})

router.post('/like',loginCheck, async function (ctx, next) {
    const { id,status } = ctx.request.body
    const userId = ctx.state.user.id
    const result = await likeBlog(id, userId,status)
    if (result && result.message) {
        ctx.body = (new ErrorModel(result.message))
    } else if (result) {
        ctx.body = (new SuccessModel(result))
    } else {
        ctx.body = (new ErrorModel('点赞失败'))
    }
})

router.post('/comment',loginCheck, async function (ctx, next) {
    const { id, content } = ctx.request.body
    const userId = ctx.state.user.id
    const realname = ctx.state.user.realname
    const avatar = ctx.state.user.avatar
    console.log(ctx.state.user,'评论接口')
    const commentData = { userId, realname, content,avatar }
    const result = await addComment(id, commentData)
    if (result) {
        ctx.body = (new SuccessModel(result))
    } else {
        ctx.body = (new ErrorModel('添加评论失败'))
    }
})

router.post('/comment/reply', loginCheck, async function (ctx, next) {
    const { blogId, commentId, content,replyToId } = ctx.request.body;
    const userId = ctx.state.user.id;
    const realname = ctx.state.user.realname;
    const replyData = { userId, realname, content,replyToId };
    const result = await replyComment(blogId, commentId, replyData,replyToId);
    if (result) {
        ctx.body = (new SuccessModel(result));
    } else {
        ctx.body = (new ErrorModel('回复评论失败'));
    }
});

router.get('/analytics', async function (ctx, next) {
    try {
        const result = await getAnalytics()
        ctx.body = new SuccessModel(result)
    } catch (err) {
        console.error('Analytics error:', err)
        ctx.body = new ErrorModel('获取数据失败')
    }
})

router.post('/star', loginCheck, async function (ctx, next) {
    const { id, status } = ctx.request.body
    console.log(ctx.state.user,'收藏接口')
    const userId = ctx.state.user.id
    const result = await addStar(id, userId, status)
    ctx.body = (new SuccessModel(result))
})

router.get('/user-stats', loginCheck, async function (ctx, next) {
    try {
        const userId = ctx.state.user.id
        const result = await getUserStats(userId)
        if (result) {
            ctx.body = new SuccessModel(result)
        } else {
            ctx.body = new ErrorModel('获取统计数据失败')
        }
    } catch (err) {
        console.error('统计接口错误:', err)
        ctx.body = new ErrorModel('获取统计数据失败')
    }
})

module.exports = router
