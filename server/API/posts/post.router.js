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
    
    if(targetHive === null){
        return res.json({
            message: 'The hive in which you are trying to post does not exist'
        });
    }
    
    else {
        targetHive.members.map((member) => {
            if(member._id == req.body.user){
                let newPost = new PostModel(req.body);
                newPost.save();
                targetHive.posts.push(newPost);
                targetHive.save(function(err, hive) {
                    UserModel.findById(req.body.user, function(err, user) {
                        user.posts.push(newPost);
                        user.save(function(err) {
                            UserModel.findById(req.body.user)
                            .populate('posts')
                            .populate('hives')
                            .exec(function (err, posts) {
                                res.json({
                                    userFeedback: posts.serialize()
                                })
                            })
                        })
                    })
                })
            } else {
                return res.json({
                    message: 'You must become a member of this Hive before you are allowed to post'
                })
            }
        })
    }
}

router.post('/create', tryCatch(createPost));

module.exports = router;