const express = require('express');
const passport = require('passport');

const tryCatch = require('../../helpers').expressTryCatchWrapper;
const getFields = require('../../helpers').getFieldsFromRequest;

const { UserModel } = require('../users/user.model');
const { HiveModel } = require('../hives/hive.model');
const { PostModel } = require('../posts/post.model');

const router = express.Router();

// POST - Create a post within a Hive \\
async function createPost(req, res){
    const targetHive = await HiveModel.findOne({_id: req.body.hive});
    const postAuthor = await UserModel.findOne({_id: req.body.user});

    const memberValidation = targetHive.members.map((member) => {
        if(member._id == req.body.user){
            return true;
        } else {
            return false;
        }
    });

    if(targetHive === null){
        return res.json({
            message: 'The hive in which you are trying to post does not exist'
        })
    }

    else if (memberValidation === false){
        return res.json({
            message: 'You must become a member of this Hive before you are allowed to post'
        });
    }

    else {
        let newPost = new PostModel({
            author: postAuthor.username,
            title: req.body.title,
            link: req.body.link,
            body: req.body.body,
            image: req.body.image,
            tags: req.body.tags
        });
        newPost.save();
        UserModel.findById(req.body.user, function(err, user){
            user.posts.push(newPost);
            user.save();
        });
        HiveModel.findById(req.body.hive, function(err, hive){
            hive.posts.push(newPost);
            hive.save(function(err) {
                HiveModel.findById(req.body.hive)
                .populate('posts')
                .exec(function(err, hive) {
                    res.json({
                        userFeedback: hive.serialize()
                    })
                })
            })
        })
    }
}

router.post('/create', tryCatch(createPost));

// GET - View a post \\
async function viewPost(req, res){
    const targetPost = PostModel.findOne({_id: req.body.post});

    if(targetPost === null){
        return res.json({
            message: 'That post does not exist'
        });
    }

    else {
        PostModel.findById(req.body.post)
        .populate('comments')
        .exec(function (err, post) {
            res.json({
                feedback: post.serialize()
            })
        })
    }
}

router.get('/view', tryCatch(viewPost));

// GET - Search for post by Tags \\
async function findPost(req, res){
    const foundPost = PostModel.find( { tags: { $in: [ req.body.tags ]}} );

    if(foundPost === null){
        return res.json({
            message: 'No posts found'
        });
    }

    else {
        PostModel.find({tags: {$in: req.body.tags}})
        .limit(15)
        .exec(function(err, posts){
            res.json({
                feedback: posts.map((post) => post.quickView())
            })
        })
    }
}

router.get('/find', tryCatch(findPost));

module.exports = router;