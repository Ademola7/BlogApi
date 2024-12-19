const express = require("express");
const morgan = require("morgan");
// const userRoute = require("./Routes/userRoute");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/v1/users", userRoute);
app.use("/api/v1/messages", messageRoute);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);

module.exports = app;
