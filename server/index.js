const express = require("express")
const mongoose = require("mongoose")
const config = require("config")
const authRouter = require("./routes/auth.routes")
const fileRouter = require("./routes/file.routes")
const app = express()
const PORT = process.env.PORT || config.get('serverPort')
const path = require('path')
const fileUpload = require('express-fileupload')
const corsMiddleware = require('./middleware/cors.middleware')


app.use(corsMiddleware)
app.use(express.json())
app.use(fileUpload({limits:{fileSize:100*1024*1024},abortOnLimit:true,responseOnLimit:'Файл больше 100 МБ',defParamCharset:'utf8'}))
app.use('/static', express.static(path.resolve(__dirname, config.get('staticPath')), {setHeaders:res=>res.setHeader('X-Content-Type-Options','nosniff')}))
app.use("/api/auth", authRouter)
app.use("/api/files", fileRouter)


if (process.env.NODE_ENV === 'production') {
    const clientRoot = path.resolve(__dirname, '../client/dist')
    app.use(express.static(clientRoot))
    app.get('*', (req,res) => req.path.startsWith('/api/') || req.path.startsWith('/static/') ? res.status(404).json({message:'Не найдено'}) : res.sendFile(path.join(clientRoot,'index.html')))
}
const start = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || config.get("dbUrl"), {
            useNewUrlParser:true,
            useUnifiedTopology:true
        })

        app.listen(PORT, () => {
            console.log('Server started on port ', PORT)
        })
    } catch (e) {
        console.error(e.message)
        process.exit(1)
    }
}

start()
