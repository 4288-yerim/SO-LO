const express = require("express");
const router = express.Router();
const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// 알림 목록 조회
router.get("/", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { type = "ALL" } = req.query;

    const allowTypeList = ["ALL", "FLW", "CMT", "LKE", "DM"];

    if (!allowTypeList.includes(type)) {
      return res.status(400).json({
        result: "fail",
        message: "잘못된 알림 타입입니다."
      });
    }

    const typeCondition =
      type === "ALL" ? "" : "AND TRIM(N.NOTI_TYPE) = :type";

    const bindParams =
      type === "ALL"
        ? { loginUserId }
        : { loginUserId, type };

    const result = await connection.execute(
      `
      SELECT
        N.NOTI_NO,
        N.USER_ID,
        N.SENDER_ID,
        N.NOTI_TYPE,
        N.TARGET_TYPE,
        N.TARGET_ID,
        N.CONTENT,
        N.READ_YN,
        N.CDATE,
        U.USER_NICKNAME,
        U.PROFILE_IMG,
        R.REQUEST_NO
      FROM SNS_NOTIFICATION N
      LEFT JOIN SNS_USERS U
        ON N.SENDER_ID = U.USER_ID
      LEFT JOIN SNS_FOLLOW_REQUEST R
        ON N.NOTI_TYPE = 'FLW'
       AND R.REQUESTER_ID = N.SENDER_ID
       AND R.RECEIVER_ID = N.USER_ID
       AND R.REQUEST_STATUS = 'REQ'
      WHERE N.USER_ID = :loginUserId
        ${typeCondition}
      ORDER BY N.CDATE DESC
      `,
      bindParams,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({
      result: "success",
      notificationList: result.rows.map((noti) => ({
        notiNo: noti.NOTI_NO,
        userId: noti.USER_ID,
        senderId: noti.SENDER_ID,
        senderNickname: noti.USER_NICKNAME,
        senderProfileImg: noti.PROFILE_IMG
          ? `http://localhost:3010${noti.PROFILE_IMG}`
          : null,
        notiType: noti.NOTI_TYPE ? noti.NOTI_TYPE.trim() : "",
        targetType: noti.TARGET_TYPE ? noti.TARGET_TYPE.trim() : "",
        targetId: noti.TARGET_ID,
        content: noti.CONTENT,
        readYn: noti.READ_YN,
        cdate: noti.CDATE,
        requestNo: noti.REQUEST_NO || null
      }))
    });
  } catch (err) {
    console.error("Notification list error:", err);

    res.status(500).json({
      result: "fail",
      message: "알림 목록을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 읽지 않은 알림 개수 조회
router.get("/unread-count", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;

    const result = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_NOTIFICATION
      WHERE USER_ID = :loginUserId
        AND READ_YN = 'N'
      `,
      { loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      unreadCount: result.rows[0].CNT
    });
  } catch (err) {
    console.error("Notification unread count error:", err);

    res.status(500).json({
      result: "fail",
      message: "읽지 않은 알림 수를 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 모든 알림 읽음 처리
router.put("/read-all", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;

    await connection.execute(
      `
      UPDATE SNS_NOTIFICATION
      SET READ_YN = 'Y'
      WHERE USER_ID = :loginUserId
        AND READ_YN = 'N'
      `,
      { loginUserId },
      { autoCommit: true }
    );

    res.json({
      result: "success"
    });
  } catch (err) {
    console.error("Notification read all error:", err);

    res.status(500).json({
      result: "fail",
      message: "모든 알림 읽음 처리에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 알림 읽음 처리
router.put("/:notiNo/read", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { notiNo } = req.params;

    await connection.execute(
      `
      UPDATE SNS_NOTIFICATION
      SET READ_YN = 'Y'
      WHERE NOTI_NO = :notiNo
        AND USER_ID = :loginUserId
      `,
      { notiNo, loginUserId },
      { autoCommit: true }
    );

    res.json({
      result: "success"
    });
  } catch (err) {
    console.error("Notification read error:", err);

    res.status(500).json({
      result: "fail",
      message: "알림 읽음 처리에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 팔로우 요청 목록 조회
router.get("/follow-requests", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;

    const result = await connection.execute(
      `
      SELECT
        R.REQUEST_NO,
        R.REQUESTER_ID,
        U.USER_NICKNAME,
        U.PROFILE_IMG,
        U.RELATION_BADGE,
        R.CDATE
      FROM SNS_FOLLOW_REQUEST R
      JOIN SNS_USERS U
        ON R.REQUESTER_ID = U.USER_ID
      WHERE R.RECEIVER_ID = :loginUserId
        AND R.REQUEST_STATUS = 'REQ'
        AND U.USER_STATUS = 'ACT'
      ORDER BY R.CDATE DESC
      `,
      { loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      requestList: result.rows.map((request) => ({
        requestNo: request.REQUEST_NO,
        userId: request.REQUESTER_ID,
        userNickname: request.USER_NICKNAME,
        profileImg: request.PROFILE_IMG
          ? `http://localhost:3010${request.PROFILE_IMG}`
          : null,
        relationBadge: request.RELATION_BADGE || "ALL",
        cdate: request.CDATE
      }))
    });
  } catch (err) {
    console.error("Follow request list error:", err);

    res.status(500).json({
      result: "fail",
      message: "팔로우 요청 목록을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 팔로우 요청 승인
router.post("/follow-requests/:requestNo/approve", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { requestNo } = req.params;

    const requestResult = await connection.execute(
      `
      SELECT
        REQUEST_NO,
        REQUESTER_ID,
        RECEIVER_ID
      FROM SNS_FOLLOW_REQUEST
      WHERE REQUEST_NO = :requestNo
        AND REQUEST_STATUS = 'REQ'
      `,
      { requestNo },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "존재하지 않는 팔로우 요청입니다."
      });
    }

    const request = requestResult.rows[0];

    if (request.RECEIVER_ID !== loginUserId) {
      return res.status(403).json({
        result: "fail",
        message: "처리할 수 없는 요청입니다."
      });
    }

    const followCheckResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_FOLLOWS
      WHERE FOLLOWER_ID = :requesterId
        AND FOLLOWING_ID = :receiverId
      `,
      {
        requesterId: request.REQUESTER_ID,
        receiverId: request.RECEIVER_ID
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (followCheckResult.rows[0].CNT === 0) {
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
          :requesterId,
          :receiverId,
          SYSDATE
        )
        `,
        {
          requesterId: request.REQUESTER_ID,
          receiverId: request.RECEIVER_ID
        },
        { autoCommit: false }
      );
    }

    await connection.execute(
      `
      UPDATE SNS_FOLLOW_REQUEST
      SET
        REQUEST_STATUS = 'APR',
        UDATE = SYSDATE
      WHERE REQUEST_NO = :requestNo
      `,
      { requestNo },
      { autoCommit: false }
    );

    await connection.commit();

    res.json({
      result: "success",
      message: "팔로우 요청을 승인했습니다."
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Follow request approve error:", err);

    res.status(500).json({
      result: "fail",
      message: "팔로우 요청 승인 중 오류가 발생했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 팔로우 요청 거절
router.post("/follow-requests/:requestNo/reject", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { requestNo } = req.params;

    const result = await connection.execute(
      `
      UPDATE SNS_FOLLOW_REQUEST
      SET
        REQUEST_STATUS = 'REJ',
        UDATE = SYSDATE
      WHERE REQUEST_NO = :requestNo
        AND RECEIVER_ID = :loginUserId
        AND REQUEST_STATUS = 'REQ'
      `,
      {
        requestNo,
        loginUserId
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        result: "fail",
        message: "존재하지 않는 팔로우 요청입니다."
      });
    }

    res.json({
      result: "success",
      message: "팔로우 요청을 거절했습니다."
    });
  } catch (err) {
    console.error("Follow request reject error:", err);

    res.status(500).json({
      result: "fail",
      message: "팔로우 요청 거절 중 오류가 발생했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;