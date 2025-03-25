const router = require('koa-router')()
const { SuccessModel, ErrorModel } = require('../model/resModel')
const KoaBody = require('koa-body').default;
const path = require('path');
const fs = require('fs');

router.prefix('/api/common')
// 上传接口详解：
// 1. 使用koa-body中间件来处理文件上传
// 2. 设置上传文件的目录
// 3. 保留文件扩展名
// 4. 获取上传的文件
// 5. 返回上传成功的文件路径
router.post('/upload', async (ctx, next) => {
    // 确保上传目录存在
    const uploadDir = path.join(__dirname, '../uploads/files');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 使用 koa-body 中间件
    await KoaBody({
        multipart: true,
        formidable: {
            uploadDir: uploadDir,
            keepExtensions: true,
        }
    })(ctx, next);

    try {
        const file = ctx.request.files.file;
        if (!file) {
            throw new Error('没有接收到文件');
        }
        
        const fileName = path.basename(file.filepath);
        const relativeFilePath = `files/${fileName}`;
        
        ctx.body = new SuccessModel({
            message: '文件上传成功',
            filePath: relativeFilePath
        });
    } catch (error) {
        console.error('文件上传错误:', error);
        ctx.body = new ErrorModel({
            message: `文件上传失败: ${error.message}`
        });
    }
});

module.exports = router