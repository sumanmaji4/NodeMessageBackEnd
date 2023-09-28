const { validationResult, Result } = require('express-validator')
const fs = require('fs')
const path = require('path')

const io = require('../socket')
const Post = require('../models/post')
const User = require('../models/user')

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1
  const perPage = 2

  try {
    const totalItems = await Post.find().countDocuments()

    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)

    res.status(200).json({
      message: 'Fetched posts successfully',
      posts: posts,
      totalItems: totalItems,
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    // ekhane "throw err" korle next middleware e pouchabe na
    next(err)
  }

  // res.status(200).json({
  //   posts: [
  //     {
  //       _id: '1',
  //       title: 'First Post',
  //       content: 'This is the first post!',
  //       imageUrl: 'images/sms.jpg',
  //       creator: {
  //         name: 'Sam',
  //       },
  //       createdAt: new Date(),
  //     },
  //   ],
  // })
}

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect')
    error.statusCode = 422
    throw error
  }
  if (!req.file) {
    const error = new Error('No image provided')
    error.statusCode = 422
    throw error
  }

  const imageUrl = req.file.path.replace(/\\/g, '/')
  // const imageUrl = req.file.path
  const title = req.body.title // to do this, we need bodyParser
  const content = req.body.content

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  })

  try {
    await post.save()
    const user = await User.findById(req.userId)
    user.posts.push(post)
    await user.save()

    io.getIO().emit('posts', {
      action: 'create',
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    })

    res.status(201).json({
      message: 'Post created successfully!',
      post: post,
      creator: { _id: user._id, name: user.name },
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }
}

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId

  try {
    const post = await Post.findById(postId)

    if (!post) {
      const error = new Error('Could not find post.')
      error.statusCode = 404
      throw error
      // ekhane throw korle catch e jabe
    }

    res.status(200).json({ message: 'Post fetched.', post: post })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    // ekhane "throw err" korle next middleware e pouchabe na
    next(err)
  }
}

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId // comes from url
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect')
    error.statusCode = 422
    throw error
  }

  // console.log('req.body-------\n', req.body, '\n\n')

  const title = req.body.title // rest are comes from frontend
  const content = req.body.content
  let imageUrl = null

  if (req.file) {
    imageUrl = req.file.path.replace(/\\/g, '/')
  }
  // if (!imageUrl) {
  //   const error = new Error('No file picked')
  //   error.statusCode = 422 // error object can have status code
  //   throw error
  // }

  try {
    const post = await Post.findById(postId).populate('creator')

    // console.log(post.creator.toString(), '-----#-----', req.userId)
    // console.log('post---------\n', post, '\n\n')
    if (!post) {
      const error = new Error('Could not find post.')
      error.statusCode = 404
      throw error
      // ekhane throw korle catch e jabe
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Sorry :( You are Not Authorized!.')
      error.statusCode = 403
      throw error
    }
    if (imageUrl && imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl)
    } else {
      imageUrl = post.imageUrl
    }

    post.title = title
    post.content = content
    post.imageUrl = imageUrl
    const result = await post.save()
    io.getIO().emit('posts', { action: 'update', post: result })

    res.status(200).json({ message: 'Post updated.', post: result })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    // ekhane "throw err" korle next middleware e pouchabe na
    next(err)
  }
}

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId

  try {
    const post = await Post.findById(postId)

    if (!post) {
      const error = new Error('Could not find post.')
      error.statusCode = 404
      throw error
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Sorry :( You are Not Authorized!.')
      error.statusCode = 403
      throw error
    }
    // check login user and creator
    clearImage(post.imageUrl)
    const result = await Post.findByIdAndRemove(postId)

    // console.log(result)
    const user = await User.findById(req.userId)

    user.posts.pull(postId)
    await user.save()
    io.getIO().emit('posts', { action: 'delete', post: postId })

    res.status(200).json({ message: 'Deleted post' })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    // ekhane "throw err" korle next middleware e pouchabe na
    next(err)
  }
}

const clearImage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath)
  fs.unlink(filePath, (err) => console.log(err))
  // unlink will delete the file
}
