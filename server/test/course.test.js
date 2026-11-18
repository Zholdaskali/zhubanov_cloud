const {test, before, after} = require('node:test')
const assert = require('node:assert/strict')
const {spawn} = require('node:child_process')
const fs = require('node:fs/promises')
const path = require('node:path')
const mongoose = require('mongoose')
const enabled = process.env.COURSE_INTEGRATION === '1'
const base = 'http://127.0.0.1:5019/api'
let child, token, secondToken, dir, nested, uploaded
const root = path.resolve('/tmp', `yt-course-test-${process.pid}`)
async function request(url, {method = 'GET', body, auth = token} = {}) {
    const headers = auth ? {Authorization: `Bearer ${auth}`} : {}
    if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body) }
    const res = await fetch(base + url, {method, headers, body})
    const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text()
    return {status: res.status, data}
}
function upload(name, data = 'hello course', parent) {
    const body = new FormData(); body.append('file', new Blob([data]), name)
    if (parent) body.append('parent', parent)
    return body
}
before(async () => {
    if (!enabled) return
    child = spawn(process.execPath, ['index.js'], {cwd: path.resolve(__dirname, '..'), env: {...process.env, NODE_CONFIG: JSON.stringify({serverPort:5019,dbUrl:'mongodb://127.0.0.1:27019/yt_course_test',filePath:root,staticPath:root + '-avatars'})}, stdio:'pipe'})
    let ready = false
    for (let i=0;i<100;i++) {
        try {await fetch(base + '/auth/auth'); ready=true; break} catch {await new Promise(r=>setTimeout(r,100))}
    }
    assert.ok(ready, 'test server started')
    for (const email of ['first@example.test', 'second@example.test']) {
        await request('/auth/registration', {method:'POST', body:{email,password:'123456'}})
        const login = await request('/auth/login', {method:'POST', body:{email,password:'123456'}})
        assert.equal(login.status,200)
        if (!token) token=login.data.token; else secondToken=login.data.token
    }
})
after(async () => {
    if (!enabled) return
    child?.kill(); if (child) await new Promise(r=>child.once('exit',r))
    await mongoose.connect('mongodb://127.0.0.1:27019/yt_course_test', {useNewUrlParser:true,useUnifiedTopology:true})
    await mongoose.connection.dropDatabase(); await mongoose.disconnect()
    await fs.rm(root,{recursive:true,force:true}); await fs.rm(root+'-avatars',{recursive:true,force:true})
})
test('course: nested folders, upload, download, ownership, search, sorting, delete and avatar', {skip:!enabled}, async () => {
    dir = (await request('/files', {method:'POST',body:{name:'Учёба',type:'dir'}})).data
    nested = (await request('/files',{method:'POST',body:{name:'Лекции',type:'dir',parent:dir._id}})).data
    const result = await request('/files/upload',{method:'POST',body:upload('Конспект.txt','hello course',nested._id)})
    assert.equal(result.status,200, 'upload a file into a nested folder')
    uploaded=result.data; assert.equal(uploaded.size,12)
    assert.equal((await request('/files?parent='+nested._id)).data[0]._id,uploaded._id)
    assert.deepEqual(await request('/files/download?id='+uploaded._id), {status:200,data:'hello course'})
    assert.equal((await request('/files/download?id='+uploaded._id,{auth:secondToken})).status,404)
    assert.equal((await request('/files?id='+uploaded._id,{method:'DELETE',auth:secondToken})).status,404)
    assert.equal((await request('/files/upload',{method:'POST',auth:secondToken,body:upload('other.txt','x',nested._id)})).status,404)
    assert.equal((await request('/files/search?search='+encodeURIComponent('КОНСПЕКТ'))).data[0]._id,uploaded._id)
    assert.equal((await request('/files/search?search=%5B')).status,200,'literal regex punctuation is safe')
    assert.equal((await request('/files/upload',{method:'POST',body:upload('Конспект.txt','x',nested._id)})).status,409)
    await request('/files/upload',{method:'POST',body:upload('z.txt','z')})
    await request('/files/upload',{method:'POST',body:upload('a.txt','a')})
    const names=(await request('/files?sort=name')).data.map(f=>f.name)
    assert.ok(names.indexOf('a.txt')<names.indexOf('z.txt'))
    assert.equal((await request('/files?id='+dir._id,{method:'DELETE'})).status,400,'nonempty folder is retained')
    let user=(await request('/auth/auth')).data.user
    assert.equal(user.usedSpace,14)
    assert.equal((await request('/files?id='+uploaded._id,{method:'DELETE'})).status,200)
    assert.equal((await request('/files/download?id='+uploaded._id)).status,404)
    assert.equal((await request('/files?id='+nested._id,{method:'DELETE'})).status,200)
    assert.equal((await request('/files?id='+dir._id,{method:'DELETE'})).status,200)
    user=(await request('/auth/auth')).data.user; assert.equal(user.usedSpace,2)
    const avatar=new FormData(); avatar.append('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'avatar.png')
    const profile=await request('/files/avatar',{method:'POST',body:avatar})
    assert.equal(profile.status,200); assert.ok(profile.data.avatar); assert.equal(profile.data.password,undefined)
    assert.equal((await fetch(base.replace('/api','')+'/static/'+profile.data.avatar)).status,200)
    const removed=await request('/files/avatar',{method:'DELETE'}); assert.equal(removed.status,200); assert.equal(removed.data.avatar,null)
    assert.equal((await fetch(base.replace('/api','')+'/static/'+profile.data.avatar)).status,404)
    assert.equal((await request('/files/upload',{method:'POST',body:new FormData()})).status,400)
    assert.equal((await request('/files/download?id=bad')).status,400)
})
