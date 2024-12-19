const AppError = require("../utils/appError");

// Handle casting error when converting MongoDB ID
const handleCastErrorDB = (err) => {
  const message = `Invalid ID: ${err.value} `;
  return new AppError(message, 400);
};

// Handle duplicate field value error in MongoDB
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} with value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

// Handle validation error in MongoDB
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handle JWT token error
const handleJWTError = () =>
  new AppError("Invalid token, please login again", 401);

// Handle expired JWT token error
const handleJWTExpiredError = () =>
  new AppError("Your token has expired, please login again", 401);

// Send detailed error response in development environment
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    error: err, // Send error details for debugging in development
    message: err.message,
    stack: err.stack,
  });
};

// Send concise error response in production environment
const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    // Operational errors are handled with a concise message
    return res.status(err.statusCode || 500).json({
      status: err.status || "error",
      message: err.message,
    });
  } else {
    // For programming errors, log and send a generic message
    console.error("Error", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

// Main error handling middleware
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err }; // Copy the error object
    error.message = err.message;

    // Apply specific error handling based on error type
    if (err.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === "ValidationError") error = handleValidationErrorDB(error);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
