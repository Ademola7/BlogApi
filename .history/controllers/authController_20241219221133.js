const User = require("../models/userModel");
const { generateToken } = require("../config/jwtToken");
const generateRefreshToken = require("../config/refreshToken");
const { calculateExpirationTime } = require("../config/jwtToken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");
const jwt = require("jsonwebtoken");
const promisify = require("util").promisify;
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:8000/auth/google/callback";

// sign up endpoint
const signUP = catchAsync(async (req, res, next) => {
  const { name, email, password, confirmPassword, role } = req.body;
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
  const verificationURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/verifyEmail/${verificationToken}`;
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
const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError("Please provide current and new passwords", 400));
  }
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Your current password is wrong", 401));
  }
  user.password = newPassword;
  user.confirmPassword = newPassword;
  await user.save();
  res.status(200).json({ status: "success", message: "Password updated" });
});
const verifyEmail = catchAsync(async (req, res, next) => {
  const token = req.params.token;

  // Verify token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_VERIFICATION_TOKEN_SECRET
    );
  } catch (err) {
    return next(new AppError("Invalid or expired token", 400));
  }

  // Find the user and verify their email
  let user;
  try {
    user = await User.findById(decoded.id);
  } catch (err) {
    return next(new AppError("Error fetching user", 500));
  }

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.emailVerified = true;
  user.isActive = true;

  try {
    // Skip validation before saving
    await user.save({ validateBeforeSave: false });
  } catch (err) {
    return next(new AppError("Error saving user", 500));
  }

  res.json({ message: "Email verified successfully" });
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}`;

    // const message = `Forgot your password? Submit a PATCH request with your new password and confirmPassword to: ${resetURL}.\nIf you did not forget your password, please ignore this email.`;
    const html = `
    <html>
      <body>
        <p>Hi ${user.name},</p>
        <p>It looks like you requested a password reset. No worries, we've got you covered!</p>
        <p>Please reset your password by clicking the link below:</p>
        <p><a href="${resetURL}">Reset your password</a></p>
        <p>If you did not request this, please ignore this email. Your account remains secure.</p>
        <p>Best regards,<br>The Gossip_Me Team</p>
      </body>
    </html>`;
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 minutes)",
      html: html,
    });
    res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});
const resetPassword = catchAsync(async (req, res, next) => {
  const resetToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: resetToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  const token = generateToken(user._id);
  res.status(200).json({ status: "success", token });
});

// Initiates the Google Login flow
const googleAuth = catchAsync(async (req, res, next) => {
  // Construct the Google OAuth 2.0 authorization URL
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;

  // Redirect the user to the Google OAuth 2.0 authorization URL
  res.redirect(url);
});

// Callback URL for handling the Google Login response
const googleCallback = catchAsync(async (req, res, next) => {
  // Extract the authorization code from the query parameters
  const code = req.query.code;

  // Check if the authorization code is provided
  if (!code) {
    return next(new AppError("No code provided", 400)); // If no code, respond with an error
  }

  // Construct the URL for exchanging the authorization code for an access token
  const url = `https://oauth2.googleapis.com/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}&redirect_uri=${REDIRECT_URI}&grant_type=authorization_code`;

  // Exchange the authorization code for an access token and refresh token
  const response = await axios.post(url);
  const { access_token, refresh_token } = response.data;

  // Check if both access token and refresh token are provided
  if (!access_token || !refresh_token) {
    return next(new AppError("No access token or refresh token provided", 400)); // If not, respond with an error
  }

  // Use the access token to fetch user profile information from Google
  const googleUser = await axios.get(
    "https://www.googleapis.com/oauth2/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${access_token}`, // Include the access token in the request header
      },
    }
  );

  // Extract user email and name from the profile data
  const { email, name } = googleUser.data;

  // Check if the user already exists in the database
  const user = await User.findOne({ email });

  // If the user does not exist, create a new user record
  if (!user) {
    const newUser = await User.create({
      name,
      email,
      anonymousLink: uuidv4(),
    });

    // Generate a JWT token for the new user
    const token = generateToken(newUser._id);

    // Respond with success status and the generated token
    res.status(200).json({ status: "success", token });
  } else {
    // If the user already exists, generate a JWT token for the existing user
    const token = generateToken(user._id);

    // Respond with success status and the generated token
    res.status(200).json({ status: "success", token });
  }
});

module.exports = {
  signUP,
  login,
};
