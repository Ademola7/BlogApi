const dotenv = require("dotenv");
const mongoose = require("mongoose");
const process = require("process");

// Dynamically load the appropriate environment file
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: "./config.test.env" }); // Use a separate test environment file
} else {
  dotenv.config({ path: "./config.env" }); // Default to development
}

process.on("uncaughtException", (err) => {
  console.log("Unhandled exception shutting down");
  console.log(err.name, err.message);
  process.exit(1);
});

// Setup the database URI
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.dataBasePassword
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(
      `DB connection successful! Environment: ${
        process.env.NODE_ENV || "development"
      }`
    );
  })
  .catch((err) => {
    console.log("DB connection error:", err);
    process.exit(1);
  });

const app = require("./index");
const server = require("http").createServer(app);

// Basic endpoint for testing
app.get("/", (req, res) => {
  res.status(204).send(); // No content, but no 404 either
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Listening to server on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled rejection shutting down");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handling SIGTERM
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down...");
  server.close(() => {
    console.log("Process terminated!!!");
  });
});
