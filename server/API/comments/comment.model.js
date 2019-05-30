'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CommentSchema = new mongoose.Schema({
    body: {
        type: String,
        // TODO email not required, only for password recovery
        required: true
    },
    author: {
        type: String,
        required: true
    },
    replies:[{type: mongoose.Schema.ObjectId, ref : 'CommentModel'}],
    user: [{type : mongoose.Schema.ObjectId, ref : 'UserModel'}]
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
});

CommentSchema.methods.serialize = function () {
    return {
        id: this._id,
        body: this.body,
        author: this.author,
        user: this.user,
        replies: this.replies
    }
}

const CommentModel = mongoose.model('CommentModel', CommentSchema);

// TODO Make a test util for comments
// const email = 'test@test.com';
// const username = 'Tester';
// const password = 'password123';

// const testUtilCreateUser = async () => {
//     await UserModel.remove({});
//     return UserModel.hashPassword(password).then(hashedPassword => {
//         return UserModel.create({
//             email,
//             username,
//             password: hashedPassword
//         });
//     });
// }

module.exports = {
    CommentModel
};