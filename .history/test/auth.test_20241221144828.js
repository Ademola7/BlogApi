const chai = require("chai");
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const app = require("../index");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env.test" });
const MongoMemoryServer = require("mongodb-memory-server");

const { expect } = chai;
chai.use(chaiHttp);

// Rest of your test file remains the same

describe("Auth - Sign Up", () => {
  before(async () => {
    await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  after(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should register a new user", async () => {
    const res = await chai.request(app).post("/api/v1/auth/signup").send({
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      password: "StrongPassword123",
    });

    expect(res).to.have.status(201);
    expect(res.body).to.have.property("message", "User created successfully");
    expect(res.body.user).to.have.property("email", "john.doe@example.com");
  });

  it("should not allow duplicate email registration", async () => {
    await chai.request(app).post("/api/v1/auth/signup").send({
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      password: "StrongPassword123",
    });

    const res = await chai.request(app).post("/api/v1/auth/signup").send({
      first_name: "Jane",
      last_name: "Smith",
      email: "john.doe@example.com",
      password: "AnotherPassword123",
    });

    expect(res).to.have.status(400);
    expect(res.body).to.have.property("message", "User already exists");
  });
});

describe("Auth - Login", () => {
  beforeEach(async () => {
    await User.create({
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      password: await bcrypt.hash("StrongPassword123", 10),
    });
  });

  it("should log in a user with correct credentials", async () => {
    const res = await chai.request(app).post("/api/v1/auth/login").send({
      email: "john.doe@example.com",
      password: "StrongPassword123",
    });

    expect(res).to.have.status(200);
    expect(res.body).to.have.property("message", "Login successful");
    expect(res.body).to.have.property("token");
    expect(res.body).to.have.property("refreshToken");
  });

  it("should not log in a user with incorrect password", async () => {
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
