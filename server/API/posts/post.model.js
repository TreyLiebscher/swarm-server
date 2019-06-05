'use strict';

const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    author: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId, ref: 'UserModel'
    },
    hive: {
        type: mongoose.Schema.ObjectId, ref: 'HiveModel'
    },
    title: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: false
    },
    body: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false
    },
    tags: [{type: String, required: false}],
    comments: [{type: mongoose.Schema.ObjectId, ref: 'CommentModel'}]
});

PostSchema.methods.serialize = function () {
    return {
        id: this._id,
        hive: this.hive,
        author: this.author,
        title: this.title,
        link: this.link,
        body: this.body,
        image: this.image,
        comments: this.comments,
        tags: this.tags
    }
}

PostSchema.methods.quickView = function () {
    return {
        id: this._id,
        hive: this.hive,
        author: this.author,
        title: this.title,
        image: this.image,
        comments: this.comments.length,
        tags: this.tags
    }
}


const PostModel = mongoose.model('PostModel', PostSchema);

module.exports = {
    PostModel
};