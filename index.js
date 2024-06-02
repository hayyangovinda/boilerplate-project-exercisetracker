const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
require("express-async-errors");

const mongoose = require("mongoose");

const ExerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: {
    type: Date,
    default: Date.now(),
  },
});

const UserSchema = new mongoose.Schema({
  username: String,
});

const LogSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);
const User = mongoose.model("User", UserSchema);
const Log = mongoose.model("Log", LogSchema);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  try {
    const newUser = await User.create({ username });

    res.json(newUser);
  } catch (error) {
    console.log(error);
    res.status(500).json({ err: "Failed to create user" });
  }
});

app.get("/api/users", async (req, res) => {
  const allUsers = await User.find({});
  res.json(allUsers);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const body = req.body;
  const duration = req.body.duration;

  let date = req.body.date;

  if (!date) {
    date = new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } else {
    date = new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }
  date = date.replaceAll(",", "");
  body.date = date;
  body.duration = +duration;
  const user = await User.find({ _id: userId });

  const exerciseBody = { username: user[0].username, ...body };
  const newExercise = await Exercise.create(exerciseBody);

  const userLog = await Log.findOne({ username: user[0].username });

  const exerciseLog = {
    ...body,
  };

  if (userLog) {
    const logArray = [...userLog.log, exerciseLog];
    const count = logArray.length;
    const updatedLog = await Log.findByIdAndUpdate(userLog._id, {
      log: logArray,
      count,
    });
  } else {
    const logArray = [exerciseLog];
    const count = logArray.length;
    const newLog = await Log.create({
      username: user[0].username,
      log: logArray,
      count,
    });
  }

  const result = { _id: userId, username: user[0].username, ...body };

  res.json(result);
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;
  const user = await User.findById(userId);

  const username = user.username;

  let logs = await Log.find({ username });

  console.log(logs.length);
  if (from) {
    const fromUnix = new Date(from).getTime();
    const toUnix = new Date(to).getTime();

    const filteredLogs = logs[0].log.filter((log) => {
      const logDate = log.date;
      const logDateUnix = new Date(logDate).getTime();

      return logDateUnix > fromUnix && logDateUnix < toUnix;
    });
    logs[0].log = filteredLogs;
    logs[0].count = filteredLogs.length;
  }

  if (limit) {
    const limitInt = +limit;
    const limitLog = logs[0].log.slice(0, limitInt);

    logs[0].log = limitLog;
    logs[0].count = limitLog.length;
  }

  const result = {
    username,
    _id: userId,
    count: logs[0].count,
    log: logs[0].log,
  };

  res.json(result);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
