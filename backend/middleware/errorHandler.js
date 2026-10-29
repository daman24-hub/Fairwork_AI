export function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : error.message
  });
}
