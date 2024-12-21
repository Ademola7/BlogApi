const Blog = require("../models/blogModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Create a new blog
exports.createBlog = catchAsync(async (req, res, next) => {
  const { title, description, tags, body } = req.body;

  const blog = await Blog.create({
    title,
    description,
    tags,
    body,
    author: req.user.id, // Assuming the user is authenticated, and user ID is in req.user
  });

  res.status(201).json({
    status: "success",
    data: {
      blog,
    },
  });
});

// Get all published blogs with pagination, filtering, and sorting
exports.getPublishedBlogs = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, sort, search, filter } = req.query;

  const queryObj = { state: "published" };

  if (search) {
    queryObj.$or = [
      { title: new RegExp(search, "i") },
      { tags: { $in: [search] } },
      { description: new RegExp(search, "i") },
    ];
  }

  if (filter) queryObj.state = filter;

  const blogs = await Blog.find(queryObj)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("author", "first_name last_name email");

  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: {
      blogs,
    },
  });
});

// Get a single blog and increment read count
exports.getBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const blog = await Blog.findById(id).populate(
    "author",
    "first_name last_name email"
  );

  if (!blog || blog.state !== "published") {
    return next(new AppError("Blog not found or not published", 404));
  }

  blog.read_count += 1;
  await blog.save();

  res.status(200).json({
    status: "success",
    data: {
      blog,
    },
  });
});

// Update a blog
exports.updateBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const blog = await Blog.findOneAndUpdate(
    { _id: id, author: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!blog) {
    return next(new AppError("Blog not found or you're not the author", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      blog,
    },
  });
});

// Delete a blog
exports.deleteBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const blog = await Blog.findOneAndDelete({ _id: id, author: req.user.id });

  if (!blog) {
    return next(new AppError("Blog not found or you're not the author", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Get blogs owned by the logged-in user
exports.getUserBlogs = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, filter } = req.query;

  const queryObj = { author: req.user.id };

  if (filter) queryObj.state = filter;

  const blogs = await Blog.find(queryObj)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: {
      blogs,
    },
  });
});
