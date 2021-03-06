const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const tryCatch = require('../../helpers').expressTryCatchWrapper;
const getFields = require('../../helpers').getFieldsFromRequest;

const { localStrategy, jwtStrategy } = require('../../../auth/strategies');


const { UserModel } = require('../users/user.model');
const { HiveModel } = require('../hives/hive.model');
const { PostModel } = require('../posts/post.model');
const { CommentModel } = require('./comment.model');
const { NotificationModel } = require('../notifications/notification.model');

passport.use(localStrategy);
passport.use(jwtStrategy);

const router = express.Router();

const jwtAuth = passport.authenticate('jwt', {
    session: false
});

// POST - Create a comment within a post \\
async function createComment(req, res){
    const targetPost = await PostModel.findOne({_id: req.body.post.id});
    const commentAuthor = await UserModel.findOne({_id: req.body.user});
    const totalComments = targetPost.comments.length;
    const pageResults = 5;
    const page = req.body.page || 1;

    if(targetPost === null){
        return res.json({
            message: 'This post does not exist'
        });
    }

    else {
        let newComment = new CommentModel({
            post: req.body.post.id,
            user: req.body.user,
            body: req.body.body,
            author: commentAuthor.username
        });
        newComment.save();

        let newNotification = new NotificationModel({
            post: req.body.post.id,
            postTitle: req.body.post.title,
            comment: newComment,
            responder: req.body.user,
            message: `${commentAuthor.username} commented on`,
            type: 'NewComment'
        });
        newNotification.save();

        UserModel.findOne({_id: req.body.user}, function(err, user){
            user.comments.push(newComment);
            user.save();
        })

        UserModel.findOne({username: targetPost.author}, function(err, user){
            user.notifications.push(newNotification);
            user.save();
        });

        const updatedRecord = await PostModel.findByIdAndUpdate({
            '_id': req.body.post.id
        },
        {
            $push: {comments: newComment}
        },
        {
            new: true
        }).populate([
            {
                path: 'comments',
                options: {
                    sort: {score: -1},
                    skip: (pageResults * page) - pageResults,
                    limit: pageResults
                },
                populate: {
                    path: 'replies'
                }
            }
        ]);

        res.json({
            userFeedback: updatedRecord.serialize(),
            currentPage: Math.ceil(totalComments / pageResults),
            totalComments: totalComments,
            pages: Math.ceil(totalComments / pageResults)
        })
    }
}

router.post('/create', tryCatch(createComment));

// POST - Create a comment reply \\
async function commentReply(req, res){
    let homePost;
    if(!(req.body.homePost.id)){
        homePost = req.body.homePost._id;
    } else {
        homePost = req.body.homePost.id;
    }
    const targetComment = await CommentModel.findOne({_id: req.body.comment});
    const commentAuthor = await UserModel.findOne({_id: req.user.id});
    const targetPost = await PostModel.findOne({_id: homePost});
    if(targetComment === null){
        return res.json({
            message: 'This comment does not exist'
        });
    }

    else {
        let newReply = new CommentModel({
            post: req.body.comment,
            user: req.user.id,
            body: req.body.body,
            author: commentAuthor.username
        })
        newReply.save();

        let newNotification = new NotificationModel({
            post: homePost,
            postTitle: req.body.homePost.title,
            comment: newReply,
            responder: req.user.id,
            message: `${commentAuthor.username} replied to your comment on`,
            type: 'NewReply'
        });
        newNotification.save();

        UserModel.findOne({_id: targetComment.user[0]}, function(err, user){
            user.notifications.push(newNotification);
            user.save();
        });

        CommentModel.findById(req.body.comment, function(err, comment){
            comment.replies.push(newReply);
            comment.save(function(err) {
                CommentModel.findById(req.body.comment)
                .populate('post')
                .populate('replies')
                .exec(function (err, comment) {
                    res.json({
                        feedback: comment
                    })
                })
            })
        })
    }
}

router.post('/reply', jwtAuth, tryCatch(commentReply));

// GET - View a comment + replies \\
async function viewComment(req, res){
    const targetComment = CommentModel.findOne({_id: req.params.id});
    if(targetComment === null){
        return res.json({
            message: 'That comment does not exist'
        });
    }

    else {
        CommentModel.findById(req.params.id)
        .populate('post')
        .populate('replies')
        .exec(function (err, comment) {
            res.json({
                feedback: comment
            })
        })
    }
}

router.get('/view/:id', tryCatch(viewComment));

// PUT - Rate a Comment \\
async function rateComment(req, res) {
    const existingRecord = await CommentModel.findById(req.body.comment)
    const rater = await UserModel.findById(req.body.user);
    let found;

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
    updatedRecord.save()

    PostModel.findById(req.body.post)
    .populate([
        {
            path: 'comments',
            options: {
                sort: {score: -1}
            },
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
}

router.put('/rate', tryCatch(rateComment));

module.exports = router;