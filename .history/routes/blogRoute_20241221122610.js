const express = require("express");
const { protected } = require("../middleware/authMiddleware");
const blogController = require("../controllers/blogController");

const router = express.Router();

// Public routes
router.get("/", blogController.getAllPublishedBlogs); // List all published blogs
router.get("/:id", blogController.getSingleBlog); // Get a single published blog

// Protected routes
router.use(protected); // Middleware applied to all routes below
router.post("/", blogController.createBlog); // Create a blog
router.patch("/:id", blogController.updateBlog); // Update a blog (draft or published)
router.delete("/:id", blogController.deleteBlog); // Delete a blog
router.patch("/:id/publish", blogController.publishBlog); // Change blog state to published
router.get("/user/blogs", blogController.getUserBlogs); // Get all blogs of the logged-in user

module.exports = router;
