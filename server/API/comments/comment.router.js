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
            console.log('kiwi', post.comments.length)
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
    console.log(targetComment)
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

router.post('/view', tryCatch(viewComment));

// PUT - Rate a Comment \\
async function rateComment(req, res) {
    const existingRecord = await CommentModel.findById(req.body.comment)
    const rater = await UserModel.findById(req.body.user);
    let found;
    console.log('kiwi exist rec', existingRecord)


    if(existingRecord.raters.length === 0){
        found === false;
    } else {
        await existingRecord.raters.map((id) => {
            if(id == rater.id){
                found = true;
            } else {
                found = false;
            }
        });
    }
 
    if (existingRecord === null) {
        return res.status(404).json({
            message: 'NOT_FOUND'
        })
    }
    if (found === true){
        return res.json({
            message: 'You have already rated this comment'
        });
    }

    const updatedUser = await UserModel.findByIdAndUpdate({
        '_id': req.body.user
    }, {
            $push: {ratedComments: req.body.comment}
        }, {
            new: true
    });

    const updatedRecord = await CommentModel.findByIdAndUpdate({
        '_id': req.body.comment
    }, {
            $push: {ratings: req.body.rating, raters: req.body.user}
        }, {
            new: true
        })

    PostModel.findById(req.body.post)
    .populate([
        {
            path: 'comments',
            populate: {
                path: 'replies'
            }
        }
    ])
    .exec(function(err, post) {
        res.json({
            post: post.serialize()
        })
    })

    // res.json({
    //     comment: updatedRecord.serialize(),
    //     message: 'Comment rated successfully'
    // })
}

router.put('/rate', tryCatch(rateComment));

module.exports = router;