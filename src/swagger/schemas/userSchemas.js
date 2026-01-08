/**
 * @openapi
 * components:
 *   schemas:
 *     UserSignupRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - group
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (must be unique)
 *           example: john.tan@gmail.com
 *         password:
 *           type: string
 *           format: password
 *           description: User password (min 8 chars, must include uppercase, lowercase, number, special char)
 *           example: SecurePass123!
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: John
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: Tan
 *         group:
 *           $ref: '#/components/schemas/GroupType'
 *         phoneNumber:
 *           type: string
 *           description: Phone number with country code
 *           example: "+6591234567"
 *         dob:
 *           type: string
 *           format: date
 *           description: Date of birth (YYYY-MM-DD)
 *           example: "1990-08-09"
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           example: male
 *         country:
 *           type: string
 *           description: Country code (ISO 3166-1 alpha-2)
 *           example: SG
 *         newletter:
 *           type: boolean
 *           description: Subscribe to newsletter
 *           example: true
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     UserUpdateRequest:
 *       type: object
 *       required:
 *         - email
 *         - group
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john.tan@gmail.com
 *         group:
 *           $ref: '#/components/schemas/GroupType'
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: John
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: Tan
 *         phoneNumber:
 *           type: string
 *           description: Phone number with country code
 *           example: "+6598765432"
 *         dob:
 *           type: string
 *           format: date
 *           description: Date of birth (YYYY-MM-DD)
 *           example: "1990-08-09"
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           example: male
 *         country:
 *           type: string
 *           description: Country code (ISO 3166-1 alpha-2)
 *           example: SG
 *         newletter:
 *           type: boolean
 *           description: Subscribe to newsletter
 *           example: true
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *         data:
 *           type: object
 *           properties:
 *             newEmail:
 *               type: string
 *               format: email
 *               description: New email address for email change
 *               example: john.tan.new@gmail.com
 *
 *     UserGetRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john.tan@gmail.com
 *
 *     UserSignupResponse:
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
 *               example: MWG_CIAM_USER_SIGNUP_SUCCESS
 *             message:
 *               type: string
 *               example: User created successfully
 *             email:
 *               type: string
 *               example: john.tan@gmail.com
 *             mandaiId:
 *               type: string
 *               description: Unique Mandai ID assigned to user
 *               example: "MWG-20240815-ABC123"
 *
 *     UserResponse:
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
 *               example: john.tan@gmail.com
 *             mandaiId:
 *               type: string
 *               example: "MWG-20240815-ABC123"
 *             firstName:
 *               type: string
 *               example: John
 *             lastName:
 *               type: string
 *               example: Tan
 *             phoneNumber:
 *               type: string
 *               example: "+6591234567"
 *             dob:
 *               type: string
 *               example: "1990-08-09"
 *             gender:
 *               type: string
 *               example: male
 *             country:
 *               type: string
 *               example: SG
 *             newletter:
 *               type: boolean
 *               example: true
 *             group:
 *               type: string
 *               example: membership-passes
 *
 *     UserDeleteRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email of user to delete
 *           example: john.tan@gmail.com
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 *
 *     ResendMembershipRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john.tan@gmail.com
 *         language:
 *           $ref: '#/components/schemas/LanguageCode'
 */

// This file contains OpenAPI schema definitions only
module.exports = {};
