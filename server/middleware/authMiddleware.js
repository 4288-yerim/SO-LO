const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      result: "fail",
      message: "로그인이 필요합니다."
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      result: "fail",
      message: "토큰이 없습니다."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      nickname: decoded.nickname
    };

    next();
  } catch (err) {
    return res.status(401).json({
      result: "fail",
      message: "로그인이 만료되었습니다. 다시 로그인해주세요."
    });
  }
}

module.exports = authMiddleware;