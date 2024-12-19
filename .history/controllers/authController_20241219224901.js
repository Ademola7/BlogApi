const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const generateRefreshToken = require("../config/refereshToken");
const generateToken = require("../config/jwtToken");

// Utility function to generate a JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Utility function to generate a refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

// Sign up endpoint
const signUp = catchAsync(async (req, res, next) => {
  const { first_name, last_name, email, password } = req.body;

  // Validate input
  if (!first_name || !last_name || !email || !password) {
    return next(new AppError("Please provide all required fields", 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("User already exists", 400));
  }

  // Create and save the new user
  const newUser = new User({
    first_name,
    last_name,
    email,
    password,
  });
  await newUser.save();

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: newUser._id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      email: newUser.email,
    },
  });
});

// Login endpoint
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  console.log("Request received at /login with body:", req.body);

  // Validate input
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // Find user by email
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.status(200).json({
    message: "Login successful",
    user: {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    },
    token,
    refreshToken,
  });
});

// Refresh token endpoint
const handleRefreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new AppError("Refresh token is required", 400));
  }

  // Verify refresh token
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newToken = generateToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);

    res.status(200).json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return next(new AppError("Invalid or expired refresh token", 401));
  }
});

module.exports = {
  signUp,
  login,
  handleRefreshToken,
};
