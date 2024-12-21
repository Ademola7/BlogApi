const express = require("express");
const blogController = require("../controllers/blogController");
const authController = require("../controllers/authController");

const router = express.Router();

router
  .route("/")
  .get(blogController.getPublishedBlogs)
  .post(authController.protect, blogController.createBlog);

router
  .route("/user-blogs")
  .get(authController.protect, blogController.getUserBlogs);

router
  .route("/:id")
  .get(blogController.getBlog)
  .patch(authController.protect, blogController.updateBlog)
  .delete(authController.protect, blogController.deleteBlog);

module.exports = router;
