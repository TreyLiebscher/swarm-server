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
const { NotificationModel } = require('../notifications/notification.model');
const { ConversationModel } = require('../messages/conversation.model');
const { MessageModel } = require('../messages/message.model');

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
        .populate(
            {
                path: 'conversations',
                populate: {
                    path: 'messages users'
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

// GET - Public Profile \\ 
async function getPublicUserProfile(req, res) {
    const record = await UserModel.findOne({username: req.params.username})
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

router.get('/:username', tryCatch(getPublicUserProfile));
//------------------------------------------------------------------------------\\

// POST - Clear Notification \\
async function clearNotification(req, res) {

    const removeItem = (arr, item) => {
        const index = arr.indexOf(item);

        if (index !== -1) {
            arr.splice(index, 1);
        } else {
            return;
        }
    }

    UserModel.findById(req.body.user.id, function(err, user) {
        removeItem(user.notifications, req.body.notification._id);
        user.save(function(err) {
            UserModel.findById(req.body.user.id)
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
            .exec(function (err, user) {
                res.json({
                    profile: user.serialize()
                })
            })
        })
    })
}

router.post('/clear-notification', jwtAuth, tryCatch(clearNotification));


//------------------------------------------------------------------------------\\

// POST - Send a message \\
async function sendMessage(req, res) {
    // No conversation exists to send the message to
    const test = await ConversationModel.find({users: [req.body.sender, req.body.receiver]})
    console.log('kiwi', test);
    
    if(!(req.body.conversation)){
        console.log('NEW CONVO')
        let newConversation = new ConversationModel({
            users: req.body.users
        });

        let newMessage = new MessageModel({
            user: req.body.sender,
            body: req.body.body,
            conversation: newConversation  
        })
        newMessage.save();

        newConversation.messages.push(newMessage);
        newConversation.save();
        
        UserModel.findById(req.body.receiver, function(err, user){
            user.conversations.push(newConversation);
            user.save();
        });

        const updatedUser = await UserModel.findByIdAndUpdate({
            '_id': req.body.sender
        }, {
                $push: {conversations: newConversation}
            }, {
                new: true
            })
            .populate('hives')
            .populate('conversations')
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

        updatedUser.save();


        // UserModel.findById(req.body.sender, function(err, user){
        //     user.conversations.push(newConversation);
        //     user.save(function(err, user){
        //         UserModel.findOne(user)
        //         .populate('hives')
        //         .populate('conversations')
        //         .populate('posts')
        //         .populate('comments')
        //         .populate(
        //             {
        //                 path: 'notifications',
        //                 populate: {
        //                     path: 'comment'
        //                 }
        //             }
        //         )
        //         .exec(function (err, user) {
        //             res.json({
        //                 profile: user.serialize()
        //             })
        //         })
        //     });
        // })

        res.json({
            profile: updatedUser.serialize()
        })


    } 
    else {
        console.log('EXISTING CONVO')
        const targetConversation = await ConversationModel.findById(req.body.conversation);
        let newMessage = new MessageModel({
            user: req.body.sender,
            body: req.body.body,
            conversation: targetConversation.id  
        })
        newMessage.save();

        targetConversation.messages.push(newMessage);
        targetConversation.save();

        UserModel.findById(req.body.sender)
        .populate('hives')
        .populate('conversations')
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
        .exec(function (err, user) {
            res.json({
                profile: user.serialize()
            })
        })

    }


}

router.post('/send', tryCatch(sendMessage));



//------------------------------------------------------------------------------\\



module.exports = router;