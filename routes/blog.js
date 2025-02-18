const router = require('koa-router')()
const { SuccessModel, ErrorModel } = require('../model/resModel')
const { delBlog, getList, newBlog, updataBlog, getDetail, likeBlog, addComment, replyComment } = require('../controller/blog')
const loginCheck = require('../middleware/loginCheck')

router.prefix('/api/blog')

// 模拟pm2发生错误时路由
router.get('/error', async function (ctx, next) {
    throw new Error('发生错误')
})

router.get('/test', async function (ctx, next) {
    ctx.body = '111 test ok -- deploy success'
})

router.get('/list', async function (ctx, next) {
    const { author, keyword, page, pageSize } = ctx.query
    const result = await getList(author, keyword, page, pageSize)
    ctx.body = (new SuccessModel(result))
});

router.get('/mylist', loginCheck, async function (ctx, next) {
    const author = ctx.session.username
    const { keyword, page, pageSize } = ctx.query
    const result = await getList(author, keyword, page, pageSize)
    ctx.body = (new SuccessModel(result))
});

router.post('/new', loginCheck, async function (ctx, next) {
    const blogData = ctx.request.body
    blogData.author = ctx.session.username
    const result = await newBlog(blogData)
    ctx.body = (new SuccessModel(result))

})

router.post('/update', loginCheck, async function (ctx, next) {
    const blogData = ctx.request.body
    blogData.author = ctx.session.username
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
    const author = ctx.session.username
    const result = await delBlog(id, author)
    if (result) {
        ctx.body = (new SuccessModel())
    }
    else {
        ctx.body = (new SuccessModel('删除失败'))
    }
})

router.post('/like',loginCheck, async function (ctx, next) {
    console.log(ctx.session,'0-----------------------')
    const { id,status } = ctx.request.body
    const userId = ctx.session._id
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
    const userId = ctx.session._id
    const realname = ctx.session.realname
    const commentData = { userId, realname, content }
    const result = await addComment(id, commentData)
    if (result) {
        ctx.body = (new SuccessModel(result))
    } else {
        ctx.body = (new ErrorModel('添加评论失败'))
    }
})

router.post('/comment/reply', loginCheck, async function (ctx, next) {
    const { blogId, commentId, content,replyToId } = ctx.request.body;
    const userId = ctx.session._id;
    const realname = ctx.session.realname;
    const replyData = { userId, realname, content,replyToId };
    const result = await replyComment(blogId, commentId, replyData,replyToId);
    if (result) {
        ctx.body = (new SuccessModel(result));
    } else {
        ctx.body = (new ErrorModel('回复评论失败'));
    }
});

module.exports = router
