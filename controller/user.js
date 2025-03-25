const { genPassword } = require('../utils/cryp')
const XLSX = require('xlsx')

const User = require('../db/model/user')


const login = async (username, password) => {
    try {
        // mongoose查询
        const user = await User.findOne({
            username: username,
            password: genPassword(password)
        })
        if (!user) return null
        return user
    } catch (error) {
        console.error('Database query error:', error)
        throw new Error('Database query failed')
    }
}

const userInfo = async (id) => {
    const user = await User.findById(id)
    if (!user) return null
    return user
}

const registeUser = async (username, password,realname,avatarPath) => {
    const user = await User.findOne({
        username: username
    })
    if (user) return null
    return await User.create({
        username: username,
        password: genPassword(password),
        realname: realname,
        avatarPath: avatarPath
    })
}

const getUserList = async (username, realname, page = 1, pageSize = 10) => {
    const whereOption = {}
    if(username){
        whereOption.username = { $regex: username }
    }
    if(realname){
        whereOption.realname = { $regex: realname }
    }
    
    // 计算总数
    const total = await User.countDocuments(whereOption)
    
    // 查询分页数据
    const list = await User.find(whereOption)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
    
    return {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
    }
}

const updateUser = async (id, realname, avatarPath) => {
    return await User.findByIdAndUpdate(
        id, 
        { $set: { realname, avatarPath } },
        { new: true }
    )
}

const exportUserList = async (username, realname) => {
    const whereOption = {}
    if(username){
        whereOption.username = { $regex: username }
    }
    if(realname){
        whereOption.realname = { $regex: realname }
    }
    
    // 查询所有匹配的用户数据
    const list = await User.find(whereOption)
    
    // 准备Excel数据
    const excelData = list.map(user => ({
        用户名: user.username,
        真实姓名: user.realname,
        头像路径: user.avatarPath,
        创建时间: new Date(user.createdAt).toLocaleString()
    }));
    
    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表');
    
    // 生成Excel文件的二进制数据
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
}

module.exports = {
    login,  
    registeUser,
    getUserList,
    updateUser,
    exportUserList,
    userInfo
}