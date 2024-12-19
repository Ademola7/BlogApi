const jwt = require("jsonwebtoken");
const moment = require("moment");

const generateToken = (id) => {
  const expiresIn = process.env.JWT_EXPIRES_IN;
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: expiresIn });
};
const calculateExpirationTime = () => {
  const expiresIn = process.env.JWT_EXPIRES_IN;
  const expirationDate = moment().add(moment.duration(expiresIn));
  return expirationDate.toISOString();
};

module.exports = { generateToken, calculateExpirationTime };
