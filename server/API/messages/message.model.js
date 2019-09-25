'use strict';

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId, ref: 'UserModel'
    },
    body: {
        type: String,
        required: true
    },
    conversation: {
        type: mongoose.Schema.ObjectId, ref: 'ConversationModel'
    }
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
}
);


const MessageModel = mongoose.model('MessageModel', MessageSchema);

module.exports = {
    MessageModel
};