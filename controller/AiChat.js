const axios = require('axios')
const { retrieveRelated } = require('../services/ragService')

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

const callAiChat = async (ctx) => {
    const { messages, model = 'qwen-turbo' } = ctx.request.body

    if (!messages?.length) {
        ctx.body = { code: 400, message: 'messages 不能为空' }
        return
    }

    try {
        const res = await axios.post(
            DASHSCOPE_URL,
            {
                model,
                messages,
                stream: true,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
                },
                responseType: 'stream',
            }
        )

        ctx.set('Content-Type', 'text/event-stream')
        ctx.set('Cache-Control', 'no-cache')
        ctx.set('Connection', 'keep-alive')
        ctx.status = 200

        res.data.on('error', (err) => {
            console.error('callAiChat 流式响应错误:', err)
        })

        ctx.body = res.data
    } catch (error) {
        const status = error.response?.status || 500
        ctx.status = status
        ctx.body = { code: status, message: '上游 API 错误' }
    }
}

const ragChat = async (ctx) => {
    const { messages, model = 'qwen-turbo' } = ctx.request.body

    if (!messages?.length) {
        ctx.status = 400
        ctx.body = { code: 400, message: 'messages 不能为空' }
        return
    }

    const question = messages[messages.length - 1].content
    if (!question) {
        ctx.status = 400
        ctx.body = { code: 400, message: '问题不能为空' }
        return
    }

    ctx.res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    })

    ctx.respond = false
    const stream = ctx.res
    let streamEnded = false

    const safeEnd = () => {
        if (!streamEnded) {
            streamEnded = true
            stream.end()
        }
    }

    try {
        console.log(`[RAG] 开始检索：${question.slice(0, 50)}...`)
        const related = await retrieveRelated(question, 3)
        console.log(`[RAG] 检索到 ${related.length} 篇相关文章`, related.map(r => ({ title: r.title, distance: r.distance })))

        let systemContent = ''
        let blogRefs = []

        if (related.length > 0) {
            const contextText = related
                .map(r => `【${r.title}】\n${r.content}`)
                .join('\n\n---\n\n')

            blogRefs = related.map(r => ({
                title: r.title,
                articleId: r.articleId,
                excerpt: r.content.slice(0, 100) + '...',
            }))

            systemContent = `你是一个博客助手。
回答时请结合以下博客文章内容，同时也可以补充通用知识。
博客相关内容：
${contextText}`
        } else {
            systemContent = '你是一个智能助手，请回答用户的问题。'
        }

        const fullMessages = [
            { role: 'system', content: systemContent },
            ...messages,
        ]

        stream.write(
            `data: ${JSON.stringify({ type: 'blog_refs', refs: blogRefs })}\n\n`
        )

        const res = await axios.post(
            DASHSCOPE_URL,
            { model, messages: fullMessages, stream: true },
            {
                headers: {
                    Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'stream',
            }
        )

        res.data.on('data', (chunk) => {
            stream.write(chunk)
        })

        res.data.on('end', () => {
            safeEnd()
        })

        res.data.on('error', (err) => {
            console.error('流式响应错误:', err)
            safeEnd()
        })
    } catch (error) {
        console.error('RAG 接口错误:', error)
        stream.write(`data: ${JSON.stringify({ type: 'error', message: '请求出现错误，请稍后重试' })}\n\n`)
        safeEnd()
    }
}

module.exports = {
    callAiChat,
    ragChat,
}