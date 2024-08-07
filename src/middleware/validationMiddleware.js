const resHelper = require('../helpers/responseHelpers');

/**
 * Validate empty request
 * @param {JSON} req
 * @param {JSON} res
 * @param {*} next
 * @returns
 */
function isEmptyRequest(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json(
        resHelper.formatMiddlewareRes(400, 'Request body is empty')
      );
    }
  }
  next();
}

function validateEmail(req, res, next) {
    const { email } = req.body;
    let msg = 'The email is invalid';

    if (!email) {
      return res.status(400).json(
        resHelper.formatMiddlewareRes(400, msg)
      );
    }

    // Optional: You can add more robust email validation here
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(
        resHelper.formatMiddlewareRes(400, msg)
      );
    }

    next();
}

module.exports = {
  isEmptyRequest,
  validateEmail
}