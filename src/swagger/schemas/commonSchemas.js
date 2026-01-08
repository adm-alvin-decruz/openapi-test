/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [failed]
 *           example: failed
 *         statusCode:
 *           type: integer
 *           example: 400
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 400
 *             mwgCode:
 *               type: string
 *               example: MWG_CIAM_PARAMS_ERR
 *             message:
 *               type: string
 *               example: Wrong parameters
 *             error:
 *               type: object
 *               additionalProperties:
 *                 type: string
 *
 *     UnauthorizedError:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [failed]
 *           example: failed
 *         statusCode:
 *           type: integer
 *           example: 401
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 401
 *             mwgCode:
 *               type: string
 *               example: MWG_CIAM_UNAUTHORIZED
 *             message:
 *               type: string
 *               example: Unauthorized
 *
 *     InternalServerError:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [failed]
 *           example: failed
 *         statusCode:
 *           type: integer
 *           example: 500
 *         membership:
 *           type: object
 *           properties:
 *             code:
 *               type: integer
 *               example: 500
 *             mwgCode:
 *               type: string
 *               example: MWG_CIAM_INTERNAL_SERVER_ERROR
 *             message:
 *               type: string
 *               example: Internal Server Error
 *
 *     PingResponse:
 *       type: object
 *       properties:
 *         pong:
 *           type: string
 *           example: pang
 *
 *     LanguageCode:
 *       type: string
 *       enum: [en, ja, kr, zh]
 *       description: Language code for localized messages
 *       example: en
 *
 *     GroupType:
 *       type: string
 *       enum: [wildpass, membership-passes]
 *       description: User group type
 *       example: wildpass
 */

// This file contains OpenAPI schema definitions only
// It is parsed by swagger-jsdoc for schema extraction
module.exports = {};
