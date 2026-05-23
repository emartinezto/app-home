/**
 * Pequeño wrapper para no repetir try/catch en cada controller async.
 *   router.get('/x', asyncHandler(controller))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
