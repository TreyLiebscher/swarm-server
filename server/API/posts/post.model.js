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
    comments: [{type: mongoose.Schema.ObjectId, ref: 'CommentModel'}],
    score: {
        type: Number
    }
}, {
    timestamps: {
        createdAt: 'createdAt'
    }
}
);

PostSchema.pre('save', function(next){


    let rating_score;
    if(this.ratings.length === 0 && this.comments.length === 0){
        rating_score = 0;
    } else {
        rating_score = Math.round(this.ratings.reduce((a, b) => a + b) / this.ratings.length); 
    }

    const reply_score = this.comments.length;
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
        } else {
            result = 1;
        }
        return result;
    }

    this.score = swarm_score();

  next();   
});

PostSchema.methods.serialize = function () {

    return {
        id: this._id,
        hive: this.hive,
        author: this.author,
        title: this.title,
        link: this.link,
        body: this.body,
        image: this.image,
        comments: this.comments,
        tags: this.tags,
        ratings: this.ratings,
        raters: this.raters,
        createdAt: this.createdAt,
        score: this.score
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
        createdAt: this.createdAt,
        score: this.score
    }
}


const PostModel = mongoose.model('PostModel', PostSchema);

module.exports = {
    PostModel
};