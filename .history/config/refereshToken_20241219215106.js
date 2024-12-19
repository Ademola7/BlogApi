const jwt = require("jsonwebtoken");

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESHTOKEN_SECRET, {
    expiresIn: "1h",
  });
};

module.exports = generateRefreshToken;
