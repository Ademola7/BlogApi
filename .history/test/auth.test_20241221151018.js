const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcrypt");
const app = require("../index");
const User = require("../models/userModel");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

const { expect } = chai;
chai.use(chaiHttp);

let mongoServer;
let token;

describe("Auth - Sign Up and Login", () => {
  before(async () => {
    // Set up in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create a test user in the database before running tests
    await User.create({
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      password: await bcrypt.hash("StrongPassword123", 10),
    });
  });

  after(async () => {
    // Clean up database and close the connection
    await User.deleteMany({});
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("should register a new user", async () => {
    const res = await chai.request(app).post("/api/v1/auth/signup").send({
      first_name: "Jane",
      last_name: "Doe",
      email: "jane.doe@example.com",
      password: "StrongPassword123",
    });

    expect(res).to.have.status(201);
    expect(res.body).to.have.property("message", "User created successfully");
    expect(res.body.user).to.have.property("email", "jane.doe@example.com");
  });

  it("should log in an existing user", async () => {
    const res = await chai.request(app).post("/api/v1/auth/login").send({
      email: "john.doe@example.com",
      password: "StrongPassword123",
    });

    token = res.body.token;

    expect(res).to.have.status(200);
    expect(res.body).to.have.property("message", "Login successful");
    expect(res.body).to.have.property("token");
    expect(res.body).to.have.property("refreshToken");
  });

  it("should not allow login with incorrect credentials", async () => {
    this.timeout(5000);
    const res = await chai.request(app).post("/api/v1/auth/login").send({
      email: "john.doe@example.com",
      password: "WrongPassword",
    });

    expect(res).to.have.status(401);
    expect(res.body).to.have.property("message", "Incorrect email or password");
  });

  it("should not log in a non-existing user", async () => {
    const res = await chai.request(app).post("/api/v1/auth/login").send({
      email: "non.existing@example.com",
      password: "SomePassword",
    });

    expect(res).to.have.status(401);
    expect(res.body).to.have.property("message", "Incorrect email or password");
  });
});
