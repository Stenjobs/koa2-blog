const callAiChat = async (ctx) => {
    const { messages, model = 'qwen-turbo' } = ctx.request.body

    if (!messages?.length) {
        ctx.body = { code: 400, message: 'messages 不能为空' }
        return
    }

    const res = await fetch(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
            },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
            }),
        }
    )

    if (!res.ok) {
        ctx.status = res.status
        ctx.body = { code: res.status, message: '上游 API 错误' }
        return
    }

    // 设置 SSE 响应头
    ctx.set('Content-Type', 'text/event-stream')
    ctx.set('Cache-Control', 'no-cache')
    ctx.set('Connection', 'keep-alive')
    ctx.status = 200

    // 用 Node.js 原生方式转发流
    const { Readable } = require('stream')
    const reader = res.body.getReader()

    const nodeStream = new Readable({
        async read() {
            const { done, value } = await reader.read()
            if (done) {
                this.push(null)
            } else {
                this.push(Buffer.from(value))
            }
        }
    })

    ctx.body = nodeStream
}

module.exports = {
    callAiChat
}
