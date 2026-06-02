const express = require("express");
const router = express.Router();

const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// DM 방 생성 또는 기존 방 조회
router.post("/room", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        result: "fail",
        message: "상대 사용자 정보가 없습니다."
      });
    }

    if (loginUserId === targetUserId) {
      return res.status(400).json({
        result: "fail",
        message: "내 프로필에는 메시지를 보낼 수 없습니다."
      });
    }

    const targetResult = await connection.execute(
      `
      SELECT USER_ID, ACCOUNT_VISIBLE
      FROM SNS_USERS
      WHERE USER_ID = :targetUserId
        AND USER_STATUS = 'ACT'
      `,
      { targetUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (targetResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "존재하지 않는 사용자입니다."
      });
    }

    const targetUser = targetResult.rows[0];

    if (targetUser.ACCOUNT_VISIBLE === "PRV") {
      const followResult = await connection.execute(
        `
        SELECT COUNT(*) AS CNT
        FROM SNS_FOLLOWS
        WHERE FOLLOWER_ID = :loginUserId
          AND FOLLOWING_ID = :targetUserId
        `,
        { loginUserId, targetUserId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (followResult.rows[0].CNT === 0) {
        return res.status(403).json({
          result: "fail",
          message: "비공개 계정은 팔로워만 메시지를 보낼 수 있습니다."
        });
      }
    }

    const roomResult = await connection.execute(
      `
      SELECT ROOM_NO
      FROM SNS_DM_ROOM_USER
      WHERE USER_ID IN (:loginUserId, :targetUserId)
      GROUP BY ROOM_NO
      HAVING COUNT(DISTINCT USER_ID) = 2
         AND COUNT(*) = 2
      `,
      { loginUserId, targetUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (roomResult.rows.length > 0) {
      return res.json({
        result: "success",
        roomNo: roomResult.rows[0].ROOM_NO
      });
    }

    const newRoomResult = await connection.execute(
      `
      INSERT INTO SNS_DM_ROOM (
        ROOM_NO
      ) VALUES (
        SEQ_SNS_DM_ROOM.NEXTVAL
      )
      RETURNING ROOM_NO INTO :roomNo
      `,
      {
        roomNo: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER
        }
      },
      { autoCommit: false }
    );

    const roomNo = newRoomResult.outBinds.roomNo[0];

    await connection.execute(
      `
      INSERT INTO SNS_DM_ROOM_USER (
        ROOM_USER_NO,
        USER_ID,
        ROOM_NO
      ) VALUES (
        SEQ_SNS_DM_ROOM_USER.NEXTVAL,
        :loginUserId,
        :roomNo
      )
      `,
      { loginUserId, roomNo },
      { autoCommit: false }
    );

    await connection.execute(
      `
      INSERT INTO SNS_DM_ROOM_USER (
        ROOM_USER_NO,
        USER_ID,
        ROOM_NO
      ) VALUES (
        SEQ_SNS_DM_ROOM_USER.NEXTVAL,
        :targetUserId,
        :roomNo
      )
      `,
      { targetUserId, roomNo },
      { autoCommit: false }
    );

    await connection.commit();

    res.json({
      result: "success",
      roomNo
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("DM room create error:", err);

    res.status(500).json({
      result: "fail",
      message: "메시지 방을 만들지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// DM 방 목록
router.get("/rooms", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;

    const result = await connection.execute(
      `
      SELECT
        R.ROOM_NO,
        U.USER_ID AS OTHER_USER_ID,
        U.USER_NICKNAME AS OTHER_NICKNAME,
        U.PROFILE_IMG AS OTHER_PROFILE_IMG,
        (
          SELECT DBMS_LOB.SUBSTR(M.MESSAGE, 1000, 1)
          FROM SNS_DM_MESSAGE M
          WHERE M.ROOM_NO = R.ROOM_NO
          ORDER BY M.CDATE DESC
          FETCH FIRST 1 ROWS ONLY
        ) AS LAST_MESSAGE,
        (
          SELECT M.CDATE
          FROM SNS_DM_MESSAGE M
          WHERE M.ROOM_NO = R.ROOM_NO
          ORDER BY M.CDATE DESC
          FETCH FIRST 1 ROWS ONLY
        ) AS LAST_MESSAGE_DATE,
        (
          SELECT COUNT(*)
          FROM SNS_DM_MESSAGE M
          WHERE M.ROOM_NO = R.ROOM_NO
            AND M.USER_ID <> :loginUserId
            AND M.MESSAGE_NO > NVL(RU.LAST_READ_MESSAGE_NO, 0)
        ) AS UNREAD_COUNT
      FROM SNS_DM_ROOM R
      JOIN SNS_DM_ROOM_USER RU
        ON R.ROOM_NO = RU.ROOM_NO
       AND RU.USER_ID = :loginUserId
      JOIN SNS_DM_ROOM_USER ORU
        ON R.ROOM_NO = ORU.ROOM_NO
       AND ORU.USER_ID <> :loginUserId
      JOIN SNS_USERS U
        ON ORU.USER_ID = U.USER_ID
      WHERE U.USER_STATUS = 'ACT'
      ORDER BY NVL(
        (
          SELECT MAX(M.CDATE)
          FROM SNS_DM_MESSAGE M
          WHERE M.ROOM_NO = R.ROOM_NO
        ),
        R.CDATE
      ) DESC
      `,
      { loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const roomList = result.rows.map((room) => ({
      roomNo: room.ROOM_NO,
      otherUserId: room.OTHER_USER_ID,
      otherNickname: room.OTHER_NICKNAME,
      otherProfileImg: room.OTHER_PROFILE_IMG
        ? `http://localhost:3010${room.OTHER_PROFILE_IMG}`
        : null,
      lastMessage: room.LAST_MESSAGE || "",
      lastMessageDate: room.LAST_MESSAGE_DATE,
      unreadCount: room.UNREAD_COUNT || 0
    }));

    res.json({
      result: "success",
      roomList
    });
  } catch (err) {
    console.error("DM room list error:", err);

    res.status(500).json({
      result: "fail",
      message: "메시지 목록을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 메시지 조회
router.get("/rooms/:roomNo/messages", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { roomNo } = req.params;

    const memberResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_DM_ROOM_USER
      WHERE ROOM_NO = :roomNo
        AND USER_ID = :loginUserId
      `,
      { roomNo, loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (memberResult.rows[0].CNT === 0) {
      return res.status(403).json({
        result: "fail",
        message: "접근할 수 없는 메시지 방입니다."
      });
    }

    const result = await connection.execute(
      `
      SELECT
        M.MESSAGE_NO,
        M.USER_ID,
        U.USER_NICKNAME,
        U.PROFILE_IMG,
        DBMS_LOB.SUBSTR(M.MESSAGE, 4000, 1) AS MESSAGE,
        M.READ_YN,
        M.CDATE
      FROM SNS_DM_MESSAGE M
      JOIN SNS_USERS U
        ON M.USER_ID = U.USER_ID
      WHERE M.ROOM_NO = :roomNo
      ORDER BY M.CDATE ASC
      `,
      { roomNo },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const messageList = result.rows.map((message) => ({
      messageNo: message.MESSAGE_NO,
      userId: message.USER_ID,
      userNickname: message.USER_NICKNAME,
      profileImg: message.PROFILE_IMG
        ? `http://localhost:3010${message.PROFILE_IMG}`
        : null,
      message: message.MESSAGE,
      readYn: message.READ_YN,
      cdate: message.CDATE
    }));

    res.json({
      result: "success",
      messageList
    });
  } catch (err) {
    console.error("DM message list error:", err);

    res.status(500).json({
      result: "fail",
      message: "메시지를 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// DM 읽음 처리
router.put("/rooms/:roomNo/read", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { roomNo } = req.params;

    const memberResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_DM_ROOM_USER
      WHERE ROOM_NO = :roomNo
        AND USER_ID = :loginUserId
      `,
      { roomNo, loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (memberResult.rows[0].CNT === 0) {
      return res.status(403).json({
        result: "fail",
        message: "접근할 수 없는 메시지 방입니다."
      });
    }

    const lastMessageResult = await connection.execute(
      `
      SELECT MAX(MESSAGE_NO) AS LAST_MESSAGE_NO
      FROM SNS_DM_MESSAGE
      WHERE ROOM_NO = :roomNo
      `,
      { roomNo },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const lastMessageNo = lastMessageResult.rows[0].LAST_MESSAGE_NO || 0;

    await connection.execute(
      `
      UPDATE SNS_DM_ROOM_USER
      SET LAST_READ_MESSAGE_NO = :lastMessageNo
      WHERE ROOM_NO = :roomNo
        AND USER_ID = :loginUserId
      `,
      {
        lastMessageNo,
        roomNo,
        loginUserId
      },
      { autoCommit: true }
    );

    const io = req.app.get("io");

    if (io) {
      io.to(`dm-${roomNo}`).emit("readMessage", {
        roomNo: Number(roomNo),
        userId: loginUserId,
        lastReadMessageNo: lastMessageNo
      });
    }

    res.json({
      result: "success",
      lastReadMessageNo: lastMessageNo
    });
  } catch (err) {
    console.error("DM read error:", err);

    res.status(500).json({
      result: "fail",
      message: "읽음 처리에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 메시지 전송
router.post("/rooms/:roomNo/messages", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { roomNo } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        result: "fail",
        message: "메시지를 입력해주세요."
      });
    }

    const memberResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_DM_ROOM_USER
      WHERE ROOM_NO = :roomNo
        AND USER_ID = :loginUserId
      `,
      { roomNo, loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (memberResult.rows[0].CNT === 0) {
      return res.status(403).json({
        result: "fail",
        message: "접근할 수 없는 메시지 방입니다."
      });
    }

    const insertResult = await connection.execute(
      `
      INSERT INTO SNS_DM_MESSAGE (
        MESSAGE_NO,
        USER_ID,
        ROOM_NO,
        MESSAGE
      ) VALUES (
        SEQ_SNS_DM_MESSAGE.NEXTVAL,
        :loginUserId,
        :roomNo,
        :message
      )
      RETURNING MESSAGE_NO, CDATE INTO :messageNo, :cdate
      `,
      {
        loginUserId,
        roomNo,
        message: message.trim(),
        messageNo: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER
        },
        cdate: {
          dir: oracledb.BIND_OUT,
          type: oracledb.DATE
        }
      },
      { autoCommit: true }
    );

    const newMessage = {
      messageNo: insertResult.outBinds.messageNo[0],
      userId: loginUserId,
      message: message.trim(),
      readYn: "N",
      cdate: insertResult.outBinds.cdate[0]
    };

    const targetUserResult = await connection.execute(
      `
      SELECT USER_ID
      FROM SNS_DM_ROOM_USER
      WHERE ROOM_NO = :roomNo
        AND USER_ID <> :loginUserId
      `,
      {
        roomNo,
        loginUserId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (targetUserResult.rows.length > 0) {
      const targetUserId = targetUserResult.rows[0].USER_ID;

      const notiSettingResult = await connection.execute(
        `
        SELECT DM_NOTI
        FROM SNS_USER_NOTI
        WHERE USER_ID = :targetUserId
        `,
        { targetUserId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const dmNoti =
        notiSettingResult.rows.length > 0
          ? notiSettingResult.rows[0].DM_NOTI
          : "Y";

      if (dmNoti === "Y") {
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
            :targetUserId,
            :loginUserId,
            'DM',
            'DMR',
            :roomNo,
            '님이 메시지를 보냈습니다.',
            'N',
            SYSDATE
          )
          `,
          {
            targetUserId,
            loginUserId,
            roomNo
          },
          { autoCommit: false }
        );
      }
    }

    await connection.commit();

    const io = req.app.get("io");

    io.to(`dm-${roomNo}`).emit("receiveMessage", {
      roomNo: Number(roomNo),
      message: newMessage
    });

    res.json({
      result: "success",
      message: newMessage
    });
  } catch (err) {
    console.error("DM message send error:", err);

    res.status(500).json({
      result: "fail",
      message: "메시지를 보내지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;