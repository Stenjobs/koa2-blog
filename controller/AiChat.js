const axios = require('axios')

const callAiChat = async (ctx) => {
    const { messages, model = 'qwen-turbo' } = ctx.request.body

    if (!messages?.length) {
        ctx.body = { code: 400, message: 'messages 不能为空' }
        return
    }

    try {
        const res = await axios.post(
            'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
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

        ctx.body = res.data
    } catch (error) {
        const status = error.response?.status || 500
        ctx.status = status
        ctx.body = { code: status, message: '上游 API 错误' }
    }
}

module.exports = {
    callAiChat
}