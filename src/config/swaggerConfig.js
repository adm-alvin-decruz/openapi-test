const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CIAM Microservice API',
      version: '1.0.0',
      description: `Customer Identity and Access Management API for Mandai Wildlife Group. This API provides endpoints for user authentication, membership management, and WildPass digital passes.

## Authentication

1. **Get tokens**: Call \`POST /v1/ciam/users/sessions\` with email and password
2. **Include App ID**: Add \`mwg-app-id\` header on ALL requests
3. **Protected routes**: Add \`Authorization: Bearer <accessToken>\` header
4. **Refresh tokens**: Call \`POST /v1/ciam/token/refresh\` when token expires
5. **Passwordless login**: Use \`POST /v2/ciam/auth/passwordless/send\` and \`POST /v2/ciam/auth/passwordless/session\`

## Error Codes

| Code | Description |
|------|-------------|
| \`MWG_CIAM_UNAUTHORIZED\` | Invalid or missing credentials/token |
| \`MWG_CIAM_PARAMS_ERR\` | Invalid request parameters |
| \`MWG_CIAM_USER_SIGNUP_ERR\` | User signup failed |
| \`MWG_CIAM_USER_SIGNUP_SUCCESS\` | User signup successful |
| \`MWG_CIAM_LOGIN_SUCCESS\` | Login successful |
| \`MWG_CIAM_OTP_VERIFY_SUCCESS\` | OTP verification successful |
| \`MWG_CIAM_INTERNAL_SERVER_ERROR\` | Internal server error |
| \`MWG_CIAM_NOT_IMPLEMENTED\` | Feature not implemented |
| \`MWG_CIAM_PASSWORD_ERR_01\` | Invalid password format |
| \`MWG_CIAM_PASSWORD_ERR_02\` | Passwords do not match |
| \`MWG_CIAM_PASSWORD_ERR_03\` | Old password incorrect |
| \`MWG_CIAM_PASSWORD_ERR_04\` | New password same as old |
| \`MWG_CIAM_PASSWORD_ERR_05\` | Reset token expired or used |
| \`MWG_CIAM_REQUIRE_CHANGE_PASSWORD\` | Password change required |
`,
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
