const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");

const protected = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    try {
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        req.user = user;
        next();
      }
    } catch (error) {
      throw new Error("not authorized token expired, please login again");
    }
  } else {
    throw new Error("there is no token attached to this head");
  }
});
const isAdmin = catchAsync(async (req, res, next) => {
  if (req.user.role === "admin") {
    next();
  } else {
    throw new Error("you are not admin");
  }
});

module.exports = { protected, isAdmin };
