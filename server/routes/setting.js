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

const scopeList = ["ALL", "FRD", "FLW", "OFF"];

function isValidScope(value) {
  return scopeList.includes(value);
}

// 설정 전체 조회
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userResult = await connection.execute(
      `
      SELECT 
        USER_ID,
        USER_NAME,
        USER_NICKNAME,
        USER_PHONE,
        USER_BIZ,
        USER_STATUS,
        RELATION_BADGE
      FROM SNS_USERS
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const privacyResult = await connection.execute(
      `
      SELECT *
      FROM SNS_USER_PRIVACY
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const notiResult = await connection.execute(
      `
      SELECT *
      FROM SNS_USER_NOTI
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const blockResult = await connection.execute(
      `
      SELECT 
        B.BLOCK_NO,
        B.BLOCKED_ID,
        U.USER_NICKNAME,
        U.USER_NAME
      FROM SNS_USER_BLOCK B
      JOIN SNS_USERS U ON B.BLOCKED_ID = U.USER_ID
      WHERE B.BLOCKER_ID = :userId
      ORDER BY B.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "회원 정보를 찾을 수 없습니다."
      });
    }

    res.json({
      result: "success",
      user: userResult.rows[0],
      privacy: privacyResult.rows[0],
      noti: notiResult.rows[0],
      blockList: blockResult.rows
    });
  } catch (err) {
    console.error("Setting load error", err);

    res.status(500).json({
      result: "fail",
      message: "설정 정보를 불러오지 못했습니다."
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 공개범위 저장
router.put("/privacy", async (req, res) => {
  const {
    userId,
    relationBadge,
    dmScope,
    followVisible,
    aloneVisible,
    likeVisible,
    postVisible,
    likePostVisible
  } = req.body;

  if (
    !userId ||
    !isValidScope(relationBadge) ||
    !isValidScope(dmScope) ||
    !isValidScope(followVisible) ||
    !isValidScope(aloneVisible) ||
    !isValidScope(likeVisible) ||
    !isValidScope(postVisible) ||
    !isValidScope(likePostVisible)
  ) {
    return res.status(400).json({
      result: "fail",
      message: "공개범위 값이 올바르지 않습니다."
    });
  }

  if (postVisible === "OFF") {
    return res.status(400).json({
      result: "fail",
      message: "게시글 공개범위는 전체 비공개를 선택할 수 없습니다."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(
      `
      UPDATE SNS_USERS
      SET
        RELATION_BADGE = :relationBadge,
        UDATE = SYSDATE
      WHERE USER_ID = :userId
      `,
      {
        userId,
        relationBadge
      },
      { autoCommit: false }
    );

    await connection.execute(
      `
      UPDATE SNS_USER_PRIVACY
      SET
        DM_SCOPE = :dmScope,
        FOLLOW_VISIBLE = :followVisible,
        ALONE_VISIBLE = :aloneVisible,
        LIKE_VISIBLE = :likeVisible,
        POST_VISIBLE = :postVisible,
        LIKE_POST_VISIBLE = :likePostVisible,
        UDATE = SYSDATE
      WHERE USER_ID = :userId
      `,
      {
        userId,
        dmScope,
        followVisible,
        aloneVisible,
        likeVisible,
        postVisible,
        likePostVisible
      },
      { autoCommit: false }
    );

    await connection.commit();

    res.json({
      result: "success",
      message: "설정이 저장되었습니다."
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Privacy update error", err);

    res.status(500).json({
      result: "fail",
      message: "공개범위 저장 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 알림 저장
router.put("/noti", async (req, res) => {
  const { userId, dmNoti, commentNoti, followNoti, likeNoti } = req.body;

  if (!userId) {
    return res.status(400).json({
      result: "fail",
      message: "로그인이 필요합니다."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(
      `
      UPDATE SNS_USER_NOTI
      SET
        DM_NOTI = :dmNoti,
        COMMENT_NOTI = :commentNoti,
        FOLLOW_NOTI = :followNoti,
        LIKE_NOTI = :likeNoti,
        UDATE = SYSDATE
      WHERE USER_ID = :userId
      `,
      { userId, dmNoti, commentNoti, followNoti, likeNoti },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "알림 설정이 저장되었습니다."
    });
  } catch (err) {
    console.error("Noti update error", err);

    res.status(500).json({
      result: "fail",
      message: "알림 설정 저장 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 비밀번호 변경
router.put("/password", async (req, res) => {
  const { userId, currentPassword, newPassword, confirmPassword } = req.body;

  if (!userId || !currentPassword || !newPassword || !confirmPassword) {
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

    const result = await connection.execute(
      `
      SELECT USER_PWD
      FROM SNS_USERS
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "회원 정보를 찾을 수 없습니다."
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].USER_PWD);

    if (!isMatch) {
      return res.status(401).json({
        result: "fail",
        message: "현재 비밀번호가 일치하지 않습니다."
      });
    }

    const hashedPwd = await bcrypt.hash(newPassword, 10);

    await connection.execute(
      `
      UPDATE SNS_USERS
      SET USER_PWD = :hashedPwd,
          UDATE = SYSDATE
      WHERE USER_ID = :userId
      `,
      { hashedPwd, userId },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "비밀번호가 변경되었습니다."
    });
  } catch (err) {
    console.error("Password update error", err);

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

// 전화번호 변경 인증번호 발송
router.post("/phone/send-code", async (req, res) => {
  const { newPhone } = req.body;

  if (!newPhone) {
    return res.status(400).json({
      result: "fail",
      message: "변경할 전화번호를 입력해주세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const activeCodeResult = await connection.execute(
      `
      SELECT *
      FROM SNS_AUTH_CODE
      WHERE USER_PHONE = :newPhone
        AND AUTH_STATUS = 'N'
        AND EXPIRE_TIME > SYSDATE
      ORDER BY AUTH_ID DESC
      FETCH FIRST 1 ROWS ONLY
      `,
      { newPhone },
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
        :newPhone,
        :authCode,
        'N',
        SYSDATE + (5 / 1440),
        SYSDATE
      )
      `,
      { newPhone, authCode },
      { autoCommit: true }
    );

    await messageService.send({
      to: newPhone,
      from: process.env.SOLAPI_FROM,
      text: `[SO:LO] 전화번호 변경 인증번호는 [${authCode}] 입니다.`
    });

    res.json({
      result: "success",
      message: "인증번호가 발송되었습니다."
    });
  } catch (err) {
    console.error("Phone code send error", err);

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

// 전화번호 변경
router.put("/phone", async (req, res) => {
  const { userId, newPhone, authCode } = req.body;

  if (!userId || !newPhone || !authCode) {
    return res.status(400).json({
      result: "fail",
      message: "전화번호와 인증번호를 입력해주세요."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const codeResult = await connection.execute(
      `
      SELECT *
      FROM SNS_AUTH_CODE
      WHERE USER_PHONE = :newPhone
        AND AUTH_STATUS = 'N'
      ORDER BY AUTH_ID DESC
      FETCH FIRST 1 ROWS ONLY
      `,
      { newPhone },
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

    if (new Date(codeInfo.EXPIRE_TIME) < new Date()) {
      return res.status(400).json({
        result: "fail",
        message: "인증번호가 만료되었습니다."
      });
    }

    await connection.execute(
      `
      UPDATE SNS_USERS
      SET USER_PHONE = :newPhone,
          UDATE = SYSDATE
      WHERE USER_ID = :userId
      `,
      { newPhone, userId },
      { autoCommit: false }
    );

    await connection.execute(
      `
      UPDATE SNS_AUTH_CODE
      SET AUTH_STATUS = 'Y'
      WHERE AUTH_ID = :authId
      `,
      { authId: codeInfo.AUTH_ID },
      { autoCommit: false }
    );

    await connection.commit();

    res.json({
      result: "success",
      message: "전화번호가 변경되었습니다."
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Phone update error", err);

    res.status(500).json({
      result: "fail",
      message: "전화번호 변경 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 비즈니스 계정 전환
router.put("/business", async (req, res) => {
  const { userId } = req.body;

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(
      `
      UPDATE SNS_USERS
      SET USER_BIZ = 'Y',
          UDATE = SYSDATE
      WHERE USER_ID = :userId
      `,
      { userId },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "비즈니스 계정으로 전환되었습니다."
    });
  } catch (err) {
    console.error("Business update error", err);

    res.status(500).json({
      result: "fail",
      message: "비즈니스 계정 전환 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 차단 해제
router.delete("/block/:blockNo", async (req, res) => {
  const { blockNo } = req.params;

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(
      `
      DELETE FROM SNS_USER_BLOCK
      WHERE BLOCK_NO = :blockNo
      `,
      { blockNo },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "차단이 해제되었습니다."
    });
  } catch (err) {
    console.error("Block delete error", err);

    res.status(500).json({
      result: "fail",
      message: "차단 해제 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 회원 탈퇴
router.put("/withdraw", async (req, res) => {
  const { userId } = req.body;

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(
      `
      UPDATE SNS_USERS
      SET USER_STATUS = 'DEL',
          UDATE = SYSDATE
      WHERE USER_ID = :userId
      `,
      { userId },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "탈퇴 처리되었습니다."
    });
  } catch (err) {
    console.error("Withdraw error", err);

    res.status(500).json({
      result: "fail",
      message: "탈퇴 처리 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;