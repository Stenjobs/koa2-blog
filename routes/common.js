const router = require('koa-router')()
const { SuccessModel, ErrorModel } = require('../model/resModel')
const KoaBody = require('koa-body').default;
const path = require('path');

router.prefix('/api/common')
// 上传接口详解：
// 1. 使用koa-body中间件来处理文件上传
// 2. 设置上传文件的目录
// 3. 保留文件扩展名
// 4. 获取上传的文件
// 5. 返回上传成功的文件路径
router.post('/upload', KoaBody({
    multipart: true,
    formidable: {
        uploadDir: path.join(__dirname, '../uploads/files'), // 设置上传文件的目录
        keepExtensions: true, // 保留文件扩展名
    }
}), async (ctx, next) => {
    const file = ctx.request.files.file; // 获取上传的文件
    if (file) {
        const fileName = path.basename(file.filepath); // 获取文件名
        const relativeFilePath = `files/${fileName}`; // 拼接成新的路径
        ctx.body = new SuccessModel({
            message: '文件上传成功',
            filePath: relativeFilePath
        });
    } else {
        ctx.body = new ErrorModel({
            message: '文件上传失败'
        });
    }
});

module.exports = router