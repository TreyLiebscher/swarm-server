const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');

const tryCatch = require('../../helpers').expressTryCatchWrapper;
const getFields = require('../../helpers').getFieldsFromRequest;

const { localStrategy, jwtStrategy } = require('../../../auth/strategies');

const { UserModel } = require('../users/user.model');
const { HiveModel } = require('./hive.model');

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

async function buildHive(req, res){
    const existingHive = await HiveModel.findOne({title: req.body.title});
    
    if (existingHive === null) {
        let hive = new HiveModel(req.body);

        UserModel.findById(req.body.user, function(err, user) {
            user.hives.push(hive);
            user.save()
        });

        hive.members.push(req.body.user);
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

    else {
        UserModel.findByIdAndUpdate(req.body.user,
            {$pull: { hives: `${req.body.hive}`}},
            {safe: true, upsert: true},
            function(err, user) {
                console.log('KIWI USER', user.hives)
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
    console.log('KIWI', targetHive)
    if(targetHive === null){
        return res.json({
            message: 'That hive does not exist'
        });
    }

    else {
        HiveModel.findOne({title: req.params.title})
        .populate('posts')
        .exec(function (err, hive) {
            res.json({
                feedback: hive
            })
        })
    }
}

router.get('/view/:title', tryCatch(viewHive));

module.exports = router;