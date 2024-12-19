const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "A blog must have a title"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A blog must have an author"],
    },
    state: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    read_count: {
      type: Number,
      default: 0,
    },
    reading_time: {
      type: Number,
    },
    tags: {
      type: [String],
    },
    body: {
      type: String,
      required: [true, "A blog must have a body"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// Pre-save middleware to calculate reading time
blogSchema.pre("save", function (next) {
  if (this.body) {
    // Calculate reading time: Average reading speed = 200 words per minute
    const words = this.body.split(" ").length;
    this.reading_time = Math.ceil(words / 200); // Rounded up to the nearest minute
  }
  next();
});

module.exports = mongoose.model("Blog", blogSchema);
