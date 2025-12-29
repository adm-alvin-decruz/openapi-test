const express = require('express');
const cors = require('cors');
const qs = require('qs');
const membershipRoutes = require('./src/api/memberships/membershipRoutes');
const userRoutes = require('./src/api/users/userRoutes');
const galaxyRoutes = require('./src/api/components/galaxy/galaxyRoutes');
const supportRoutes = require('./src/api/supports/supportRoutes');
const userPrivateRoutes = require('./src/api/users/userPrivateRoutes');
const passwordlessRoutes = require('./src/api/users/myAccount/passwordless/passwordlessRoutes');
const { errorHandler } = require('./src/utils/errorHandler');
const app = express();
const serverless = require('serverless-http');
const helmetMiddleware = require('./src/config/helmetConfig');
const permissionsPolicyMiddleware = require('./src/config/permission-policy');
const membershipMyAccountRoutes = require('./src/api/users/myAccount/membership/membershipRoutes');
const appConfigService = require('./src/services/appConfigService');
const loggerService = require('./src/logs/logger');

app.set('query parser', (str) => {
  return qs.parse(str, { allowDots: true, depth: 10 });
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(helmetMiddleware);
//permission policy
app.use(permissionsPolicyMiddleware);

// Initialize app-config cache on startup
// Middleware to ensure cache is loaded before processing requests
// Also checks for environment variable trigger to refresh cache
app.use(async (req, res, next) => {
  // Check if env var trigger changed (for cache refresh without redeploy)
  if (appConfigService.isInitialized() && appConfigService.shouldRefreshFromEnvVar()) {
    try {
      await appConfigService.refresh();
    } catch (error) {
      // Log error but continue - cache will still work with old values
      loggerService.error('Failed to refresh app-config cache from env var trigger:', error);
    }
  }

  // Initialize if not already done
  if (!appConfigService.isInitialized()) {
    try {
      await appConfigService.initialize();
    } catch (error) {
      // Log error but continue - will fallback to file config
      loggerService.error('Failed to initialize app-config cache:', error);
    }
  }
  next();
});
// use routes
app.use('/v1/ciam/', membershipRoutes);
app.use('/v1/ciam/', userRoutes);
// testing galaxy
app.use('/v1/ciam/galaxy', galaxyRoutes); // dev & uat env allowed only.
// support route
app.use('/v1/ciam', supportRoutes); // controlled by app ID

// private user route
app.use('/private', userPrivateRoutes);

app.use('/v2/ciam/auth/membership', membershipMyAccountRoutes);
app.use('/v2/ciam/auth/', passwordlessRoutes);

// Error handler
app.use(errorHandler);

if (process.env.IS_LOCAL === 'true') {
  app.listen(3000, () => console.log('Running on port 3000'));
}

const handler = serverless(app);

module.exports.handler = async (event, context, callback) => {
  // Initialize app-config cache on Lambda cold start
  // This runs once per Lambda container initialization
  if (!appConfigService.isInitialized()) {
    try {
      await appConfigService.initialize();
    } catch (error) {
      // Log error but continue - will fallback to file config
      loggerService.error('Failed to initialize app-config cache on Lambda start:', error);
    }
  }

  const response = handler(event, context, callback);
  return response;
};
