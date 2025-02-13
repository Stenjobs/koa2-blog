const env = process.env.NODE_ENV


let MYSQL_CON
const REDIS_CONF = {
    port:'6379',
    host:'127.0.0.1'
}


if (env === 'development') {
    MYSQL_CON = {
        host: "localhost",
        user: "root",
        password: "wrnmmp666666",
        port: "3306",
        database: "myblog_sequelize"
    }

}

if (env === 'production') {
    MYSQL_CON = {
        host: "localhost",
        user: "root",
        password: "wrnmmp666666",
        port: "3306",
        database: "myblog_sequelize"
    }
}

module.exports = {
    MYSQL_CON,
    REDIS_CONF
}