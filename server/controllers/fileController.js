const path = require('path')
const mongoose = require('mongoose')
const fileService = require('../services/fileService')
const File = require('../models/File')
const User = require('../models/User')
const fs = require('fs/promises')
const config = require('config')
const {randomUUID} = require('crypto')
const validName = name => typeof name === 'string' && name.trim() === name && name.length > 0 && name.length <= 100 && !/[\\/<>:"|?*\x00-\x1f]/.test(name) && !['.', '..'].includes(name) && !/[. ]$/.test(name)
const sortBy = value => ({name:{name:1,_id:1},type:{type:1,name:1},date:{date:-1,_id:1}}[value] || {name:1,_id:1})
const publicUser = user => ({id:user.id,email:user.email,diskSpace:user.diskSpace,usedSpace:user.usedSpace,avatar:user.avatar || null})
const avatarRoot = () => path.resolve(__dirname, '..', config.get('staticPath'))


class FileController {
    async createDir(req, res) {
        try {
            const {name, type, parent} = req.body
            if (typeof name !== 'string' || !name.trim() || name.length > 100 || /[\\/<>:"|?*\x00-\x1f]/.test(name) || ['.', '..'].includes(name.trim()) || /[. ]$/.test(name)) {
                return res.status(400).json({message: 'Введите корректное имя папки (до 100 символов)'})
            }
            if (type !== 'dir' || (parent && !mongoose.isValidObjectId(parent))) {
                return res.status(400).json({message: 'Некорректные параметры папки'})
            }
            let parentFile = null
            if (parent) {
                parentFile = await File.findOne({_id: parent, user: req.user.id, type: 'dir'})
                if (!parentFile) return res.status(404).json({message: 'Родительская папка не найдена'})
            }
            const file = new File({name: name.trim(), type: 'dir', parent: parent || null, user: req.user.id})
            file.path = parentFile ? path.join(parentFile.path, file.name) : file.name
            await fileService.createDir(file)
            await file.save()
            if (parentFile) {
                parentFile.childs.push(file._id)
                await parentFile.save()
            }
            return res.json(file)
        } catch (e) {
            return res.status(400).json({message: e.code === 'EEXIST' ? 'Папка уже существует' : 'Не удалось создать папку'})
        }
    }
    async getFiles(req, res) {
        try {
            const parent = req.query.parent || null
            if (parent && !mongoose.isValidObjectId(parent)) return res.status(400).json({message: 'Некорректная папка'})
            return res.json(await File.find({user: req.user.id, parent}).sort(sortBy(req.query.sort)))
        } catch (e) {
            return res.status(500).json({message: 'Не удалось получить список папок'})
        }
    }
    async uploadFile(req, res) {
        const upload = req.files?.file
        const parentId = req.body.parent || null
        if (!upload || Array.isArray(upload) || upload.truncated || !validName(upload.name) || (parentId && !mongoose.isValidObjectId(parentId))) return res.status(400).json({message:'Выберите файл с корректным именем (до 100 символов)'})
        let reserved = false, written = false, file
        try {
            const parent = parentId ? await File.findOne({_id:parentId,user:req.user.id,type:'dir'}) : null
            if (parentId && !parent) return res.status(404).json({message:'Папка не найдена'})
            if (await File.exists({user:req.user.id,parent:parentId,name:upload.name})) return res.status(409).json({message:'Файл уже существует'})
            const user = await User.findOneAndUpdate({_id:req.user.id,$expr:{$lte:[{$add:['$usedSpace',upload.size]},'$diskSpace']}},{$inc:{usedSpace:upload.size}},{new:true})
            if (!user) return res.status(400).json({message:'Недостаточно места на диске'})
            reserved = true
            const extension = path.extname(upload.name).slice(1).toLowerCase()
            file = new File({name:upload.name,type:extension && extension !== 'dir' ? extension : 'file',size:upload.size,user:req.user.id,parent:parentId,path:parent ? path.join(parent.path,upload.name) : upload.name})
            await fileService.createDir({user:req.user.id,path:''})
            await fileService.writeFile(file,upload.data); written = true
            await file.save()
            if (parent) await File.updateOne({_id:parent._id},{$addToSet:{childs:file._id}})
            return res.json(file)
        } catch (e) {
            if (written) await fileService.deleteFile(file).catch(()=>{})
            if (reserved) await User.updateOne({_id:req.user.id},{$inc:{usedSpace:-upload.size}})
            return res.status(e.code === 'EEXIST' ? 409 : 500).json({message:e.code === 'EEXIST' ? 'Файл уже существует' : 'Не удалось загрузить файл'})
        }
    }
    async downloadFile(req, res) {
        if (!mongoose.isValidObjectId(req.query.id)) return res.status(400).json({message:'Некорректный файл'})
        try {
            const file = await File.findOne({_id:req.query.id,user:req.user.id})
            if (!file || file.type === 'dir') return res.status(404).json({message:'Файл не найден'})
            await fs.access(fileService.getPath(file))
            return res.download(fileService.getPath(file),file.name)
        } catch (e) {return res.status(404).json({message:'Файл не найден'})}
    }
    async deleteFile(req, res) {
        if (!mongoose.isValidObjectId(req.query.id)) return res.status(400).json({message:'Некорректный файл'})
        try {
            const file = await File.findOne({_id:req.query.id,user:req.user.id})
            if (!file) return res.status(404).json({message:'Файл не найден'})
            if (file.type === 'dir' && await File.exists({parent:file._id,user:req.user.id})) return res.status(400).json({message:'Сначала удалите содержимое папки'})
            await fileService.deleteFile(file)
            await File.deleteOne({_id:file._id})
            if (file.parent) await File.updateOne({_id:file.parent,user:req.user.id},{$pull:{childs:file._id}})
            if (file.size) await User.updateOne({_id:req.user.id},{$inc:{usedSpace:-file.size}})
            return res.json({message:'Удалено'})
        } catch (e) {return res.status(400).json({message:'Не удалось удалить файл или папка не пуста'})}
    }
    async searchFile(req, res) {
        try {
            const search = String(req.query.search || '').slice(0,100)
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
            return res.json(await File.find({user:req.user.id,name:{$regex:escaped,$options:'i'}}).sort(sortBy(req.query.sort)))
        } catch (e) {return res.status(400).json({message:'Не удалось выполнить поиск'})}
    }
    async uploadAvatar(req, res) {
        const upload = req.files?.file
        if (!upload || Array.isArray(upload) || upload.truncated || upload.size > 5*1024*1024) return res.status(400).json({message:'Выберите изображение PNG, JPEG или WebP до 5 МБ'})
        const data = upload.data
        const extension = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'jpg' : data.toString('ascii',0,4) === 'RIFF' && data.toString('ascii',8,12) === 'WEBP' ? 'webp' : null
        if (!extension) return res.status(400).json({message:'Поддерживаются PNG, JPEG и WebP'})
        let name
        try {
            const user = await User.findById(req.user.id)
            if (!user) return res.status(404).json({message:'Пользователь не найден'})
            name = randomUUID()+'.'+extension
            await fs.mkdir(avatarRoot(),{recursive:true})
            await fs.writeFile(path.join(avatarRoot(),name),data,{flag:'wx'})
            const previous = user.avatar
            user.avatar = name; await user.save()
            if (previous && path.basename(previous) === previous) await fs.unlink(path.join(avatarRoot(),previous)).catch(()=>{})
            return res.json(publicUser(user))
        } catch (e) {
            if (name) await fs.unlink(path.join(avatarRoot(),name)).catch(()=>{})
            return res.status(400).json({message:'Не удалось загрузить аватар'})
        }
    }
    async deleteAvatar(req, res) {
        try {
            const user = await User.findById(req.user.id)
            if (!user) return res.status(404).json({message:'Пользователь не найден'})
            const previous = user.avatar
            user.avatar = null; await user.save()
            if (previous && path.basename(previous) === previous) await fs.unlink(path.join(avatarRoot(),previous)).catch(()=>{})
            return res.json(publicUser(user))
        } catch (e) {return res.status(400).json({message:'Не удалось удалить аватар'})}
    }

}
module.exports = new FileController()
