/**
 * @openapi
 * components:
 *   schemas:
 *     MembershipCheckRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address to check membership
 *           example: user@example.com
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     MembershipCheckResponse:
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
 *             email:
 *               type: string
 *               example: user@example.com
 *             mandaiId:
 *               type: string
 *               example: "MWG-12345678"
 *             hasMembership:
 *               type: boolean
 *               example: true
 *             membershipDetails:
 *               type: object
 *               properties:
 *                 categoryType:
 *                   type: string
 *                   example: "Annual Pass"
 *                 expiryDate:
 *                   type: string
 *                   format: date
 *                   example: "2025-12-31"
 *                 status:
 *                   type: string
 *                   example: active
 *
 *     MembershipPassesRequest:
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
 *     MembershipPassesResponse:
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
 *             passes:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   passId:
 *                     type: string
 *                     example: "PASS-001"
 *                   visualId:
 *                     type: string
 *                     example: "VIS-12345"
 *                   passType:
 *                     type: string
 *                     example: "Annual Pass"
 *                   expiryDate:
 *                     type: string
 *                     format: date
 *                     example: "2025-12-31"
 *                   status:
 *                     type: string
 *                     example: active
 *                   appleWalletUrl:
 *                     type: string
 *                     format: uri
 *                     example: "https://example.com/wallet/apple/pass123"
 *                   googleWalletUrl:
 *                     type: string
 *                     format: uri
 *                     example: "https://example.com/wallet/google/pass123"
 *             accessToken:
 *               type: string
 *               description: New access token if token was refreshed
 *               example: "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
 *
 *     CreateMembershipPassRequest:
 *       type: object
 *       required:
 *         - email
 *         - passType
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         passType:
 *           type: string
 *           description: Type of membership pass
 *           example: "annual"
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     UpdateMembershipPassRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         passType:
 *           type: string
 *           description: Type of membership pass
 *           example: "annual"
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     MyAccountMembershipRequest:
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
 *     MyAccountMembershipResponse:
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
 *             email:
 *               type: string
 *               example: user@example.com
 *             mandaiId:
 *               type: string
 *               example: "MWG-12345678"
 *             firstName:
 *               type: string
 *               example: John
 *             lastName:
 *               type: string
 *               example: Doe
 *             membershipDetails:
 *               type: object
 *               properties:
 *                 categoryType:
 *                   type: string
 *                   example: "Annual Pass"
 *                 expiryDate:
 *                   type: string
 *                   format: date
 *                   example: "2025-12-31"
 *
 *     DeleteAccountRequest:
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
 *     DeleteAccountResponse:
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
 *               example: Account deleted successfully
 */

// This file contains OpenAPI schema definitions only
module.exports = {};
