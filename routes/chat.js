const router = require('koa-router')();
const loginCheck = require('../middleware/loginCheck');
const chatController = require('../controller/chat');
router.prefix('/api/chat');

// 获取好友列表
router.get('/friends', loginCheck, chatController.getFriends);

// 获取聊天记录
router.get('/history', loginCheck, chatController.getChatHistory);

// 发送好友请求
router.post('/friend-request', loginCheck, chatController.sendFriendRequest);

// 处理好友请求
router.post('/friend-request/handle', loginCheck, chatController.handleFriendRequest);

// 检查好友关系
router.get('/check-friend', loginCheck, chatController.checkFriendStatus);

// 获取好友请求列表
router.get('/friend-requests', loginCheck, chatController.getFriendRequests);

module.exports = router;