require('dotenv').config();

/**
 * Safely serializes an error object, extracting only safe properties
 * to avoid circular reference issues when converting to JSON
 * @param {Error} error - The error object to serialize
 * @returns {Object} A safe, serializable representation of the error
 */
const serializeError = (error) => {
  if (!error) return null;

  const serialized = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
  };

  // Add statusCode if present
  if (error.statusCode) {
    serialized.statusCode = error.statusCode;
  }

  // Add code if present (common in AWS SDK errors)
  if (error.code) {
    serialized.code = error.code;
  }

  // Add stack trace in non-production environments
  if (process.env.APP_ENV !== 'prod' && error.stack) {
    serialized.stack = error.stack;
  }

  // Add any custom error details if they're serializable
  if (error.details && typeof error.details === 'object') {
    try {
      serialized.details = JSON.parse(JSON.stringify(error.details));
    } catch (_e) {
      // If details can't be serialized, skip them
    }
  }

  return serialized;
};

const errorHandler = (err, req, res) => {
  // log the full error for debugging (to your server logs, not to the client)
  console.error(err);

  // set appropriate status code
  const statusCode = err.statusCode || err.status || 500;

  // return a sanitized error response
  res.status(statusCode).json({
    status: 'failed',
    statusCode: statusCode,
    error: {
      message:
        process.env.APP_ENV === 'prod'
          ? 'An error occurred'
          : err.message || 'Internal Server Error',
      // optionally include a code for client-side handling
      code: err.code || 'UNKNOWN_ERROR',
    },
  });
};

module.exports = { errorHandler, serializeError };
