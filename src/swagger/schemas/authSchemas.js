/**
 * @openapi
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           example: SecurePass123!
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             mwgCode:
 *               type: string
 *               example: MWG_CIAM_LOGIN_SUCCESS
 *             message:
 *               type: string
 *               example: Login successful
 *             email:
 *               type: string
 *               example: user@example.com
 *             mandaiId:
 *               type: string
 *               example: "MWG-12345678"
 *             accessToken:
 *               type: string
 *               description: JWT access token
 *               example: "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 *             refreshToken:
 *               type: string
 *               description: Refresh token for obtaining new access tokens
 *               example: "eyJjdHkiOiJKV1QiLCJlbmMiOi..."
 *             idToken:
 *               type: string
 *               description: ID token containing user claims
 *               example: "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 *             expiresIn:
 *               type: integer
 *               description: Token expiry time in seconds
 *               example: 3600
 *
 *     LogoutRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         mandaiId:
 *           type: string
 *           description: User's Mandai ID (alternative to email)
 *           example: "MWG-12345678"
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     LogoutResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             message:
 *               type: string
 *               example: Logout successful
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     ResetPasswordResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             message:
 *               type: string
 *               example: Password reset email sent
 *
 *     ValidateResetTokenResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             valid:
 *               type: boolean
 *               example: true
 *             message:
 *               type: string
 *               example: Token is valid
 *
 *     ConfirmResetPasswordRequest:
 *       type: object
 *       required:
 *         - passwordToken
 *         - password
 *         - confirmPassword
 *       properties:
 *         passwordToken:
 *           type: string
 *           description: Password reset token from email
 *           example: "abc123def456"
 *         password:
 *           type: string
 *           format: password
 *           description: New password
 *           example: NewSecurePass123!
 *         confirmPassword:
 *           type: string
 *           format: password
 *           description: Confirm new password
 *           example: NewSecurePass123!
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     ConfirmResetPasswordResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             message:
 *               type: string
 *               example: Password reset successful
 *
 *     TokenVerifyRequest:
 *       type: object
 *       properties:
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     TokenVerifyResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             valid:
 *               type: boolean
 *               example: true
 *             email:
 *               type: string
 *               example: user@example.com
 *
 *     TokenRefreshRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         mandaiId:
 *           type: string
 *           description: User's Mandai ID
 *           example: "MWG-12345678"
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     TokenRefreshResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         token:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               description: New JWT access token
 *               example: "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 *             idToken:
 *               type: string
 *               description: New ID token
 *               example: "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 *             expiresIn:
 *               type: integer
 *               description: Token expiry time in seconds
 *               example: 3600
 *
 *     PasswordlessSendRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address to send OTP
 *           example: user@example.com
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     PasswordlessSendResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             message:
 *               type: string
 *               example: OTP sent successfully
 *             email:
 *               type: string
 *               example: user@example.com
 *
 *     PasswordlessVerifyRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         otp:
 *           type: string
 *           description: One-time password received via email
 *           example: "123456"
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     PasswordlessVerifyResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, failed]
 *           example: success
 *         statusCode:
 *           type: integer
 *           example: 200
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 200
 *             mwgCode:
 *               type: string
 *               example: MWG_CIAM_OTP_VERIFY_SUCCESS
 *             message:
 *               type: string
 *               example: OTP verified successfully
 *             email:
 *               type: string
 *               example: user@example.com
 *             mandaiId:
 *               type: string
 *               example: "MWG-12345678"
 *             accessToken:
 *               type: string
 *               description: JWT access token
 *               example: "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 *             refreshToken:
 *               type: string
 *               description: Refresh token
 *               example: "eyJjdHkiOiJKV1QiLCJlbmMiOi..."
 *             idToken:
 *               type: string
 *               description: ID token
 *               example: "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 *             expiresIn:
 *               type: integer
 *               description: Token expiry time in seconds
 *               example: 3600
 */

// This file contains OpenAPI schema definitions only
module.exports = {};
