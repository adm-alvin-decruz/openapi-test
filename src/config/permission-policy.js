const permissionsPolicyMiddleware = (req, res, next) => {
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    next();
};

module.exports = permissionsPolicyMiddleware;
