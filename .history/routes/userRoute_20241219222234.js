const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/signup", authController.signUp);
router.post("/login", authController.login);
router.post("/refresh-token", authController.handleRefreshToken);

module.exports = router;
