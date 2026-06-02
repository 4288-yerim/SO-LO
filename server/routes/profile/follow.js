const express = require("express");
const router = express.Router();

const { oracledb, dbConfig } = require("../../db");
const authMiddleware = require("../../middleware/authMiddleware");

// 프로필 내용 공개 여부 확인
async function checkCanViewProfileContents(
  connection,
  loginUserId,
  profileUserId
) {
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

  if (userResult.rows.length === 0) {
    return false;
  }

  const accountVisible =
    userResult.rows[0].ACCOUNT_VISIBLE || "PUB";

  if (loginUserId === profileUserId) {
    return true;
  }

  if (accountVisible === "PUB") {
    return true;
  }

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

// 팔로워 목록 조회
router.get("/:userId/followers", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;

    const canView = await checkCanViewProfileContents(connection, loginUserId, userId);

    if (!canView) {
      return res.json({
        result: "fail",
        message: "비공개 계정의 팔로워 목록은 볼 수 없습니다.",
        list: []
      });
    }

    const result = await connection.execute(
      `
      SELECT
        U.USER_ID,
        U.USER_NICKNAME,
        U.PROFILE_IMG,
        U.RELATION_BADGE
      FROM SNS_FOLLOWS F
      JOIN SNS_USERS U
        ON F.FOLLOWER_ID = U.USER_ID
      WHERE F.FOLLOWING_ID = :userId
        AND U.USER_STATUS = 'ACT'
      ORDER BY F.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      list: result.rows.map((user) => ({
        userId: user.USER_ID,
        userNickname: user.USER_NICKNAME,
        profileImg: user.PROFILE_IMG
          ? `http://localhost:3010${user.PROFILE_IMG}`
          : null,
        relationBadge: user.RELATION_BADGE || "ALL"
      }))
    });
  } catch (err) {
    console.error("Follower list error:", err);

    res.status(500).json({
      result: "fail",
      message: "팔로워 목록을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 팔로잉 목록 조회
router.get("/:userId/followings", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;

    const canView = await checkCanViewProfileContents(connection, loginUserId, userId);

    if (!canView) {
      return res.json({
        result: "fail",
        message: "비공개 계정의 팔로잉 목록은 볼 수 없습니다.",
        list: []
      });
    }

    const result = await connection.execute(
      `
      SELECT
        U.USER_ID,
        U.USER_NICKNAME,
        U.PROFILE_IMG,
        U.RELATION_BADGE
      FROM SNS_FOLLOWS F
      JOIN SNS_USERS U
        ON F.FOLLOWING_ID = U.USER_ID
      WHERE F.FOLLOWER_ID = :userId
        AND U.USER_STATUS = 'ACT'
      ORDER BY F.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      list: result.rows.map((user) => ({
        userId: user.USER_ID,
        userNickname: user.USER_NICKNAME,
        profileImg: user.PROFILE_IMG
          ? `http://localhost:3010${user.PROFILE_IMG}`
          : null,
        relationBadge: user.RELATION_BADGE || "ALL"
      }))
    });
  } catch (err) {
    console.error("Following list error:", err);

    res.status(500).json({
      result: "fail",
      message: "팔로잉 목록을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 팔로우 / 팔로우 취소 / 팔로우 요청 / 요청 취소
router.post("/:userId/follow", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { userId } = req.params;

    if (loginUserId === userId) {
      return res.status(400).json({
        result: "fail",
        message: "자기 자신은 팔로우할 수 없습니다."
      });
    }

    const userResult = await connection.execute(
      `
      SELECT USER_ID, ACCOUNT_VISIBLE
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

    const accountVisible = userResult.rows[0].ACCOUNT_VISIBLE || "PUB";

    const followResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_FOLLOWS
      WHERE FOLLOWER_ID = :loginUserId
        AND FOLLOWING_ID = :userId
      `,
      { loginUserId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const isFollowing = followResult.rows[0].CNT > 0;

    // 이미 팔로우 중이면 팔로우 취소
    if (isFollowing) {
      await connection.execute(
        `
        DELETE FROM SNS_FOLLOWS
        WHERE FOLLOWER_ID = :loginUserId
          AND FOLLOWING_ID = :userId
        `,
        { loginUserId, userId },
        { autoCommit: false }
      );

      await connection.commit();

      return res.json({
        result: "success",
        followStatus: "NONE",
        isFollowing: false,
        message: "팔로우를 취소했습니다."
      });
    }

    // 이미 요청 중이면 요청 취소
    const requestResult = await connection.execute(
      `
      SELECT REQUEST_NO
      FROM SNS_FOLLOW_REQUEST
      WHERE REQUESTER_ID = :loginUserId
        AND RECEIVER_ID = :userId
        AND REQUEST_STATUS = 'REQ'
      `,
      { loginUserId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (requestResult.rows.length > 0) {
      await connection.execute(
        `
        DELETE FROM SNS_FOLLOW_REQUEST
        WHERE REQUESTER_ID = :loginUserId
          AND RECEIVER_ID = :userId
          AND REQUEST_STATUS = 'REQ'
        `,
        { loginUserId, userId },
        { autoCommit: false }
      );

      await connection.commit();

      return res.json({
        result: "success",
        followStatus: "NONE",
        isFollowing: false,
        message: "팔로우 요청을 취소했습니다."
      });
    }

    // 공개 계정이면 바로 팔로우
    if (accountVisible === "PUB") {
      await connection.execute(
      `
      INSERT INTO SNS_FOLLOWS (
        FOLLOW_NO,
        FOLLOWER_ID,
        FOLLOWING_ID,
        CDATE
      )
      VALUES (
        SEQ_SNS_FOLLOWS.NEXTVAL,
        :loginUserId,
        :userId,
        SYSDATE
      )
      `,
      { loginUserId, userId },
      { autoCommit: false }
    );

    const notiSettingResult = await connection.execute(
      `
      SELECT FOLLOW_NOTI
      FROM SNS_USER_NOTI
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const followNoti =
      notiSettingResult.rows.length > 0
        ? notiSettingResult.rows[0].FOLLOW_NOTI
        : "Y";

    if (followNoti === "Y") {
      await connection.execute(
        `
        INSERT INTO SNS_NOTIFICATION (
          NOTI_NO,
          USER_ID,
          SENDER_ID,
          NOTI_TYPE,
          TARGET_TYPE,
          TARGET_ID,
          CONTENT,
          READ_YN,
          CDATE
        )
        VALUES (
          SEQ_SNS_NOTIFICATION.NEXTVAL,
          :userId,
          :loginUserId,
          'FLW',
          'USR',
          NULL,
          '님이 회원님을 팔로우했습니다.',
          'N',
          SYSDATE
        )
        `,
        { userId, loginUserId },
        { autoCommit: false }
      );
    }

    await connection.commit();

      return res.json({
        result: "success",
        followStatus: "FOLLOWING",
        isFollowing: true,
        message: "팔로우했습니다."
      });
    }

    // 비공개 계정이면 팔로우 요청
    await connection.execute(
      `
      INSERT INTO SNS_FOLLOW_REQUEST (
        REQUEST_NO,
        REQUESTER_ID,
        RECEIVER_ID,
        REQUEST_STATUS,
        CDATE
      )
      VALUES (
        SEQ_SNS_FOLLOW_REQUEST.NEXTVAL,
        :loginUserId,
        :userId,
        'REQ',
        SYSDATE
      )
      `,
      { loginUserId, userId },
      { autoCommit: false }
    );

   const notiSettingResult = await connection.execute(
      `
      SELECT FOLLOW_NOTI
      FROM SNS_USER_NOTI
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const followNoti =
      notiSettingResult.rows.length > 0
        ? notiSettingResult.rows[0].FOLLOW_NOTI
        : "Y";

    if (followNoti === "Y") {
      await connection.execute(
        `
        INSERT INTO SNS_NOTIFICATION (
          NOTI_NO,
          USER_ID,
          SENDER_ID,
          NOTI_TYPE,
          TARGET_TYPE,
          TARGET_ID,
          CONTENT,
          READ_YN,
          CDATE
        )
        VALUES (
          SEQ_SNS_NOTIFICATION.NEXTVAL,
          :userId,
          :loginUserId,
          'FLW',
          'USR',
          NULL,
          '님이 팔로우를 요청했습니다.',
          'N',
          SYSDATE
        )
        `,
        { userId, loginUserId },
        { autoCommit: false }
      );
    }

    await connection.commit();

    return res.json({
      result: "success",
      followStatus: "REQUESTED",
      isFollowing: false,
      message: "팔로우 요청을 보냈습니다."
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Follow toggle error:", err);

    res.status(500).json({
      result: "fail",
      message: "팔로우 처리 중 오류가 발생했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;