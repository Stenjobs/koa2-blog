const Blog = require('../db/model/blog')
const mongoose = require('mongoose')
const xss = require('xss')
const User = require('../db/model/user')
const Visit = require('../db/model/visit')

const getList = async (author = '', keyword = '', page = 1, pageSize = 10, mode = 'new') => {
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
    let list
    if (mode === 'hot') {
        // 按热度排序 (点赞 + 收藏 + 浏览量)
        list = await Blog.aggregate([
            { $match: whereOption },
            { $addFields: { hotScore: { $add: ["$likes", "$stars", "$views"] } } },
            { $sort: { hotScore: -1 } },
            { $skip: (page - 1) * pageSize },
            { $limit: Number(pageSize) }
        ])
    } else {
        // 默认按创建时间排序
        list = await Blog.find(whereOption)
            .sort({ _id: -1 }) // 按id倒序排序,正序则是{ _id: 1 }
            .skip((page - 1) * pageSize)
            .limit(pageSize)
    }
    
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
        blog.views += 1
        await blog.save()
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

const addStar = async (id, userId, status = true) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null
        }
        const blog = await Blog.findById(id)
        if (!blog) {
            return null
        }
        if (status) {
            blog.stars += 1
            blog.starUsers.push(userId)
        } else {
            blog.stars -= 1
            blog.starUsers = blog.starUsers.filter(id => id !== userId)
        }
        await blog.save()
        return blog
    } catch (err) {
        console.error('添加收藏失败:', err)
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

const getAnalytics = async () => {
    try {
        // 获取今天的开始时间
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // 获取30天前的时间
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        // 获取总访问量
        const totalVisits = await Visit.countDocuments()
        
        // 获取今日新增用户
        const newUsers = await User.countDocuments({
            createdAt: { $gte: today }
        })
        
        // 获取今日新发帖量
        const newPosts = await Blog.countDocuments({
            createdAt: { $gte: today }
        })
        
        // 获取近30天的活跃度数据
        const activityData = await Blog.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { 
                        $dateToString: { 
                            format: "%Y-%m-%d", 
                            date: "$createdAt" 
                        }
                    },
                    posts: { $sum: 1 },
                    likes: { $sum: "$likes" },
                    comments: { $sum: { $size: "$comments" } }
                }
            },
            {
                $sort: { _id: -1 } // 改为降序，获取最近的数据
            },
            {
                $limit: 7 // 限制只取7条数据
            }
        ])
        
        // 获取近30天新增用户数据
        const newUsersTrend = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: -1 }
            },
            {
                $limit: 7
            }
        ])

        // 处理数据，确保有7天的数据
        const dates = []
        const now = new Date()
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)
            dates.push(date.toISOString().split('T')[0])
        }

        // 格式化活跃度数据
        const activityMap = new Map()
        activityData.forEach(item => {
            activityMap.set(item._id, {
                posts: item.posts || 0,
                likes: item.likes || 0,
                comments: item.comments || 0
            })
        })

        const formattedActivityData = {
            xAxis: dates,
            series: {
                posts: [],
                likes: [],
                comments: []
            }
        }

        dates.forEach(date => {
            const data = activityMap.get(date)
            formattedActivityData.series.posts.push(data ? data.posts : 0)
            formattedActivityData.series.likes.push(data ? data.likes : 0)
            formattedActivityData.series.comments.push(data ? data.comments : 0)
        })

        // 格式化用户趋势数据
        const userMap = new Map(newUsersTrend.map(item => [item._id, item.count]))
        const formattedUserTrend = {
            xAxis: dates,
            series: dates.map(date => userMap.get(date) || 0)
        }

        return {
            overview: {
                totalVisits,
                todayNewUsers: newUsers,
                todayNewPosts: newPosts
            },
            activityTrend: formattedActivityData,
            userTrend: formattedUserTrend
        }
    } catch (err) {
        console.error('获取分析数据失败:', err)
        throw err  // 抛出错误而不是返回 null
    }
}

const getUserStats = async (userId) => {
    try {
        // 检查id是否为有效的ObjectId格式
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return null
        }
        
        // 获取用户信息
        const user = await User.findById(userId)
        if (!user) {
            return null
        }

        // 获取用户的所有博客
        const blogs = await Blog.find({ author: user.username })
        
        // 初始化统计数据
        let stats = {
            totalPosts: 0,      // 发帖总数
            totalLikes: 0,      // 被点赞总数
            totalStars: 0,      // 被收藏总数
            username: user.username  // 添加用户名信息
        }
        
        // 如果找到博客，进行统计
        if (blogs && blogs.length > 0) {
            stats.totalPosts = blogs.length
            stats.totalLikes = blogs.reduce((sum, blog) => sum + blog.likes, 0)
            stats.totalStars = blogs.reduce((sum, blog) => sum + blog.stars, 0)
        }
        
        return stats
    } catch (err) {
        console.error('获取用户统计数据失败:', err)
        return null
    }
}

module.exports = {
    getList,
    getDetail,
    newBlog,
    updataBlog,
    delBlog,
    likeBlog,
    addComment,
    replyComment,
    getAnalytics,
    addStar,
    getUserStats,
    getUserStats
}