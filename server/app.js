const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const sampleRouter = require("./routes/sample");

const loginRouter = require("./routes/user/login");
const signupRouter = require("./routes/user/signup");
const findAccountRouter = require("./routes/user/findAccount");

const profileHeaderRouter = require("./routes/profile/profileHeader");
const profileContentRouter = require("./routes/profile/profileContent");
const profileEtcRouter = require("./routes/profile/profileEtc");
const profileFollowRouter = require("./routes/profile/follow");

const postRouter = require("./routes/post");
const adPostRouter = require("./routes/adPost");

const favoriteRouter = require("./routes/favorite");
const feedRouter = require("./routes/feed");
const settingRouter = require("./routes/setting");
const notificationRouter = require("./routes/notification");
const searchRouter = require("./routes/search");
const dmRouter = require("./routes/dm");
const reportRouter = require("./routes/report");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});

app.set("io", io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("로그인이 필요합니다."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = {
      userId: decoded.userId,
      nickname: decoded.nickname
    };

    next();
  } catch (err) {
    next(new Error("소켓 인증 실패"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomNo) => {
    socket.join(`dm-${roomNo}`);
  });

  socket.on("leaveRoom", (roomNo) => {
    socket.leave(`dm-${roomNo}`);
  });

  socket.on("disconnect", () => {});
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  exposedHeaders: ["Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("SO:LO server running");
});

app.use("/sample", sampleRouter);

app.use("/user", loginRouter);
app.use("/user", signupRouter);
app.use("/user", findAccountRouter);

app.use("/profile", profileHeaderRouter);
app.use("/profile", profileContentRouter);
app.use("/profile", profileEtcRouter);
app.use("/profile", profileFollowRouter);

app.use("/post", postRouter);
app.use("/adPost", adPostRouter);

app.use("/favorite", favoriteRouter);
app.use("/notification", notificationRouter);
app.use("/dm", dmRouter);
app.use("/feed", feedRouter);
app.use("/setting", settingRouter);
app.use("/search", searchRouter);
app.use("/report", reportRouter);

const PORT = process.env.PORT || 3010;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});