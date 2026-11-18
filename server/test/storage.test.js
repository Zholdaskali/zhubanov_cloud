const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs/promises')
const path=require('node:path')
const service=require('../services/fileService')
test('storage refuses paths outside the user root',()=>{
 assert.equal(typeof service.getPath,'function')
 assert.throws(()=>service.getPath({user:'test-user',path:'../escape'}))
 assert.throws(()=>service.getPath({user:'../escape',path:'file.txt'}))
})
test('storage writes, reads and deletes uploaded bytes without overwriting duplicates',async()=>{
 const user='test-storage-'+process.pid
 const file={user,path:'note.txt'}
 assert.equal(typeof service.writeFile,'function')
 try {
  await service.createDir({user,path:''})
  await service.writeFile(file,Buffer.from('course'))
  assert.equal(await fs.readFile(service.getPath(file),'utf8'),'course')
  await assert.rejects(service.writeFile(file,Buffer.from('changed')),{code:'EEXIST'})
  await service.deleteFile({...file,type:'txt'})
  await assert.rejects(fs.stat(service.getPath(file)),{code:'ENOENT'})
 } finally {await fs.rm(path.dirname(service.getPath(file)),{recursive:true,force:true})}
})
