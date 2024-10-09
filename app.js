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
app.use('/v1/ciam/galaxy', galaxyRoutes); // dev & uat env allowed only.
// support route
app.use('/v1/ciam', supportRoutes); // controlled by app ID

const handler = serverless(app);


const port = 3010;
const startServer = async () => {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
      });
}

startServer();

module.exports.handler = (event, context, callback) => {
    const response = handler(event, context, callback);
    return response;
};