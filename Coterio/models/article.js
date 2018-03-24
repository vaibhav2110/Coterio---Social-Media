const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var User = require('./user');

const commentSchema = new Schema({
    comment: {
        type: String,
        required: true
    },
    author:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {timestamps: true}
);
const articleSchema = new Schema({
    body: {
        type: String,
        required: true
    },
    img: {
        type: String,
        default: ''
    },
    favoritesCount: {
        type: Number,
        default: 0
    },
    
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comments:[commentSchema]
},
    { timestamps: true }
);

module.exports = mongoose.model('Article', articleSchema);