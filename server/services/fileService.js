const fs = require('fs/promises')
const path = require('path')
const config = require('config')

class FileService {
    getPath(file) {
        const user = String(file.user)
        if (!/^[\w-]+$/.test(user)) throw new Error('Invalid user directory')
        const userRoot = path.resolve(__dirname, '..', config.get('filePath'), user)
        const target = path.resolve(userRoot, file.path || '')
        if (target !== userRoot && !target.startsWith(userRoot + path.sep)) throw new Error('Invalid file path')
        return target
    }
    async createDir(file) {
        await fs.mkdir(this.getPath({user: file.user, path: ''}), {recursive: true})
        if (file.path) await fs.mkdir(this.getPath(file))
    }
    async writeFile(file, data) {
        await fs.writeFile(this.getPath(file), data, {flag: 'wx'})
    }
    async deleteFile(file) {
        if (file.type === 'dir') await fs.rmdir(this.getPath(file))
        else await fs.unlink(this.getPath(file))
    }
}
module.exports = new FileService()
