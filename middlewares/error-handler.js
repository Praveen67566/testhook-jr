export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: 'Not found.',
  });
}

export function errorHandler(error, req, res, next) {
  /*
   * CORS rejection
   */
  if (error?.code === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({
      success: false,
      error: 'Origin not allowed.',
    });
  }

  /*
   * Express JSON parser:
   * request exceeded 16 KiB.
   */
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body is too large.',
    });
  }

  /*
   * Malformed JSON.
   */
  if (
    error instanceof SyntaxError &&
    error?.status === 400
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON body.',
    });
  }

  /*
   * Never log body, lead values,
   * password, or full database errors.
   */
  console.error('Unhandled webhook error.', {
    name: error?.name ?? 'Error',
    code: error?.code ?? 'UNKNOWN',
  });

  return res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
}