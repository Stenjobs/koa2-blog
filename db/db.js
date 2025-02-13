const mongoose = require('mongoose');

const host = 'localhost';
const port = 27017;
const dbname = 'myblog';


const uri = `mongodb://${host}:${port}/${dbname}`;

mongoose.connect(uri);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', () => {
//     console.log('Connected to MongoDB');
// });
// db.once的意思是当数据库连接成功时，执行一次回调函数

module.exports = mongoose;
