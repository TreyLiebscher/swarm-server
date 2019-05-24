const UserModel = require('./users/user.model');
const usersRouter = require('./users/user.router');
const HiveModel = require('./hives/hive.model');
const hivesRouter = require('./hives/hive.router');
const PostModel = require('./posts/post.model');
const postsRouter = require('./posts/post.router');
const CommentModel = require('./comments/comment.model');
const commentsRouter = require('./comments/comment.router');

const apiConfig = {
    users: {
        router: usersRouter,
        models: {
            users: UserModel
        }
    },
    hives: {
        router: hivesRouter,
        models: {
            hives: HiveModel
        }
    },
    posts: {
        router: postsRouter,
        models: {
            posts: PostModel
        }
    },
    comments: {
        router: commentsRouter,
        models: {
            comments: CommentModel
        }
    }
}

function setupRoutes(app) {
    const prefixes = Object.keys(apiConfig);
    prefixes.forEach(prefix => {
        console.log(`SETUP /${prefix} ROUTE PREFIX`);
        const router = apiConfig[prefix].router;
        app.use(`/${prefix}`, router);

    });
}

function getConfig(prefix) {
    return apiConfig[prefix];
}

module.exports = {
    getConfig,
    setupRoutes
}