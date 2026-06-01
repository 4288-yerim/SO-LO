const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const { oracledb, dbConfig } = require("../../db");

const { SolapiMessageService } = require("solapi");
require("dotenv").config();

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

// 비밀번호 찾기 인증번호 발송
router.post("/find-password/send-code", async (req, res) => {
  const { userId, userPhone } = req.body;

  if (!userId || !userPhone) {
    return res.status(400).json({
      result: "fail",
      message: "아이디와 휴대폰 번호를 입력해주세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userResult = await connection.execute(
      `
      SELECT USER_ID
      FROM SNS_USERS
      WHERE USER_ID = :userId
        AND USER_PHONE = :userPhone
      `,
      { userId, userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "일치하는 회원 정보를 찾을 수 없습니다."
      });
    }

    const activeCodeResult = await connection.execute(
      `
      SELECT *
      FROM SNS_AUTH_CODE
      WHERE USER_PHONE = :userPhone
        AND AUTH_STATUS = 'N'
        AND EXPIRE_TIME > SYSDATE
      ORDER BY AUTH_ID DESC
      FETCH FIRST 1 ROWS ONLY
      `,
      { userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (activeCodeResult.rows.length > 0) {
      return res.status(429).json({
        result: "fail",
        message: "이미 발송된 인증번호가 있습니다. 5분 후 다시 시도해주세요."
      });
    }

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
      { userPhone, authCode },
      { autoCommit: true }
    );

    await messageService.send({
      to: userPhone,
      from: process.env.SOLAPI_FROM,
      text: `[SO:LO] 비밀번호 재설정 인증번호는 [${authCode}] 입니다.`
    });

    res.json({
      result: "success",
      message: "인증번호가 발송되었습니다."
    });
  } catch (err) {
    console.error("Find password send code error", err);

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

// 비밀번호 찾기 인증번호 확인
router.post("/find-password/verify-code", async (req, res) => {
  const { userId, userPhone, authCode } = req.body;

  if (!userId || !userPhone || !authCode) {
    return res.status(400).json({
      result: "fail",
      message: "아이디, 휴대폰 번호, 인증번호를 입력해주세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userResult = await connection.execute(
      `
      SELECT USER_ID
      FROM SNS_USERS
      WHERE USER_ID = :userId
        AND USER_PHONE = :userPhone
      `,
      { userId, userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "일치하는 회원 정보를 찾을 수 없습니다."
      });
    }

    const result = await connection.execute(
      `
      SELECT *
      FROM SNS_AUTH_CODE
      WHERE USER_PHONE = :userPhone
        AND AUTH_STATUS = 'N'
      ORDER BY AUTH_ID DESC
      FETCH FIRST 1 ROWS ONLY
      `,
      { userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        result: "fail",
        message: "인증번호를 먼저 발송해주세요."
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
      { authId: codeInfo.AUTH_ID },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "휴대폰 인증이 완료되었습니다."
    });
  } catch (err) {
    console.error("Find password verify code error", err);

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

// 새 비밀번호 입력
router.post("/find-password/reset", async (req, res) => {
  const { userId, userPhone, newPassword, confirmPassword } = req.body;

  if (!userId || !userPhone || !newPassword || !confirmPassword) {
    return res.status(400).json({
      result: "fail",
      message: "필수 정보를 모두 입력해주세요."
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      result: "fail",
      message: "비밀번호 확인이 일치하지 않습니다."
    });
  }

  const pwdRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;

  if (!pwdRegex.test(newPassword)) {
    return res.status(400).json({
      result: "fail",
      message: "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userResult = await connection.execute(
      `
      SELECT USER_ID
      FROM SNS_USERS
      WHERE USER_ID = :userId
        AND USER_PHONE = :userPhone
      `,
      { userId, userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "일치하는 회원 정보를 찾을 수 없습니다."
      });
    }

    const hashedPwd = await bcrypt.hash(newPassword, 10);

    await connection.execute(
      `
      UPDATE SNS_USERS
      SET USER_PWD = :hashedPwd,
          UDATE = SYSDATE
      WHERE USER_ID = :userId
        AND USER_PHONE = :userPhone
      `,
      { hashedPwd, userId, userPhone },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "비밀번호가 변경되었습니다."
    });
  } catch (err) {
    console.error("Password reset error", err);

    res.status(500).json({
      result: "fail",
      message: "비밀번호 변경 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 아이디 찾기 인증번호 발송
router.post("/find-id/send-code", async (req, res) => {
  const { userPhone } = req.body;

  if (!userPhone) {
    return res.status(400).json({
      result: "fail",
      message: "휴대폰 번호를 입력해주세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userResult = await connection.execute(
      `
      SELECT USER_ID
      FROM SNS_USERS
      WHERE USER_PHONE = :userPhone
      `,
      { userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "해당 휴대폰 번호로 가입된 계정이 없습니다."
      });
    }

    const activeCodeResult = await connection.execute(
      `
      SELECT *
      FROM SNS_AUTH_CODE
      WHERE USER_PHONE = :userPhone
        AND AUTH_STATUS = 'N'
        AND EXPIRE_TIME > SYSDATE
      ORDER BY AUTH_ID DESC
      FETCH FIRST 1 ROWS ONLY
      `,
      { userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (activeCodeResult.rows.length > 0) {
      return res.status(429).json({
        result: "fail",
        message: "이미 발송된 인증번호가 있습니다. 5분 후 다시 시도해주세요."
      });
    }

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
      { userPhone, authCode },
      { autoCommit: true }
    );

    await messageService.send({
      to: userPhone,
      from: process.env.SOLAPI_FROM,
      text: `[SO:LO] 아이디 찾기 인증번호는 [${authCode}] 입니다.`
    });

    res.json({
      result: "success",
      message: "인증번호가 발송되었습니다."
    });
  } catch (err) {
    console.error("Find id send code error", err);

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

// 아이디 찾기 인증번호 확인 + 아이디 목록 조회
router.post("/find-id/verify-code", async (req, res) => {
  const { userPhone, authCode } = req.body;

  if (!userPhone || !authCode) {
    return res.status(400).json({
      result: "fail",
      message: "휴대폰 번호와 인증번호를 입력해주세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const codeResult = await connection.execute(
      `
      SELECT *
      FROM SNS_AUTH_CODE
      WHERE USER_PHONE = :userPhone
        AND AUTH_STATUS = 'N'
      ORDER BY AUTH_ID DESC
      FETCH FIRST 1 ROWS ONLY
      `,
      { userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({
        result: "fail",
        message: "인증번호를 먼저 발송해주세요."
      });
    }

    const codeInfo = codeResult.rows[0];

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
      { authId: codeInfo.AUTH_ID },
      { autoCommit: false }
    );

    const userResult = await connection.execute(
      `
      SELECT USER_ID, CDATE
      FROM SNS_USERS
      WHERE USER_PHONE = :userPhone
      ORDER BY CDATE DESC
      `,
      { userPhone },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    await connection.commit();

    res.json({
      result: "success",
      message: "아이디 찾기가 완료되었습니다.",
      userIds: userResult.rows.map((row) => ({
        userId: row.USER_ID,
        cdate: row.CDATE
      }))
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Find id verify code error", err);

    res.status(500).json({
      result: "fail",
      message: "아이디 찾기 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;