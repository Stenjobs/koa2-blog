const { ChatMessage, Friendship } = require('../db/model/chat');
const { User } = require('../db/model/user');
const { redis, sessionStore } = require('../db/redis');
const { SuccessModel, ErrorModel } = require('../model/resModel');

class ChatController {
    // 获取好友列表
    async getFriends(ctx) {
        // const { userId } = ctx.state.user;
        const userId = ctx.session._id
        console.log(ctx.session,'ctx.session的值')
        console.log(userId,'userId的值')
        try {
            const friendships = await Friendship.find({
                user: userId,
                status: 'accepted'
            }).populate('friend', 'username realname avatarPath');

            // 获取在线状态
            const onlineUsers = await redis.smembers('online_users');
            const friends = friendships.map(f => ({
                ...f.friend.toJSON(),
                online: onlineUsers.includes(f.friend._id.toString())
            }));

            ctx.body = new SuccessModel({
                friends
            });
        } catch (error) {
            console.error('获取好友列表失败:', error);
            ctx.body = new ErrorModel({
                message: '获取好友列表失败'
            });
        }
    }

    // 获取好友请求列表
    async getFriendRequests(ctx) {
        const userId = ctx.session._id
        try {
            const requests = await Friendship.find({
                friend: userId,
                status: 'pending'
            }).populate('user', 'username realname avatarPath');

            ctx.body = new SuccessModel(
                requests
            );
        } catch (error) {
            console.error('获取好友请求列表失败:', error);
            ctx.body = new ErrorModel({
                message: '获取好友请求列表失败'
            });
        }
    }

    // 获取与指定好友的聊天记录
    async getChatHistory(ctx) {
        // const { userId } = ctx.state.user;
        const userId = ctx.session._id
        const { friendId } = ctx.query;
        const { page = 1, size = 20 } = ctx.query;

        try {
            const messages = await ChatMessage.find({
                $or: [
                    { sender: userId, receiver: friendId },
                    { sender: friendId, receiver: userId }
                ]
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * size)
            .limit(parseInt(size))

            ctx.body = new SuccessModel({
                messages: messages.reverse()
            });
        } catch (error) {
            console.error('获取聊天记录失败:', error);
            ctx.body = new ErrorModel({
                message: '获取聊天记录失败'
            });
        }
    }

    // 发送好友请求
    async sendFriendRequest(ctx) {
        const userId = ctx.session._id
        const { friendId } = ctx.request.body;

        try {
            // 检查是否已经是好友
            const existingFriendship = await Friendship.findOne({
                user: userId,
                friend: friendId
            });

            if (existingFriendship) {
                ctx.body = {
                    code: 400,
                    message: '已经发送过好友请求或已经是好友'
                };
                return;
            }

            // 创建好友请求
            await Friendship.create({
                user: userId,
                friend: friendId
            });

            ctx.body = new SuccessModel({
                message: '好友请求已发送'
            });
        } catch (error) {
            console.error('发送好友请求失败:', error);
            ctx.body = {
                code: 500,
                message: '发送好友请求失败'
            };
        }
    }

    // 处理好友请求
    async handleFriendRequest(ctx) {
        // const { userId } = ctx.state.user;
        const userId = ctx.session._id
        const { requestId, action } = ctx.request.body;

        try {
            const friendship = await Friendship.findById(requestId);
            if (!friendship) {
                ctx.body = {
                    code: 404,
                    message: '好友请求不存在'
                };
                return;
            }

            if (action === 'accept') {
                friendship.status = 'accepted';
                await friendship.save();

                // 创建双向好友关系
                await Friendship.create({
                    user: friendship.friend,
                    friend: friendship.user,
                    status: 'accepted'
                });
            } else {
                await friendship.remove();
            }

            ctx.body = {
                code: 200,
                message: action === 'accept' ? '已接受好友请求' : '已拒绝好友请求'
            };
        } catch (error) {
            console.error('处理好友请求失败:', error);
            ctx.body = {
                code: 500,
                message: '处理好友请求失败'
            };
        }
    }

    // 检查好友关系
    async checkFriendStatus(ctx){
        const userId = ctx.session._id
        const { friendId } = ctx.query;
        const relationship = await Friendship.checkFriendship(userId, friendId);

        if (relationship.exists) {
            if (relationship.isAccepted) {
                ctx.body = new SuccessModel({
                    isFriend: true,
                    status: relationship.status,
                    message: '你们已经是好友了'
                });
            } else if (relationship.isPending) {
                ctx.body = new SuccessModel({
                    isFriend: false,
                    status: relationship.status,
                    message: '好友请求待处理'
                });
            } else if (relationship.isBlocked) {
                ctx.body = new SuccessModel({
                    isFriend: false,
                    status: relationship.status,
                    message: '对方已拒绝你的好友请求'
                });
            }
        } else {
            ctx.body = new SuccessModel({
                isFriend: false
            });
        }
    }
}

module.exports = new ChatController();