const { ChromaClient } = require('chromadb')
const axios = require('axios')

const client = new ChromaClient({
    path: process.env.CHROMA_URL || 'http://localhost:8000'
})
const COLLECTION_NAME = 'blog_articles'

// 初始化时先确保 collection 存在（只需要运行一次）
async function ensureCollection() {
    try {
        return await client.getCollection({ name: COLLECTION_NAME })
    } catch {
        // collection 不存在就创建
        return await client.createCollection({ 
            name: COLLECTION_NAME,
            metadata: { 'hnsw:space': 'cosine' }
        })
    }
}

// 向量化
async function embedText(text) {
    const res = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
        {
            model: 'text-embedding-v4',
            input: text,
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
            },
        }
    )
    return res.data.data[0].embedding
}

// 文章切片
function splitIntoChunks(text, maxLen = 500) {
    const paragraphs = text.split('\n\n').filter(Boolean)
    const chunks = []
    let current = ''
    for (const p of paragraphs) {
        if ((current + p).length > maxLen) {
            if (current) chunks.push(current.trim())
            current = p
        } else {
            current += '\n\n' + p
        }
    }
    if (current) chunks.push(current.trim())
    return chunks.filter(c => c.length > 10)
}

// 单篇文章写入
async function indexArticle(article) {
    try {
        const collection = await ensureCollection()  // 换这里

        const chunks = splitIntoChunks(article.content)
        if (!chunks.length) return

        const ids = chunks.map((_, i) => `${article._id}_chunk_${i}`)
        const embeddings = await Promise.all(chunks.map(embedText))
        const metadatas = chunks.map(() => ({
            articleId: article._id.toString(),
            title: article.title,
        }))

        await collection.upsert({ ids, embeddings, documents: chunks, metadatas })
        console.log(`✅ 写入成功：${article.title}`)
    } catch (err) {
        console.error(`❌ 写入失败：${err.message}`)
    }
}

// 检索相关内容
async function retrieveRelated(question, topK = 3) {
    try {
        const collection = await ensureCollection()

        const count = await collection.count()
        console.log(`[RAG] ChromaDB 集合文档数：${count}`)
        if (count === 0) return []

        const queryEmbedding = await embedText(question)
        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: Math.min(topK * 3, count),
        })

        const MAX_DISTANCE = 1.99
        const filtered = []
        results.documents[0].forEach((doc, i) => {
            if (results.distances[0][i] < MAX_DISTANCE) {
                filtered.push({
                    content: doc,
                    title: results.metadatas[0][i].title,
                    articleId: results.metadatas[0][i].articleId,
                    distance: results.distances[0][i],
                })
            }
        })

        const seen = new Set()
        const deduped = filtered.filter(item => {
            if (seen.has(item.articleId)) return false
            seen.add(item.articleId)
            return true
        })

        return deduped.slice(0, topK)
    } catch (err) {
        console.error(`❌ 检索失败：${err.message}`)
        return []
    }
}

// 删除文章索引
async function deleteArticleIndex(articleId) {
    try {
        const collection = await ensureCollection()
        const ids = await collection.get({
            where: { articleId: articleId.toString() },
        })
        if (ids.ids && ids.ids.length > 0) {
            await collection.delete({ ids: ids.ids })
            console.log(`✅ 删除索引成功：articleId=${articleId}`)
        }
    } catch (err) {
        console.error(`❌ 删除索引失败：${err.message}`)
    }
}

module.exports = { indexArticle, retrieveRelated, deleteArticleIndex }