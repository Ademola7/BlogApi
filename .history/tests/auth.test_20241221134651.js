const chai = require("chai");
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const app = require("../index");
const User = require("../models/userModel");

const { expect } = chai;
chai.use(chaiHttp);

describe("Auth Endpoints", () => {
  before(async () => {
    // Connect to the test database
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear the User collection before tests
    await User.deleteMany({});
  });

  after(async () => {
    // Disconnect after tests
    await mongoose.connection.close();
  });

  it("should register a new user", async () => {
    const res = await chai.request(app).post("/api/v1/auth/register").send({
      username: "testuser",
      email: "testuser@example.com",
      password: "TestPassword123",
    });

    expect(res).to.have.status(201);
    expect(res.body).to.have.property("data");
    expect(res.body.data).to.have.property("id");
  });

  it("should log in a registered user", async () => {
    const res = await chai.request(app).post("/api/v1/auth/login").send({
      email: "testuser@example.com",
      password: "TestPassword123",
    });

    expect(res).to.have.status(200);
    expect(res.body).to.have.property("token");
  });
});
