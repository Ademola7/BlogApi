const express = require("express");
const { protected } = require("../middleware/authMiddleware");
const blogController = require("../controllers/blogController");

const router = express.Router();

// Public routes
router.get("/", blogController.getAllPublishedBlogs); // Get all published blogs
router.get("/:id", blogController.getSingleBlog); // Get a single published blog

// Protected routes
router.use(protected); // Apply authentication middleware
router.post("/", blogController.createBlog); // Create a new blog
router.patch("/:id", blogController.updateBlog); // Update an existing blog
router.delete("/:id", blogController.deleteBlog); // Delete a blog
router.patch("/:id/publish", blogController.publishBlog); // Publish a blog
router.get("/user/blogs", blogController.getUserBlogs); // Get all blogs of the logged-in user

module.exports = router;
