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
    post: {
        type: String,
        required: true
    },
    replies:[{type: mongoose.Schema.ObjectId, ref : 'CommentModel'}],
    user: [{type : mongoose.Schema.ObjectId, ref : 'UserModel'}],
    ratings: [{type: Number, required: false}],
    raters: [{type: mongoose.Schema.ObjectId, ref: 'UserModel'}],
    score: {
        type: Number
    }
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
});

CommentSchema.pre('save', function(next){


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
            result = ((reply_score * 1.075) + (rating_quantity_score * 0.25)) * 1.075;
        }
        else if(rating_score === 4) {
            result = ((reply_score * 1.05) + (rating_quantity_score * 0.25)) * 1.05;
        }
        else if(rating_score === 3) {
            result = ((reply_score * 1) + (rating_quantity_score * 0.25)) * 1.00;
        }
        else if(rating_score === 2) {
            result = ((reply_score * .95) + (rating_quantity_score * 0.25)) * .95;
        }
        else if(rating_score === 1) {
            result = ((reply_score * .80) + (rating_quantity_score * 0.25)) * .80;
        }
        return result;
    }

    this.score = swarm_score();

  next();   
});

CommentSchema.methods.serialize = function () {

    return {
        _id: this._id,
        post: this.post,
        body: this.body,
        author: this.author,
        user: this.user,
        replies: this.replies,
        ratings: this.ratings,
        raters: this.raters,
        score: this.score
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