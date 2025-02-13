const sequelizeApp = require('./sequelize')

require('./model/blog')
require('./model/user')

sequelizeApp.authenticate().then(res=>{
    console.log('数据库连接成功')
})

sequelizeApp.sync({force:true}).then(res=>{
    console.log('数据库同步成功')
    process.exit()
})


