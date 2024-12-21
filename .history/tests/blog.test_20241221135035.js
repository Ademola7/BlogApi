const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../index");
const Blog = require("../models/blogModel");

const { expect } = chai;
chai.use(chaiHttp);

describe("Blog Endpoints", () => {
  let token;

  before(async () => {
    // Simulate user login and get a token
    const loginRes = await chai.request(app).post("/api/v1/auth/login").send({
      email: "testuser@example.com",
      password: "TestPassword123",
    });

    token = loginRes.body.token;
  });

  after(async () => {
    // Clear blog collection after tests
    await Blog.deleteMany({});
  });

  it("should create a new blog", async () => {
    const res = await chai
      .request(app)
      .post("/api/v1/blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Sample Blog",
        content: "This is a sample blog content.",
      });

    expect(res).to.have.status(201);
    expect(res.body).to.have.property("data");
    expect(res.body.data).to.have.property("id");
  });

  it("should fetch all blogs", async () => {
    const res = await chai.request(app).get("/api/v1/blogs");

    expect(res).to.have.status(200);
    expect(res.body).to.be.an("object");
    expect(res.body.data).to.be.an("array");
  });
});
