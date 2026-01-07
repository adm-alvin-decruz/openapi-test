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

## Async Processing

Some operations trigger background processing via SQS queues:

| Operation | Background Tasks |
|-----------|------------------|
| User Signup | Galaxy import, Card face generation, PassKit creation, Welcome email |
| Membership Update | PassKit regeneration, Notification email |
| Password Reset | Reset email via SendGrid |

These tasks are processed asynchronously. The API returns immediately with a success response, and background jobs complete within a few minutes.

**Note:** Failed background jobs are tracked in the \`failed_jobs\` table and can be retried via the admin portal.
`,
      contact: {
        name: 'Mandai Wildlife Group',
      },
    },
    servers: [
      {
        url: 'https://services.mandai.com',
        description: 'Production',
      },
      {
        url: 'https://uat-services.mandai.com',
        description: 'UAT',
      },
      {
        url: 'https://dev-services.mandai.com',
        description: 'Development',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Auth',
        description: 'Authentication - Login, logout, OTP, and session management',
      },
      {
        name: 'Users',
        description: 'User registration and profile management',
      },
      {
        name: 'Passwords',
        description: 'Password reset and change flows',
      },
      {
        name: 'Memberships',
        description: 'Membership passes and WildPass management',
      },
      {
        name: 'Tokens',
        description: 'Access token verification and refresh',
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
