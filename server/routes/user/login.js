const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();

const { oracledb, dbConfig } = require("../../db");

require("dotenv").config();

// 로그인
router.post("/login", async (req, res) => {
  const { userId, userPwd } = req.body;

  if (!userId || !userPwd) {
    return res.status(400).json({
      result: "fail",
      message: "아이디와 비밀번호를 입력해주세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `
      SELECT 
        USER_ID,
        USER_PWD,
        USER_NAME,
        USER_NICKNAME,
        USER_STATUS,
        RELATION_BADGE
      FROM SNS_USERS
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        result: "fail",
        message: "아이디 또는 비밀번호가 일치하지 않습니다."
      });
    }

    const user = result.rows[0];

    if (user.USER_STATUS !== "ACT") {
      return res.status(403).json({
        result: "fail",
        message: "사용할 수 없는 계정입니다."
      });
    }

    const isMatch = await bcrypt.compare(userPwd, user.USER_PWD);

    if (!isMatch) {
      return res.status(401).json({
        result: "fail",
        message: "아이디 또는 비밀번호가 일치하지 않습니다."
      });
    }

    const token = jwt.sign(
      {
        userId: user.USER_ID,
        nickname: user.USER_NICKNAME
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    return res.json({
      result: "success",
      message: "로그인 성공",
      token,
      user: {
        userId: user.USER_ID,
        userName: user.USER_NAME,
        userNickname: user.USER_NICKNAME,
        relationBadge: user.RELATION_BADGE
      }
    });
  } catch (err) {
    console.error("Login error", err);

    return res.status(500).json({
      result: "fail",
      message: "서버 오류가 발생했습니다."
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;