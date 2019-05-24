'use strict';

const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.ObjectId, ref: 'UserModel'
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
    comments: [{type: mongoose.Schema.ObjectId, ref: 'PostModel'}]
});

PostSchema.methods.serialize = function () {
    return {
        id: this._id,
        author: this.author,
        title: this.title,
        link: this.link,
        body: this.body,
        image: this.image,
        comments: this.comments
    }
}

const PostModel = mongoose.model('PostModel', PostSchema);

module.exports = {
    PostModel
};