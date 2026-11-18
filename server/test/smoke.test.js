const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const jwt = require('jsonwebtoken')
const config = require('config')
const auth = require('../middleware/auth.middleware')
const controller = require('../controllers/fileController')
const service = require('../services/fileService')

function response() {
    return {code: 200, status(code) {this.code = code; return this}, json(body) {this.body = body; return this}}
}
test('JWT: отсутствующий токен отклоняется, подписанный принимается', () => {
    const bad = response()
    auth({headers: {}}, bad, () => assert.fail('unauthorized'))
    assert.equal(bad.code, 401)
    const req = {headers: {authorization: `Bearer ${jwt.sign({id: 'test-user'}, config.get('secretKey'))}`}}
    let called = false
    auth(req, response(), () => {called = true})
    assert.equal(called, true)
    assert.equal(req.user.id, 'test-user')
})
test('JWT: неверная подпись отклоняется', () => {
    const res = response()
    auth({headers: {authorization: `Bearer ${jwt.sign({id: 'x'}, 'wrong-secret')}`}}, res, () => assert.fail())
    assert.equal(res.code, 401)
})
test('Контроллер отклоняет выход за каталог и некорректного родителя до обращения в БД', async () => {
    for (const name of ['../escape', '', '..', 'a/b', 'a\\b']) {
        const res = response()
        await controller.createDir({body: {name, type: 'dir'}, user: {id: 'x'}}, res)
        assert.equal(res.code, 400)
    }
    const res = response()
    await controller.getFiles({query: {parent: 'invalid'}, user: {id: 'x'}}, res)
    assert.equal(res.code, 400)
})
test('FileService создаёт пользовательский каталог и папку, отклоняет дубликат', async () => {
    const user = `smoke-${process.pid}`
    const userPath = path.resolve(__dirname, '..', config.get('filePath'), user)
    try {
        await service.createDir({user, path: ''})
        await service.createDir({user, path: 'Учёба'})
        assert.equal((await fs.stat(path.join(userPath, 'Учёба'))).isDirectory(), true)
        await assert.rejects(service.createDir({user, path: 'Учёба'}), {code: 'EEXIST'})
    } finally {
        await fs.rm(userPath, {recursive: true, force: true})
    }
})
