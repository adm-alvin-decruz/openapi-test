const express = require('express');
const cors = require('cors');
const membershipRoutes = require('./src/api/memberships/membershipRoutes');
const userRoutes = require('./src/api/users/userRoutes');
const galaxyRoutes = require('./src/api/components/galaxy/galaxyRoutes');
const supportRoutes = require('./src/api/supports/supportRoutes')
const userPrivateRoutes = require('./src/api/users/userPrivateRoutes');
const errorHandler = require('./src/utils/errorHandler');
const app = express();
const serverless = require('serverless-http');
const helmetMiddleware = require('./src/config/helmetConfig');
const permissionsPolicyMiddleware = require('./src/config/permission-policy');
const RateLimit = require('express-rate-limit');

const limiter = RateLimit({
  windowMs: 1000, // 1 second
  max: 10, // Limit each IP to 10 requests per 1 second
  message: 'Too many requests - try again in a second.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
// fix Express.js Stack Trace Disclosure in Error Response. VAPT
app.use(errorHandler);
app.use(helmetMiddleware);
//permission policy
app.use(permissionsPolicyMiddleware)
// use routes
app.use('/v1/ciam/', membershipRoutes);
app.use('/v1/ciam/', userRoutes);
// testing galaxy
app.use('/v1/ciam/galaxy', galaxyRoutes); // dev & uat env allowed only.
// support route
app.use('/v1/ciam', supportRoutes); // controlled by app ID

// private user route
app.use('/private', userPrivateRoutes);

const handler = serverless(app);

module.exports.handler = (event, context, callback) => {
  const response = handler(event, context, callback);
  return response;
};
