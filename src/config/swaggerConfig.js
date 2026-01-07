const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CIAM Microservice API',
      version: '1.0.0',
      description: 'Customer Identity and Access Management API for Mandai Wildlife Group. This API provides endpoints for user authentication, membership management, and WildPass digital passes.',
      contact: {
        name: 'Mandai Wildlife Group',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current environment',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Users',
        description: 'User registration, authentication, and profile management',
      },
      {
        name: 'Sessions',
        description: 'User login and logout',
      },
      {
        name: 'Password',
        description: 'Password reset and change',
      },
      {
        name: 'Memberships',
        description: 'Membership management and lookup',
      },
      {
        name: 'Tokens',
        description: 'Token verification and refresh',
      },
      {
        name: 'Passwordless',
        description: 'OTP-based passwordless authentication',
      },
      {
        name: 'MyAccount',
        description: 'Authenticated user account management',
      },
    ],
    components: {
      securitySchemes: {
        AppId: {
          type: 'apiKey',
          in: 'header',
          name: 'mwg-app-id',
          description: 'Application ID for client identification. Required for all API calls.',
        },
        ApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for authorized clients. Required when api_key_validation switch is enabled.',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from login or passwordless authentication.',
        },
      },
    },
    security: [
      {
        AppId: [],
      },
    ],
  },
  apis: [
    './src/swagger/schemas/*.js',
    './src/api/users/userRoutes.js',
    './src/api/users/userPrivateRoutes.js',
    './src/api/memberships/membershipRoutes.js',
    './src/api/users/myAccount/passwordless/passwordlessRoutes.js',
    './src/api/users/myAccount/membership/membershipRoutes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
