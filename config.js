'use strict'; 
require('dotenv').config()


exports.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost/swarm';
exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost/swarmtest';
exports.PORT = process.env.PORT || 8080;

exports.JWT_SECRET = process.env.JWT_SECRET || 'secret';
exports.JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
