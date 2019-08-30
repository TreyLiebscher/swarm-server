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
    ratings: [{type: Number, required: false}],
    raters: [{type: mongoose.Schema.ObjectId, ref: 'UserModel'}],
    tags: [{type: String, required: false}],
    comments: [{type: mongoose.Schema.ObjectId, ref: 'CommentModel'}]
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
}
);

PostSchema.methods.serialize = function () {


    const formatted_comments = this.comments.map((comment) => comment.serialize()) 
    const sorted_comments = formatted_comments.sort((a, b) => (a.score < b.score) ? 1 : -1);
    return {
        id: this._id,
        hive: this.hive,
        author: this.author,
        title: this.title,
        link: this.link,
        body: this.body,
        image: this.image,
        comments: sorted_comments,
        tags: this.tags,
        ratings: this.ratings,
        raters: this.raters,
        createdAt: this.createdAt
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
        tags: this.tags,
        ratings: this.ratings,
        createdAt: this.createdAt
    }
}


const PostModel = mongoose.model('PostModel', PostSchema);

module.exports = {
    PostModel
};