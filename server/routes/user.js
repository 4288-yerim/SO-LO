const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const { oracledb, dbConfig } = require("../db");

const { SolapiMessageService } = require("solapi");
require("dotenv").config();

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

// 인증번호 발송
router.post("/send-code", async (req, res) => {
  const { userPhone } = req.body;

  if (!userPhone) {
    return res.status(400).json({
      result: "fail",
      message: "휴대폰 번호를 입력하세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const authCode = String(Math.floor(100000 + Math.random() * 900000));

    await connection.execute(
      `
        INSERT INTO SNS_AUTH_CODE (
          AUTH_ID,
          USER_PHONE,
          AUTH_CODE,
          AUTH_STATUS,
          EXPIRE_TIME,
          CDATE
        )
        VALUES (
          SEQ_SNS_AUTH_CODE.NEXTVAL,
          :userPhone,
          :authCode,
          'N',
          SYSDATE + (5 / 1440),
          SYSDATE
        )
      `,
      {
        userPhone,
        authCode
      },
      { autoCommit: true }
    );

    await messageService.send({
      to: userPhone,
      from: process.env.SOLAPI_FROM,
      text: `[SO:LO] 인증번호는 [${authCode}] 입니다.`
    });

    res.json({
      result: "success",
      message: "인증번호가 발송되었습니다."
    });

  } catch (error) {
    console.error("Error sending auth code", error);

    res.status(500).json({
      result: "fail",
      message: "인증번호 발송 실패"
    });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 인증번호 확인
router.post("/verify-code", async (req, res) => {
  const { userPhone, authCode } = req.body;

  if (!userPhone || !authCode) {
    return res.status(400).json({
      result: "fail",
      message: "휴대폰 번호와 인증번호를 입력하세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `
        SELECT *
        FROM SNS_AUTH_CODE
        WHERE USER_PHONE = :userPhone
          AND AUTH_STATUS = 'N'
        ORDER BY AUTH_ID DESC
        FETCH FIRST 1 ROWS ONLY
      `,
      {
        userPhone
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        result: "fail",
        message: "인증번호를 먼저 발송하세요."
      });
    }

    const codeInfo = result.rows[0];

    if (codeInfo.AUTH_CODE !== authCode) {
      return res.status(400).json({
        result: "fail",
        message: "인증번호가 일치하지 않습니다."
      });
    }

    const expireTime = new Date(codeInfo.EXPIRE_TIME);
    const now = new Date();

    if (expireTime < now) {
      return res.status(400).json({
        result: "fail",
        message: "인증번호가 만료되었습니다."
      });
    }

    await connection.execute(
      `
        UPDATE SNS_AUTH_CODE
        SET AUTH_STATUS = 'Y'
        WHERE AUTH_ID = :authId
      `,
      {
        authId: codeInfo.AUTH_ID
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "휴대폰 인증 성공"
    });

  } catch (error) {
    console.error("Error verifying auth code", error);

    res.status(500).json({
      result: "fail",
      message: "인증 확인 실패"
    });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 회원가입
router.post("/signup", async (req, res) => {
  const {
    userId,
    userPwd,
    userName,
    userNickname,
    userPhone
  } = req.body;

  if (!userId || !userPwd || !userName || !userNickname || !userPhone) {
    return res.status(400).json({
      result: "fail",
      message: "필수 입력값이 없습니다."
    });
  }

  const idRegex = /^[a-zA-Z0-9]{4,20}$/;
    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;
    const nicknameRegex = /^[a-zA-Z0-9._]{2,20}$/;

    if (!idRegex.test(userId)) {
    return res.status(400).json({
        result: "fail",
        message: "아이디는 영문과 숫자만 가능하며 4~20자여야 합니다."
    });
    }

    if (!pwdRegex.test(userPwd)) {
    return res.status(400).json({
        result: "fail",
        message: "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다."
    });
    }

    if (!nicknameRegex.test(userNickname)) {
    return res.status(400).json({
        result: "fail",
        message: "닉네임은 영문, 숫자, _, . 만 가능하며 2~20자여야 합니다."
    });
    }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const authResult = await connection.execute(
      `
        SELECT *
        FROM SNS_AUTH_CODE
        WHERE USER_PHONE = :userPhone
          AND AUTH_STATUS = 'Y'
        ORDER BY AUTH_ID DESC
        FETCH FIRST 1 ROWS ONLY
      `,
      {
        userPhone
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (authResult.rows.length === 0) {
      return res.status(400).json({
        result: "fail",
        message: "휴대폰 인증을 완료해주세요."
      });
    }

    const hashedPwd = await bcrypt.hash(userPwd, 10);

    await connection.execute(
      `
        INSERT INTO SNS_USERS (
          USER_ID,
          USER_PWD,
          USER_NAME,
          USER_NICKNAME,
          USER_PHONE
        )
        VALUES (
          :userId,
          :userPwd,
          :userName,
          :userNickname,
          :userPhone
        )
      `,
      {
        userId,
        userPwd: hashedPwd,
        userName,
        userNickname,
        userPhone
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "회원가입 성공"
    });

  } catch (error) {
    console.error("Error signup", error);

    if (error.errorNum === 1) {
      return res.status(409).json({
        result: "fail",
        message: "이미 사용 중인 아이디 또는 닉네임입니다."
      });
    }

    res.status(500).json({
      result: "fail",
      message: "서버 오류"
    });

  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;