const express = require('express');

const CommentModel = require('./comment.model');

const tryCatch = require('../../helpers').expressTryCatchWrapper;
const getFields = require('../../helpers').getFieldsFromRequest;

const passport = require('passport');

const {
    localStrategy,
    jwtStrategy
} = require('../../../auth/strategies');

passport.use(localStrategy);
passport.use(jwtStrategy);

const jwtAuth = passport.authenticate('jwt', {
    session: false
});

const router = express.Router();

const COMMENT_MODEL_FIELDS = ['body'];

