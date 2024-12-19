const User = require("../models/userModel");
const { generateToken } = require("../config/jwtToken");
const generateRefreshToken = require("../config/refreshToken");
const { calculateExpirationTime } = require("../config/jwtToken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken");
const promisify = require("util").promisify;
const crypto = require("crypto");

// sign up endpoint
const signUP = catchAsync(async (req, res, next) => {
  const {} = req.body;
  // generate anonymous link
  const anonymousLink = uuidv4();
  // Validate input
  if (!name || !email || !password || !confirmPassword || !role) {
    return next(
      new AppError(
        "Please provide name, email, password, and confirmPassword",
        400
      )
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("User already exists", 400));
  }
  // Create new user
  const newUser = new User({
    name,
    email,
    password,
    confirmPassword,
    anonymousLink,
    role,
  });
  await newUser.save();
  // create verification token
  const verificationToken = jwt.sign(
    { id: newUser._id },
    process.env.JWT_VERIFICATION_TOKEN_SECRET,
    {
      expiresIn: "7d",
    }
  );

  // Send welcome email

  // Respond to client
  res.json({ message: "User created successfully", newUser });
});
//login endpoint
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  const findUser = await User.findOne({ email }).select("+password");
  if (
    !findUser ||
    !(await findUser.correctPassword(password, findUser.password))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }
  if (!findUser.emailVerified) {
    return next(new AppError("Please verify your email", 401));
  }
  const refreshToken = generateRefreshToken(findUser._id);
  const expirationTime = calculateExpirationTime();
  res.status(200).json({
    user: findUser,
    token: generateToken(findUser._id),
    expiresIn: expirationTime,
    refreshToken: refreshToken,
  });
});

//Refresh token endpoint
const handleRefreshToken = async (req, res) => {
  const { user } = req;
  const newToken = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  res.status(200).json({ token: newToken, refreshToken: refreshToken });
};

module.exports = {
  signUP,
  login,
};
