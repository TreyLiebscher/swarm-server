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
        hive.members.push(req.body.user);
        hive.save(function(err, hive) {
            UserModel.findById(req.body.user, function(err, user) {
                user.hives.push(hive);
                user.save(function(err) {
                    UserModel.findById(req.body.user)
                    .populate('hives')
                    .exec(function (err, hives) {
                        res.json({
                            userMemberships: hives.serialize()
                        })
                    })
                })
            })
        })
    } else {
        return res.json({
            message: 'Sorry, but a Hive with this name already exists'
        })
    }
}

router.post('/build', tryCatch(buildHive));

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

module.exports = router;