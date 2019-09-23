'use strict';

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.ObjectId, ref: 'PostModel'
    },
    postTitle: {
        type: String,
        required: false
    },
    comment: {
        type: mongoose.Schema.ObjectId, ref: 'CommentModel'
    },
    user: {
        type: mongoose.Schema.ObjectId, ref: 'UserModel'
    },
    responder: {
        type: mongoose.Schema.ObjectId, ref: 'UserModel'
    },
    hive: {
        type: mongoose.Schema.ObjectId, ref: 'HiveModel'
    },
    message: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: true
    }
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
}
);


const NotificationModel = mongoose.model('NotificationModel', NotificationSchema);

module.exports = {
    NotificationModel
};