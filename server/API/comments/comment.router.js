const express = require('express');

const tryCatch = require('../../helpers').expressTryCatchWrapper;
const getFields = require('../../helpers').getFieldsFromRequest;

const { UserModel } = require('../users/user.model');
const { HiveModel } = require('../hives/hive.model');
const { PostModel } = require('../posts/post.model');
const { CommentModel } = require('./comment.model');

const router = express.Router();

// POST - Create a comment within a post \\
async function createComment(req, res){
    const targetPost = await PostModel.findOne({_id: req.body.post});
    const commentAuthor = await UserModel.findOne({_id: req.body.user});

    if(targetPost === null){
        return res.json({
            message: 'This post does not exist'
        });
    }

    else {
        let newComment = new CommentModel({
            post: req.body.post,
            user: req.body.user,
            body: req.body.body,
            author: commentAuthor.username
        });
        newComment.save();
        
        PostModel.findById(req.body.post, function(err, post){
            post.comments.push(newComment);
            post.save(function(err) {
                PostModel.findById(req.body.post)
                .populate('comments')
                .exec(function(err, post) {
                    res.json({
                        userFeedback: post.serialize()
                    })
                })
            })
        })
    }
}

router.post('/create', tryCatch(createComment));

module.exports = router;