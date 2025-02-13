const Sequelize = require('sequelize');
const { MYSQL_CON } = require('../config/db')

const conf = {
    host: MYSQL_CON.host,
    dialect: 'mysql',
    timezone: '+08:00',
    dialectOptions: {
        dateString: true,
        typeCast: true
    }
}

if (process.env.NODE_ENV === 'production') {
    // 生产环境下使用连接池，提高性能
    conf.pool = {
        max: 5, // 连接池中最大连接数
        min: 0, // 连接池中最小连接数
        idle: 10000 //连接池10秒钟没使用就释放。连接池中连接的空闲时间（单位毫秒），超过这个时间，连接将被释放
    }
}


// 创建实例
const sequelizeApp = new Sequelize(
    MYSQL_CON.database,
    MYSQL_CON.user,
    MYSQL_CON.password,
    conf
);

sequelizeApp.authenticate().then(res=>{
    console.log('数据库连接成功')
})

module.exports = sequelizeApp;
