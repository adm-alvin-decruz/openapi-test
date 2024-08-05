/**
 * Validate
 * @param {JSON} req
 * @param {JSON} res
 * @param {*} next
 * @returns
 */
function isEmptyRequest(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is empty' });
    }
  }
  next();
}

module.exports = {
  isEmptyRequest
}