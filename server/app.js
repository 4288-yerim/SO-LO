const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const sampleRouter = require("./routes/sample");
const loginRouter = require("./routes/user/login");
const signupRouter = require("./routes/user/signup");
const findAccountRouter = require("./routes/user/findAccount");
const feedRouter = require("./routes/feed");
const postRouter = require("./routes/post");
const profileRouter = require("./routes/profile");
const settingRouter = require("./routes/setting");

const app = express();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  exposedHeaders: ["Authorization"]
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));


app.get("/", (req, res) => {
  res.send("SO:LO server running");
});

app.use("/sample", sampleRouter);

app.use("/user", loginRouter);
app.use("/user", signupRouter);
app.use("/user", findAccountRouter);

app.use("/profile", require("./routes/profile/profileHeader"));
app.use("/profile", require("./routes/profile/profileContent"));
app.use("/profile", require("./routes/profile/profileEtc"));
app.use("/profile", require("./routes/profile/follow"));

app.use("/feed", feedRouter);
app.use("/post", postRouter);
app.use("/setting", settingRouter);

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});