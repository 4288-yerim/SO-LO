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

    const now = Math.floor(Date.now() / 1000);
    const remainTime = decoded.exp - now;

    if (remainTime <= 60 * 10) {
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          nickname: decoded.nickname
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h"
        }
      );

      res.setHeader("Authorization", `Bearer ${newToken}`);
    }

    next();

  } catch (err) {
    return res.status(401).json({
      result: "fail",
      message: "로그인이 만료되었습니다. 다시 로그인해주세요."
    });
  }
}

module.exports = authMiddleware;