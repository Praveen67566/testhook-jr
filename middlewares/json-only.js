export function requireJsonContentType(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({
      success: false,
      error: 'Content-Type must be application/json.',
    });
  }

  next();
}