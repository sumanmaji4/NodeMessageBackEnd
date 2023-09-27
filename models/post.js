const mongoose = require('mongoose')
const Schema = mongoose.Schema

const postSchema = new Schema(
  {
    title: {
      type: String,
      require: true,
    },
    imageUrl: {
      type: String,
      require: true,
    },
    content: {
      type: String,
      require: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Post', postSchema)
//'mongodb+srv://sumanmaji401:sms0762@cluster0.wvcjfb6.mongodb.net/RESTapi'
// mongodb te 'Post' database create hobe

//RESTapi->Post->data thakbe
