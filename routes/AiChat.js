const router = require('koa-router')();
const loginCheck = require('../middleware/loginCheck');
const aiChatController = require('../controller/AiChat');
router.prefix('/api');

// 调用AI聊天
router.post('/ai-chat', aiChatController.callAiChat);


module.exports = router;