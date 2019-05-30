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

// POST - Create a comment reply \\
async function commentReply(req, res){
    const targetComment = await CommentModel.findOne({_id: req.body.comment});
    const commentAuthor = await UserModel.findOne({_id: req.body.user});

    if(targetComment === null){
        return res.json({
            message: 'This comment does not exist'
        });
    }

    else {
        let newReply = new CommentModel({
            post: req.body.post,
            user: req.body.user,
            body: req.body.body,
            author: commentAuthor.username
        })
        newReply.save();

        CommentModel.findById(req.body.comment, function(err, comment){
            comment.replies.push(newReply);
            comment.save(function(err) {
                CommentModel.findById(req.body.comment)
                .populate('replies')
                .exec(function(err, comment){
                    res.json({
                        feedback: comment.serialize()
                    })
                })
            })
        })
    }
}

router.post('/reply', tryCatch(commentReply));

// GET - View a comment + replies \\
async function viewComment(req, res){
    const targetComment = CommentModel.findOne({_id: req.body.comment});

    if(targetComment === null){
        return res.json({
            message: 'That comment does not exist'
        });
    }

    else {
        CommentModel.findById(req.body.comment)
        .populate('replies')
        .exec(function (err, comment) {
            res.json({
                feedback: comment.serialize()
            })
        })
    }
}

router.get('/view', tryCatch(viewComment));

module.exports = router;