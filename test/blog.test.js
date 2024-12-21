const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../index");
const Blog = require("../models/blogModel");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { expect } = chai;
chai.use(chaiHttp);

let mongoServer;
let token;
let userId;

// Start in-memory MongoDB server before running tests
before(async function (done) {
  this.timeout(0); // Disable timeout for the 'before' hook (or set a large timeout like 20000ms if needed)

  try {
    // Start the in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoURI = mongoServer.getUri(); // Get the in-memory database URI

    // Ensure mongoose is connected only once
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    // Create a test user and log in to get the token
    const user = await User.create({
      first_name: "Test",
      last_name: "User",
      email: "testuser@example.com",
      password: await bcrypt.hash("TestPassword123", 10),
    });

    userId = user._id;

    const loginRes = await chai
      .request(app)
      .post("/api/v1/auth/login")
      .send({ email: "testuser@example.com", password: "TestPassword123" });

    token = loginRes.body.token;

    done(); // Signal that the async setup is complete
  } catch (error) {
    console.error("Error in 'before' hook:", error);
    done(error); // Pass the error to Mocha if any failure occurs during setup
  }
});

// Close the connection and stop the in-memory server after tests
after(async () => {
  try {
    await mongoose.connection.close();
    await mongoServer.stop();
  } catch (error) {
    console.error("Error in 'after' hook:", error);
  }
});

// Clear blog collection before each test
beforeEach(async function () {
  this.timeout(0); // Disable timeout for the 'beforeEach' hook

  try {
    await Blog.deleteMany({});
  } catch (error) {
    console.error("Error in 'beforeEach' hook:", error);
  }
});

describe("Blog Endpoints", () => {
  it("should create a new blog", async function () {
    this.timeout(0); // Disable timeout for this test

    const res = await chai
      .request(app)
      .post("/api/v1/blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Sample Blog",
        content: "This is a sample blog content.",
        author: userId,
      });

    expect(res).to.have.status(201);
    expect(res.body).to.have.property("data");
    expect(res.body.data).to.have.property("id");
    expect(res.body.data).to.have.property("title", "Sample Blog");
    expect(res.body.data).to.have.property(
      "content",
      "This is a sample blog content."
    );
  });

  it("should fetch all blogs", async function () {
    this.timeout(0); // Disable timeout for this test

    // Create a blog before fetching
    await Blog.create({
      title: "Sample Blog",
      content: "This is a sample blog content.",
      author: userId,
    });

    const res = await chai.request(app).get("/api/v1/blogs");

    expect(res).to.have.status(200);
    expect(res.body).to.be.an("object");
    expect(res.body.data).to.be.an("array");
    expect(res.body.data).to.have.lengthOf.at.least(1);
  });
});
