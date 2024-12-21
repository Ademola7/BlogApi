const Blog = require("../Models/blogModel");
const catchAsync = require("../utils/catchAsync");

// Public: Get all published blogs
exports.getAllPublishedBlogs = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, sort } = req.query;

  const filters = { state: "published" };

  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const sortOptions = sort
    ? sort.split(",").join(" ")
    : "-read_count -createdAt";

  const blogs = await Blog.find(filters)
    .sort(sortOptions)
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10));

  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: blogs,
  });
});

// Public: Get a single published blog
exports.getSingleBlog = catchAsync(async (req, res) => {
  const blog = await Blog.findOneAndUpdate(
    { _id: req.params.id, state: "published" },
    { $inc: { read_count: 1 } },
    { new: true }
  ).populate("author", "first_name last_name email");

  if (!blog) {
    return res.status(404).json({ message: "Blog not found or not published" });
  }

  res.status(200).json({
    status: "success",
    data: blog,
  });
});

// Protected: Create a new blog
exports.createBlog = catchAsync(async (req, res) => {
  const { title, description, tags, body } = req.body;

  const newBlog = await Blog.create({
    title,
    description,
    tags,
    body,
    author: req.user._id,
  });

  res.status(201).json({
    status: "success",
    data: newBlog,
  });
});

// Protected: Update an existing blog
exports.updateBlog = catchAsync(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  if (blog.author.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to update this blog" });
  }

  const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: updatedBlog,
  });
});

// Protected: Delete a blog
exports.deleteBlog = catchAsync(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  if (blog.author.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to delete this blog" });
  }

  await blog.deleteOne();

  res.status(204).json({
    status: "success",
    message: "Blog deleted successfully",
  });
});

// Protected: Publish a blog
exports.publishBlog = catchAsync(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  if (blog.author.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to publish this blog" });
  }

  blog.state = "published";
  await blog.save();

  res.status(200).json({
    status: "success",
    message: "Blog published successfully",
    data: blog,
  });
});

// Protected: Get all blogs of the logged-in user
exports.getUserBlogs = catchAsync(async (req, res) => {
  const blogs = await Blog.find({ author: req.user._id }).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: blogs,
  });
});
