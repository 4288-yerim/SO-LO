const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const { oracledb, dbConfig } = require("../../db");
const authMiddleware = require("../../middleware/authMiddleware");

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profile");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("프로필 사진은 이미지 파일만 업로드할 수 있습니다."));
    }

    cb(null, true);
  }
});

// 프로필 내용 공개 여부 확인
async function checkCanViewProfileContents(connection, loginUserId, profileUserId) {
  const userResult = await connection.execute(
    `
    SELECT ACCOUNT_VISIBLE
    FROM SNS_USERS
    WHERE USER_ID = :profileUserId
      AND USER_STATUS = 'ACT'
    `,
    { profileUserId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (userResult.rows.length === 0) return false;

  const accountVisible = userResult.rows[0].ACCOUNT_VISIBLE || "PUB";

  if (loginUserId === profileUserId) return true;
  if (accountVisible === "PUB") return true;

  const followResult = await connection.execute(
    `
    SELECT COUNT(*) AS CNT
    FROM SNS_FOLLOWS
    WHERE FOLLOWER_ID = :loginUserId
      AND FOLLOWING_ID = :profileUserId
    `,
    { loginUserId, profileUserId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return followResult.rows[0].CNT > 0;
}

// 프로필 헤더 조회
router.get("/:userId", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;

    const userResult = await connection.execute(
      `
      SELECT
        USER_ID,
        USER_NICKNAME,
        USER_INTRO,
        PROFILE_IMG,
        RELATION_BADGE,
        ACCOUNT_VISIBLE
      FROM SNS_USERS
      WHERE USER_ID = :userId
        AND USER_STATUS = 'ACT'
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "존재하지 않는 사용자입니다."
      });
    }

    const user = userResult.rows[0];

    const canViewProfileContents = await checkCanViewProfileContents(
      connection,
      loginUserId,
      userId
    );

    let isFollowing = false;
    let followStatus = "NONE";

    if (loginUserId !== userId) {
      const followCheckResult = await connection.execute(
        `
        SELECT COUNT(*) AS CNT
        FROM SNS_FOLLOWS
        WHERE FOLLOWER_ID = :loginUserId
          AND FOLLOWING_ID = :userId
        `,
        { loginUserId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      isFollowing = followCheckResult.rows[0].CNT > 0;

      if (isFollowing) {
        followStatus = "FOLLOWING";
      } else {
        const requestCheckResult = await connection.execute(
          `
          SELECT REQUEST_STATUS
          FROM SNS_FOLLOW_REQUEST
          WHERE REQUESTER_ID = :loginUserId
            AND RECEIVER_ID = :userId
            AND REQUEST_STATUS = 'REQ'
          `,
          { loginUserId, userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (requestCheckResult.rows.length > 0) {
          followStatus = "REQUESTED";
        }
      }
    }

    const postCountResult = await connection.execute(
      `
      SELECT COUNT(*) AS POST_COUNT
      FROM SNS_POST
      WHERE USER_ID = :userId
        AND FEED_STATUS = 'ACT'
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const followerCountResult = await connection.execute(
      `
      SELECT COUNT(*) AS FOLLOWER_COUNT
      FROM SNS_FOLLOWS
      WHERE FOLLOWING_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const followingCountResult = await connection.execute(
      `
      SELECT COUNT(*) AS FOLLOWING_COUNT
      FROM SNS_FOLLOWS
      WHERE FOLLOWER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const profile = {
      userId: user.USER_ID,
      userNickname: user.USER_NICKNAME,
      userIntro: user.USER_INTRO || "",
      profileImg: user.PROFILE_IMG
        ? `http://localhost:3010${user.PROFILE_IMG}`
        : null,
      relationBadge: user.RELATION_BADGE || "ALL",
      accountVisible: user.ACCOUNT_VISIBLE || "PUB",
      postCount: postCountResult.rows[0].POST_COUNT,
      followerCount: followerCountResult.rows[0].FOLLOWER_COUNT,
      followingCount: followingCountResult.rows[0].FOLLOWING_COUNT,
      isFollowing,
      followStatus
    };

    res.json({
      result: "success",
      profile,
      canViewProfileContents
    });
  } catch (err) {
    console.error("Profile header error:", err);

    res.status(500).json({
      result: "fail",
      message: "프로필을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 프로필 수정
router.put("/", authMiddleware, profileUpload.single("profileImg"), async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { userNickname, userIntro, deleteProfileImg } = req.body;

    const nicknameRegex = /^[a-zA-Z0-9._]{2,20}$/;

    if (!nicknameRegex.test(userNickname)) {
      return res.status(400).json({
        result: "fail",
        message: "닉네임은 영문, 숫자, _, . 만 가능하며 2~20자여야 합니다."
      });
    }

    const nicknameResult = await connection.execute(
      `
      SELECT USER_ID
      FROM SNS_USERS
      WHERE USER_NICKNAME = :userNickname
        AND USER_ID <> :loginUserId
      `,
      { userNickname, loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (nicknameResult.rows.length > 0) {
      return res.status(409).json({
        result: "fail",
        message: "이미 사용 중인 닉네임입니다."
      });
    }

    const currentProfileResult = await connection.execute(
      `
      SELECT PROFILE_IMG
      FROM SNS_USERS
      WHERE USER_ID = :loginUserId
      `,
      { loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const currentProfileImg =
      currentProfileResult.rows.length > 0
        ? currentProfileResult.rows[0].PROFILE_IMG
        : null;

    let newProfileImg = currentProfileImg;

    if (deleteProfileImg === "Y") {
      newProfileImg = null;
    }

    if (req.file) {
      newProfileImg = `/uploads/profile/${req.file.filename}`;
    }

    await connection.execute(
      `
      UPDATE SNS_USERS
      SET
        USER_NICKNAME = :userNickname,
        USER_INTRO = :userIntro,
        PROFILE_IMG = :profileImg
      WHERE USER_ID = :loginUserId
      `,
      {
        userNickname,
        userIntro: userIntro || "",
        profileImg: newProfileImg,
        loginUserId
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "프로필이 수정되었습니다.",
      profile: {
        userNickname,
        userIntro: userIntro || "",
        profileImg: newProfileImg
          ? `http://localhost:3010${newProfileImg}`
          : null
      }
    });
  } catch (err) {
    console.error("Profile update error:", err);

    res.status(500).json({
      result: "fail",
      message: err.message || "프로필 수정 중 오류가 발생했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;