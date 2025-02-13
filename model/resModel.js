class BaseModel {
    constructor(data,msg,code){
        console.log(data,msg,code)
        if(typeof data == 'string'){
            this.msg = data
            data = null
            msg = null
        }
        if(data){
            this.data = data
        }
        if(msg){
            this.msg = msg
        }
        if(code){
            this.code = code
        }
    }
}

class SuccessModel extends BaseModel{
    constructor(data,msg){
        super(data,msg)
        this.code = 200
    }
}
class ErrorModel extends BaseModel{
    constructor(data,msg,code){
        super(data,msg,code)
        this.code = code || -1
    }
}

module.exports = {
    SuccessModel,
    ErrorModel
}