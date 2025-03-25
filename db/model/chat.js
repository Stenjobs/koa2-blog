const mongoose = require('mongoose');

// 聊天消息模型
const chatMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 好友关系模型
const friendshipSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    friend: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'blocked'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 创建复合索引
friendshipSchema.index({ user: 1, friend: 1 }, { unique: true });

// 添加静态方法检查好友关系
friendshipSchema.statics.checkFriendship = async function(userId, friendId) {
  const friendship = await this.findOne({
    $or: [
      { user: userId, friend: friendId },
      { user: friendId, friend: userId }
    ]
  });
  
  if (!friendship) {
    return { exists: false, status: null };
  }
  
  return { 
    exists: true, 
    status: friendship.status,
    isAccepted: friendship.status === 'accepted',
    isPending: friendship.status === 'pending',
    isBlocked: friendship.status === 'blocked',
    data: friendship
  };
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const Friendship = mongoose.model('Friendship', friendshipSchema);

module.exports = {
    ChatMessage,
    Friendship
};