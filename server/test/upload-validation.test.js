const {test}=require('node:test')
const assert=require('node:assert/strict')
const controller=require('../controllers/fileController')
const res=()=>({code:200,status(code){this.code=code;return this},json(data){this.data=data;return this}})
test('missing upload and malformed file identifiers return 400 before database access',async()=>{
 assert.equal(typeof controller.uploadFile,'function')
 for(const [method,req] of [['uploadFile',{body:{},user:{id:'x'}}],['downloadFile',{query:{id:'bad'},user:{id:'x'}}],['deleteFile',{query:{id:'bad'},user:{id:'x'}}],['uploadAvatar',{body:{},user:{id:'x'}}]]) {
  const response=res(); await controller[method](req,response); assert.equal(response.code,400)
 }
})
