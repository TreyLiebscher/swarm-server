'use strict';

const mongoose = require('mongoose');

const HiveSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    mission: {
        type: String,
        required: true
    },
    posts: [{type: mongoose.Schema.ObjectId, ref: 'PostModel'}],
    members: [{type : mongoose.Schema.ObjectId, ref : 'UserModel'}]
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
});

HiveSchema.methods.serialize = function () {
    return {
        id: this._id,
        title: this.title,
        members: this.members,
    }
}

const HiveModel = mongoose.model('HiveModel', HiveSchema);

module.exports = {
    HiveModel
};