'use strict';

const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    users: [{
        type: mongoose.Schema.ObjectId, ref: 'UserModel'
    }],
    messages: [{
        type: mongoose.Schema.ObjectId, ref: 'MessageModel'
    }]
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
}
);


const ConversationModel = mongoose.model('ConversationModel', ConversationSchema);

module.exports = {
    ConversationModel
};