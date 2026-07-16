const router = require('koa-router')();
const loginCheck = require('../middleware/loginCheck');
const aiChatController = require('../controller/AiChat');
router.prefix('/api');

// RAG 对话接口
router.post('/ai-chat-rag', aiChatController.ragChat);

// 调用AI聊天
router.post('/ai-chat', aiChatController.callAiChat);


module.exports = router;