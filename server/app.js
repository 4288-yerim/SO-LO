const express = require("express");
const cors = require("cors");
require("dotenv").config();

const sampleRouter = require("./routes/sample");
const userRouter = require("./routes/user");

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));


app.get("/", (req, res) => {
  res.send("SO:LO server running");
});

app.use("/sample", sampleRouter);
app.use("/user", userRouter);

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});