const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');

const tryCatch = require('../../helpers').expressTryCatchWrapper;
const getFields = require('../../helpers').getFieldsFromRequest;

const { localStrategy, jwtStrategy } = require('../../../auth/strategies');

const { UserModel } = require('../users/user.model');
const { HiveModel } = require('./hive.model');
const { PostModel } = require('../posts/post.model');

passport.use(localStrategy);
passport.use(jwtStrategy);

const router = express.Router();

const localAuth = passport.authenticate('local', {
    session: false,
    failWithError: false
});

const jwtAuth = passport.authenticate('jwt', {
    session: false
});

const HIVE_MODEL_FIELDS = ['title', 'mission'];

async function buildHive(req, res){
    const existingHive = await HiveModel.findOne({title: req.body.title});
    
    if (existingHive === null) {
        // let hive = new HiveModel(req.body);
        let hive = new HiveModel({
            title: req.body.title,
            mission: req.body.mission,
            founder: req.body.user
        });

        UserModel.findById(req.body.user, function(err, user) {
            user.hives.push(hive);
            user.save()
        });

        hive.members.push(req.body.user);
        hive.monitors.push(req.body.user);
        hive.save(function(err, hive) {
            res.json({
                hive: hive.serialize()
            })
        })

    }
    
    else {
        return res.json({
            message: 'A Hive with this name already exists, please choose another name'
        })
    }
}

router.post('/build', tryCatch(buildHive));

// POST - Join Hive \\
async function joinHive(req, res){
    const existingHive = await HiveModel.findOne({_id: req.body.hive});

    if(existingHive === null){
        return res.json({
            message: 'This hive does not exist'
        });
    }
    else if (existingHive.members.includes(req.body.user)){
        return res.json({
            message: 'You are already a member of this hive'
        });
    }
    else {
        UserModel.findById(req.body.user, function(err, user) {
            user.hives.push(existingHive);
            user.save();
        });

        existingHive.members.push(req.body.user);
        existingHive.save(function(err, hive) {
            res.json({
                hive: hive.serialize()
            })
        });
    }
}

router.post('/join', tryCatch(joinHive));

// POST - Leave Hive \\
async function leaveHive(req, res){
    const existingHive = await HiveModel.findOne({_id: req.body.hive});

    if(existingHive === null){
        return res.json({
            message: 'This hive does not exist'
        });
    }
    else if (!(existingHive.members.includes(req.body.user))){
        return res.json({
            message: 'You are not a member of this hive'
        });
    }
    else {
        UserModel.findByIdAndUpdate(req.body.user,
            {$pull: { hives: `${req.body.hive}`}},
            {safe: true, upsert: true},
            function(err, user) {
                user.save();
            }
        );

        HiveModel.findByIdAndUpdate(req.body.hive,
            {$pull: { members: `${req.body.user}`}},
            {safe: true, upsert: true},
            function(err, hive) {
                if(err){
                console.log(err);
                res.json({
                    success:false
                    }).end();
                }else{
                    console.log(hive.members)
                    hive.save();
                    HiveModel.findById(req.body.hive, function(err, hive) {
                        res.json({
                            hive: hive.serialize()
                        })
                    })
                }
            }
        );
    }
}

router.post('/leave', tryCatch(leaveHive));

async function getHiveInfo(req, res){
    const returnHive = await HiveModel.findOne({title: req.body.title});
    const user = req.body.user;
    const foundMember = returnHive.members.map((member) => {
        if(member == user){
            return true;
        } else {
            return false;
        }
    });
    res.json({
        hive: returnHive.serialize(),
        auth: foundMember,
        memberAuth: user
    });
}

router.get('/search', tryCatch(getHiveInfo));

// GET - Hives + pagination \\
async function browseHives(req, res){
    const pageResults = 10;
    const page = req.params.page || 1;

    if(page === null){
        return res.json({
            message: 'Page not found'
        });
    }

    else {
        const numOfHives = await HiveModel.count();
        HiveModel.find()
        .skip((pageResults * page) - pageResults)
        .limit(pageResults)
        .populate('posts')
        .populate('members')
        .exec(function(err, hives){
            res.json({
                hives: hives.map((hive) => hive.quickView()),
                currentPage: page,
                pages: Math.ceil(numOfHives / pageResults),
                totalHives: numOfHives
            });
        })
    }
}

router.get('/browse/:page', tryCatch(browseHives));

// GET - View Single Hive \\
async function viewHive(req, res){
    const targetHive = HiveModel.findOne({title: req.params.title});
    if(targetHive === null){
        return res.json({
            message: 'That hive does not exist'
        });
    }

    else {
        HiveModel.findOne({title: req.params.title})
        .populate({
            path: 'posts',
            options: { sort: {score: -1} }
          })
        .populate('founder', 'username')
        .exec(function (err, hive) {
            res.json({
                feedback: hive
            })
        })
    }
}

router.get('/view/:title', tryCatch(viewHive));

// PUT - Update Hive \\
async function updateHive(req, res){
    const existingHive = await HiveModel.findById({_id: req.body.hive});
    if(existingHive === null){
        return res.status(404).json({
            message: 'The hive you`re trying to update doesn`t exist'
        });
    }
    else if (!(existingHive.monitors.includes(req.body.user))){
        return res.status(404).json({
            message: 'You are not authorized to perform this action'
        });
    }
    else {
        const newValues = getFields(HIVE_MODEL_FIELDS, req);

        const updatedHive = await HiveModel.findByIdAndUpdate({
            '_id': req.body.hive
        }, {
            $set: newValues
        }, {
            new: true
        });
    
        res.json({
            hive: updatedHive.serialize(),
            message: 'Hive updated successfully'
        })
    }
}

router.put('/update', tryCatch(updateHive));

// DELETE - Delete Hive \\
async function deleteHive(req, res){
    const record = await HiveModel.findByIdAndRemove(req.params.id);

    if(record === null){
        return res.status(404).json({
            message: 'NOT FOUND'
        });
    }

    const postsRecord = await PostModel.find({
        hive: req.params.id
    })
    .remove()

    res.json({
        message: `"${record.title}" has been deleted`
    });
}

router.delete('/delete/:id', tryCatch(deleteHive));

module.exports = router;