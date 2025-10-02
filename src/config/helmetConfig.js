const helmet = require('helmet');

const helmetMiddleware = helmet({
  //CSP
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },

  //HSTS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  xssFilter: true, // Prevent reflected XSS attacks
  noSniff: true, // Prevent MIME type sniffing
  frameguard: { action: 'deny' }, // Prevent Click jacking
  hidePoweredBy: true, // Remove "X-Powered-By: Express"
});

module.exports = helmetMiddleware;
