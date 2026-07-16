require('dotenv').config()
const mongoose = require('../db/db');
const { indexArticle } = require('../services/ragService')
const Blog = require('../db/model/blog')  // 换成你实际的 model 路径

async function main() {
    console.log('✅ 数据库已连接')

    const articles = await Blog.find({}).lean()
    console.log(`共找到 ${articles.length} 篇文章，开始写入...`)

    for (const article of articles) {
        await indexArticle(article)
        await new Promise(r => setTimeout(r, 500))  // 避免限流
    }

    console.log('🎉 全部写入完成')
    await mongoose.disconnect()
}

main().catch(console.error)