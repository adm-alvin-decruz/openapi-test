require("dotenv").config();

const errorHandler = (err, req, res, next) => {
  // log the full error for debugging (to your server logs, not to the client)
  console.error(err);

  // set appropriate status code
  const statusCode = err.statusCode || err.status || 500;

  // return a sanitized error response
  res.status(statusCode).json({
    status: "failed",
    statusCode: statusCode,
    error: {
      message: process.env.APP_ENV === 'prod' ? 'An error occurred' : err.message || 'Internal Server Error',
      // optionally include a code for client-side handling
      code: err.code || 'UNKNOWN_ERROR'
    }
  });
};

module.exports = errorHandler;