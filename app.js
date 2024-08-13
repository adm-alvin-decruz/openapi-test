const express = require('express');
const cors = require('cors');
const membershipRoutes = require('./src/api/memberships/membershipRoutes');
const userRoutes = require('./src/api/users/userRoutes');
const app = express();
const serverless = require('serverless-http');

app.use(cors())
app.use(express.json());

// use routes
app.use('/', membershipRoutes)
app.use('/', userRoutes)

const handler = serverless(app);

module.exports.handler = (event, context, callback) => {
    const response = handler(event, context, callback);
    return response;
};