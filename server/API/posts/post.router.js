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
            tags: req.body.tags,
            hive: req.body.hive
        });

        UserModel.findById(req.body.user, function(err, user){
            user.posts.push(newPost);
            user.save();
        });

        HiveModel.findById(req.body.hive, function(err, hive){
            hive.posts.push(newPost);
            hive.save();
        });

        newPost.save(function(err, post) {
            PostModel.findOne(post)
            .populate('hive', 'title')
            .populate('comments')
            .exec(function(err, post) {
                res.json({
                    post: post.serialize()
                })
            })
        });
    }
}

router.post('/create', tryCatch(createPost));

// GET - View a post \\
async function viewPost(req, res){
    const targetPost = PostModel.findOne({_id: req.params.id});
    if(targetPost === null){
        return res.json({
            message: 'That post does not exist'
        });
    }

    else {
        PostModel.findById(req.params.id)
        .populate('comments')
        .populate({path:'hive', select:'title'})
        .exec(function (err, post) {
            res.json({
                feedback: post.serialize()
            })
        })
    }
}

router.get('/view/:id', tryCatch(viewPost));

// GET - Search for post by Tags \\
async function findPost(req, res){
    const foundPost = PostModel.find( { tags: { $in: [ req.body.tags ]}} );
    const pageResults = 10;
    const page = req.params.page || 1;

    if(foundPost === null){
        return res.json({
            message: 'No posts found'
        });
    }

    else {
        const numOfPosts = await PostModel.count({tags: {$in: req.body.tags}});
        PostModel.find({tags: {$in: req.body.tags}})
        .populate({path:'hive', select:'title'})
        .skip((pageResults * page) - pageResults)
        .limit(pageResults)
        .exec(function(err, posts){
            res.json({
                posts: posts.map((post) => post.quickView()),
                currentPage: page,
                pages: Math.ceil(numOfPosts / pageResults),
                totalPosts: numOfPosts
            })
        })
    }
}

router.post('/find', tryCatch(findPost));

// GET - Posts + pagination \\
async function browsePosts(req, res){
    const pageResults = 10;
    const page = req.params.page || 1;

    if(page === null){
        return res.json({
            message: 'Page not found'
        });
    }

    else {
        const numOfPosts = await PostModel.count();
        PostModel.find()
        .populate({path:'hive', select:'title'})
        .skip((pageResults * page) - pageResults)
        .limit(pageResults)
        .exec(function(err, posts){
            res.json({
                posts: posts.map((post) => post.quickView()),
                currentPage: page,
                pages: Math.ceil(numOfPosts / pageResults),
                totalPosts: numOfPosts
            });
        })
    }
}

router.get('/browse/:page', tryCatch(browsePosts));

module.exports = router;