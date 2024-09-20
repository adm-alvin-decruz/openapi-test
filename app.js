const express = require('express');
const cors = require('cors');
const membershipRoutes = require('./src/api/memberships/membershipRoutes');
const userRoutes = require('./src/api/users/userRoutes');
const galaxyRoutes = require('./src/api/components/galaxy/galaxyRoutes');
const supportRoutes = require('./src/api/supports/supportRoutes')
const app = express();
const serverless = require('serverless-http');

app.use(cors())
app.use(express.json());

// use routes
app.use('/v1/ciam/', membershipRoutes);
app.use('/v1/ciam/', userRoutes);
// testing galaxy
app.use('/v1/galaxy', galaxyRoutes);
// support route
app.use('/v1/ciam', supportRoutes);

const handler = serverless(app);

module.exports.handler = (event, context, callback) => {
    const response = handler(event, context, callback);
    return response;
};