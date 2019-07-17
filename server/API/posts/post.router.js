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
    const targetHive = await HiveModel.findOne({_id: req.params.id});
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
            hive: req.params.id
        });

        UserModel.findById(req.body.user, function(err, user){
            user.posts.push(newPost);
            user.save();
        });

        HiveModel.findById(req.params.id, function(err, hive){
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

router.post('/create/:id', tryCatch(createPost));

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

// PUT - Rate Post \\
async function ratePost(req, res) {
    const existingRecord = await PostModel.findById(req.body.post)
    const rater = await UserModel.findById(req.body.user);
    let found;
    const findRater = await existingRecord.raters.map((id) => {
        if(id == rater.id){
            found = true;
        } else {
            found = false;
        }
    });
    if (existingRecord === null) {
        return res.status(404).json({
            message: 'NOT_FOUND'
        })
    }
    if (found === true){
        return res.json({
            message: 'You have already rated this post'
        });
    }

    const updatedUser = await UserModel.findByIdAndUpdate({
        '_id': req.body.user
    }, {
            $push: {ratedPosts: req.body.post}
        }, {
            new: true
    });

    const updatedRecord = await PostModel.findByIdAndUpdate({
        '_id': req.body.post
    }, {
            $push: {ratings: req.body.rating, raters: req.body.user}
        }, {
            new: true
        })
    res.json({
        post: updatedRecord.serialize(),
        message: 'Post rated successfully'
    })
}

router.put('/rate', tryCatch(ratePost));

// POST - View a post \\
async function viewPostLimitComments(req, res){
    
    const targetPost = await PostModel.findOne({_id: req.params.id});
    const totalComments = targetPost.comments.length;
    const pageResults = 5;
    const page = req.body.page || 1;

    
    if(targetPost === null){
        return res.json({
            message: 'That post does not exist'
        });
    }
    // Only populate within the limit. Adtnl reqs will skip what has already been gotten
    // and push them into the state on the front end
    else {
        PostModel.findById(req.params.id)
        .populate([
            {
                path: 'comments',
                options: {
                    skip: (pageResults * page) - pageResults,
                    limit: pageResults
                },
                populate: {
                    path: 'replies'
                }
            }
        ])
        .populate({path:'hive', select:'title'})
        .exec(function (err, post) {
            res.json({
                feedback: post.serialize(),
                currentPage: page,
                totalComments: totalComments,
                pages: Math.ceil(totalComments / pageResults)
            })
        })
    }
}

router.post('/test/:id', tryCatch(viewPostLimitComments));

module.exports = router;