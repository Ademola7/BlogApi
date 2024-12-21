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
before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoURI = mongoServer.getUri(); // Get the in-memory database URI
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

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
});

// Close the connection and stop the in-memory server after tests
after(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Clear blog collection before each test
beforeEach(async () => {
  await Blog.deleteMany({});
});

describe("Blog Endpoints", () => {
  it("should create a new blog", async () => {
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

  it("should fetch all blogs", async () => {
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
