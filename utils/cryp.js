const crypto = require('crypto');

// 密钥
const SECRET_KEY = 'cssyx@nc';

// md5加密
const md5 = (content) => {
    const md5 = crypto.createHash('md5');
    return md5.update(content).digest('hex');
};

// 加密函数
const genPassword = (password) => {
    const str = `password=${password}&key=${SECRET_KEY}`;
    return md5(str);
};


module.exports = {
    genPassword
}