const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const jsonParser = bodyParser.json();

const tryCatch = require('../../helpers').expressTryCatchWrapper;
const getFields = require('../../helpers').getFieldsFromRequest;

const config = require('../../../config');
const { localStrategy, jwtStrategy } = require('../../../auth/strategies');

const { UserModel } = require('./user.model');

passport.use(localStrategy);
passport.use(jwtStrategy);

const router = express.Router();

const createAuthToken = function (user) {
    return jwt.sign({
        user
    }, config.JWT_SECRET, {
        subject: user.username,
        expiresIn: config.JWT_EXPIRY,
        algorithm: 'HS256'
    });
}

const localAuth = passport.authenticate('local', {
    session: false,
    failWithError: false
});

const jwtAuth = passport.authenticate('jwt', {
    session: false
});

// POST - Create New User \\
async function createNewUser(req, res) {
    const requiredFields = ['email', 'username', 'password'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing \`${field}\` in request body`;
            console.error(message);
            return res.status(400).send(message)
        }
    }

    const stringFields = ['email', 'username', 'password'];
    const nonStringField = stringFields.find(
        field => field in req.body && typeof req.body[field] !== 'string'
    );

    if (nonStringField) {
        return res.status(422).json({
            code: 422,
            reason: 'Validation Error',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }

    const explicitlyTrimmedFields = ['email', 'username', 'password'];
    const nonTrimmedField = await explicitlyTrimmedFields.find(
        field => req.body[field].trim() !== req.body[field]
    );

    if (nonTrimmedField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Cannot start or end with whitespace',
            location: nonTrimmedField
        });
    }

    const sizedFields = {
        email: {
            min: 1
        },
        username: {
            min: 1
        },
        password: {
            min: 10,
            max: 72
        }
    };

    const tooSmallField = Object.keys(sizedFields).find(
        field =>
        'min' in sizedFields[field] &&
        req.body[field].trim().length < sizedFields[field].min
    );
    const tooLargeField = Object.keys(sizedFields).find(
        field =>
        'max' in sizedFields[field] &&
        req.body[field].trim().length > sizedFields[field].max
    );

    if (tooSmallField || tooLargeField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: tooSmallField ?
                `Must be at least ${sizedFields[tooSmallField]
              .min} characters long` :
                `Must be at most ${sizedFields[tooLargeField]
              .max} characters long`,
            location: tooSmallField || tooLargeField
        });
    }

    const searchUsers = await UserModel.find({email: req.body.email}).count();
    const searchUserNames = await UserModel.find({username: req.body.username}).count();

    if (searchUsers > 0) {
        return res.status(422).json({
            code: 422,
            reason: 'Validation Error',
            message: 'Email already taken',
            location: 'email'
        });
    } else if (searchUserNames > 0) {
        return res.status(422).json({
            code: 422,
            reason: 'Validation Error',
            message: 'Username already taken',
            location: 'username'
        });
    }
    
    const userPassword = await UserModel.hashPassword(req.body.password);

    const userRecord = await UserModel.create({
        email: req.body.email,
        username: req.body.username,
        password: userPassword
    });

    res.json({
        user: userRecord.serialize()
    });

}

router.post('/user/createUser', tryCatch(createNewUser));
//------------------------------------------------------------------------------\\

// POST - Log In \\
router.post('/login', localAuth, (req, res) => {
    console.log('Login attempt successful', req.user)

    const authToken = createAuthToken(req.user.serialize());
    const username = req.user.serialize().username;
    res.json({
        authToken,
        username
    });
});

router.post('/auth/refresh', jwtAuth, (req, res) => {
    const authToken = createAuthToken(req.user);
    const username = req.user.username;
    res.json({
        authToken,
        username
    });
});
//------------------------------------------------------------------------------\\

// POST - Change Password \\
async function changePassword(req, res) {
    const requiredFields = ['newPassword', 'retypeNewPassword'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing \`${field}\` in request body`;
            console.error(message);
            return res.status(404).send(message);
        }
    }

    const {
        newPassword
    } = req.body
    const hashedNewPassword = await UserModel.hashPassword(newPassword);

    const userRecordByUsername = await UserModel.findOne({
        username: req.user.username
    })
    
    const userRecord = await UserModel.findByIdAndUpdate(userRecordByUsername._id, {
        password: hashedNewPassword
    });

    res.json({
        user: userRecord.serialize(),
        message: 'Password Updated'
    })
}

router.post('/changepassword', jwtAuth, tryCatch(changePassword));
//------------------------------------------------------------------------------\\

// GET - User Profile \\ 
async function getUserProfile(req, res) {
    const record = await UserModel.findOne({username: req.user.username})
        .populate('hives')
        .populate('posts')
        .populate('comments')
        .populate(
            {
                path: 'notifications',
                populate: {
                    path: 'comment'
                }
            }
        )
        .exec((err, user) => {
            res.json({
                profile: user.serialize()
            })
        });
        
}

router.get('/profile/home', jwtAuth, tryCatch(getUserProfile));
//------------------------------------------------------------------------------\\

// POST - Clear Notification \\
async function clearNotification(req, res) {
    const record = await NotificationModel.findOne({id: req.notification});
    const user = await UserModel.findOne({username: req.user.username});
    if(record === null){
        res.json({
            message: 'There was an error'
        })
    }

    UserModel.findOne({username: req.user.username}, function(err, user){
        user.notifications({id: req.notification}).remove()
        user.save()
    })
        
}

router.post('/clear-notification', jwtAuth, tryCatch(clearNotification));


//------------------------------------------------------------------------------\\



module.exports = router;