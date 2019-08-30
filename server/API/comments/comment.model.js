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
    user: [{type : mongoose.Schema.ObjectId, ref : 'UserModel'}],
    ratings: [{type: Number, required: false}],
    raters: [{type: mongoose.Schema.ObjectId, ref: 'UserModel'}],
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
});

CommentSchema.methods.serialize = function () {

    let rating_score;

    if(this.ratings.length === 0){
        rating_score = 3;
    } else {
        rating_score = Math.round(this.ratings.reduce((a, b) => a + b) / this.ratings.length); 
    }


    const reply_score = this.replies.length;


    const rating_quantity_score = this.ratings.length;
    const swarm_score = () => {
        let result;

        if(rating_score === 5) {
            result = (reply_score + rating_quantity_score) * 1.075;
        }
        else if(rating_score === 4) {
            result = (reply_score + rating_quantity_score) * 1.05;
        }
        else if(rating_score === 3) {
            result = (reply_score + rating_quantity_score) * 1.00;
        }
        else if(rating_score === 2) {
            result = (reply_score + rating_quantity_score) * .95;
        }
        else if(rating_score === 1) {
            result = (reply_score + rating_quantity_score) * .80;
        }
        return result;
    }

    return {
        _id: this._id,
        body: this.body,
        author: this.author,
        user: this.user,
        replies: this.replies,
        ratings: this.ratings,
        raters: this.raters,
        score: swarm_score()
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