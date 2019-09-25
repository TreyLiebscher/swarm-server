'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: {
        unique: true,
        type: String,
        // TODO email not required, only for password recovery
        required: true
    },
    username: {
        unique: true,
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    notifications: [{type : mongoose.Schema.ObjectId, ref : 'NotificationModel'}],
    comments: [{type : mongoose.Schema.ObjectId, ref : 'CommentModel'}],
    posts: [{type : mongoose.Schema.ObjectId, ref : 'PostModel'}],
    hives: [{type : mongoose.Schema.ObjectId, ref : 'HiveModel'}],
    ratedPosts: [{type : mongoose.Schema.ObjectId, ref : 'PostModel'}],
    ratedComments: [{type : mongoose.Schema.ObjectId, ref : 'CommentModel'}],
    conversations: [{type : mongoose.Schema.ObjectId, ref : 'ConversationModel'}]
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
});

UserSchema.methods.serialize = function () {
    return {
        id: this._id,
        email: this.email,
        username: this.username,
        comments: this.comments,
        posts: this.posts,
        hives: this.hives,
        ratedPosts: this.ratedPosts,
        ratedComments: this.ratedComments,
        notifications: this.notifications,
        conversations: this.conversations
    }
}

UserSchema.methods.validatePassword = function (password) {
    return bcrypt.compare(password, this.password);
}

UserSchema.statics.hashPassword = function (password) {
    return bcrypt.hash(password, 10);
}

const UserModel = mongoose.model('UserModel', UserSchema);


const email = 'test@test.com';
const username = 'Tester';
const password = 'password123';

const testUtilCreateUser = async () => {
    await UserModel.remove({});
    return UserModel.hashPassword(password).then(hashedPassword => {
        return UserModel.create({
            email,
            username,
            password: hashedPassword
        });
    });
}

module.exports = {
    UserModel,
    testUtilCreateUser
};