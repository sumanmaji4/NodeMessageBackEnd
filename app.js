const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')
const { error } = require('console')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const dotenv = require('dotenv')
const compression = require('compression')

const feedRoutes = require('./routes/feed')
const authRoutes = require('./routes/auth')
const { Socket } = require('socket.io')

const app = express()

app.use(compression())
dotenv.config()
console.log('Backend is running...')
// console.log(process.env.MONGO_URI)

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images')
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + '-' + file.originalname)
  },

  // imageUrl = req.file.path.replace("\\","/");  createPosts & updatePost
})

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

const upload = multer({ storage: fileStorage, fileFilter: fileFilter })

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()) //appliction/json
app.use(upload.single('image'), (req, res, next) => {
  // console.log(req.body)
  // console.log(req.file)

  next()
})
app.use('/images', express.static(path.join(__dirname, 'images')))

app.use((req, res, next) => {
  // to prevent CORS error
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  next()
})

app.use('/feed', feedRoutes)
app.use('/auth', authRoutes)

//error handling middleware
app.use((error, req, res, next) => {
  console.log(error)
  const status = error.statusCode || 500
  const message = error.message
  const data = error.data
  res.status(status).json({ message: message, data: data })
})

mongoose
  .connect(process.env.MONGO_URI)
  .then((result) => {
    const server = app.listen(process.env.PORT)
    const io = require('./socket').init(server)
    io.on('connection', (socket) => {
      console.log('Client connected')
    })
  })
  .catch((err) => console.log(err))
