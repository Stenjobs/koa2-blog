const Blog = require('../db/model/blog')
const mongoose = require('mongoose')
const xss = require('xss')
const getList = async (author = '', keyword = '', page = 1, pageSize = 10) => {
    const whereOption = {}
    // mongoose查询
    if (author) {
        whereOption.author = author
    }
    if (keyword) {
        whereOption.title = { $regex: keyword } // 使用$regex进行正则匹配,与mongodb的$regex一致
        // 或者使用new RegExp(keyword, 'i')也可以，i表示不区分大小写
    }

    // 计算总数
    const total = await Blog.countDocuments(whereOption)
    
    // 查询分页数据
    const list = await Blog.find(whereOption)
        .sort({ _id: -1 }) // 按id倒序排序,正序则是{ _id: 1 }
        .skip((page - 1) * pageSize)
        .limit(pageSize)
    return {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
    }
}

const getDetail = async (id) => {
    try {
        // 检查id是否为有效的ObjectId格式
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null
        }
        const blog = await Blog.findById(id)
        return blog
    } catch (err) {
        console.error('获取博客详情失败:', err)
        return null
    }
}

const newBlog = async (blogdata = {}) => {
    const result = await Blog.create({
        title: xss(blogdata.title),
        content: xss(blogdata.content),
        author: blogdata.author
    })

    return result
}

const updataBlog = async (blogdata = {}) => {
    const result = await Blog.findByIdAndUpdate(blogdata._id, {
        title: xss(blogdata.title),
        content: blogdata.content
    })
    return result
}

const delBlog = async (id, author) => {
    const result = await Blog.findByIdAndDelete(id)
    return result
}

const likeBlog = async (id, userId,status = true) => {
    try {
        // 检查id是否为有效的ObjectId格式
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null
        }
        const blog = await Blog.findById(id)
        if (!blog) {
            return null
        }
        if(status){
            // 检查用户是否已经点赞过
            if (blog.likedUsers.includes(userId)) {
                return { message: '您已经点赞过这篇文章' }
            }
            blog.likes += 1 // 增加点赞数
            blog.likedUsers.push(userId) // 添加用户ID到已点赞列表
        } else {
            blog.likes -= 1 // 减少点赞数
            blog.likedUsers = blog.likedUsers.filter(id => id !== userId) // 移除用户ID
        }
        await blog.save()
        return blog
    } catch (err) {
        console.error('点赞失败:', err)
        return null
    }
}

const addComment = async (id, commentData) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null
        }
        const blog = await Blog.findById(id)
        if (!blog) {
            return null
        }
        blog.comments.push(commentData) // 添加评论到评论列表
        await blog.save()
        return blog.comments
    } catch (err) {
        console.error('添加评论失败:', err)
        return null
    }
}

const replyComment = async (blogId, commentId, replyData, replyToId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(blogId) || !mongoose.Types.ObjectId.isValid(commentId)) {
            return null;
        }
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return null;
        }
        const comment = blog.comments.id(commentId);
        if (!comment) {
            return null;
        }
        const replyItem = comment.replies.id(replyToId);
        console.log(replyItem,'replyItem-------------------');
        if (replyItem) {
            replyData.replyTo = replyItem.realname;
        }
        comment.replies.push(replyData);
        await blog.save();
        return comment.replies;
    } catch (err) {
        console.error('回复评论失败:', err);
        return null;
    }
};

module.exports = {
    getList,
    getDetail,
    newBlog,
    updataBlog,
    delBlog,
    likeBlog,
    addComment,
    replyComment
}