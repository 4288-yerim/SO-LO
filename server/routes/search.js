const express = require("express");
const router = express.Router();

const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { saveUserActLog, updateTagAlgoYn } = require("./userActLog");

// 사용자 검색
router.get("/user", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const keyword = (req.query.keyword || "").trim();
    const loginUserId = req.user.userId;

    if (!keyword) {
      return res.json({
        result: "success",
        list: []
      });
    }

    const searchKeyword = `%${keyword.toLowerCase()}%`;

    const result = await connection.execute(
      `
      SELECT
        USER_ID,
        USER_NICKNAME,
        USER_INTRO,
        PROFILE_IMG
      FROM SNS_USERS
      WHERE USER_STATUS IN ('ACT', 'REP')
        AND USER_ID <> :loginUserId
        AND NOT EXISTS (
          SELECT 1
          FROM SNS_USER_BLOCK B
          WHERE
            (
              B.BLOCKER_ID = :loginUserId
              AND B.BLOCKED_ID = USER_ID
            )
            OR
            (
              B.BLOCKER_ID = USER_ID
              AND B.BLOCKED_ID = :loginUserId
            )
        )
        AND (
          LOWER(USER_NICKNAME) LIKE :searchKeyword
          OR LOWER(USER_INTRO) LIKE :searchKeyword
        )
      ORDER BY USER_NICKNAME
      FETCH FIRST 20 ROWS ONLY
      `,
      { searchKeyword, loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const list = result.rows.map((user) => ({
      userId: user.USER_ID,
      userNickname: user.USER_NICKNAME,
      userIntro: user.USER_INTRO || "",
      profileImg: user.PROFILE_IMG
        ? `http://localhost:3010${user.PROFILE_IMG}`
        : null
    }));

    res.json({
      result: "success",
      list
    });
  } catch (err) {
    console.error("User search error:", err);

    res.status(500).json({
      result: "fail",
      message: "검색 중 오류가 발생했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 기록 검색
router.get("/post", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const keyword = (req.query.keyword || "").trim();
    const loginUserId = req.user.userId;

    if (!keyword) {
      return res.json({
        result: "success",
        list: []
      });
    }

    const searchKeyword = `%${keyword.toLowerCase()}%`;

    const result = await connection.execute(
      `
      SELECT
        POST_NO,
        TITLE,
        FILE_PATH,
        FILE_TYPE,
        SEARCH_SCORE
      FROM (
        SELECT
          P.POST_NO,
          P.TITLE,
          F.FILE_PATH,
          F.FILE_TYPE,
          (
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM SNS_POST_TAG PT
                JOIN SNS_TAG T
                  ON PT.TAG_NO = T.TAG_NO
                WHERE PT.POST_NO = P.POST_NO
                  AND LOWER(T.TAG_NAME) LIKE :searchKeyword
              )
              THEN 5 ELSE 0
            END
            +
            CASE
              WHEN LOWER(P.TITLE) LIKE :searchKeyword
              THEN 3 ELSE 0
            END
            +
            CASE
              WHEN LOWER(P.PLACE_NAME) LIKE :searchKeyword
              THEN 3 ELSE 0
            END
            +
            CASE
              WHEN LOWER(P.PLACE_ADDRESS) LIKE :searchKeyword
              THEN 2 ELSE 0
            END
            +
            CASE
              WHEN LOWER(DBMS_LOB.SUBSTR(P.CONTENT, 4000, 1)) LIKE :searchKeyword
              THEN 1 ELSE 0
            END
          ) AS SEARCH_SCORE,
          P.CDATE
        FROM SNS_POST P
        JOIN SNS_USERS U
          ON P.USER_ID = U.USER_ID
        JOIN (
          SELECT
            POST_NO,
            FILE_PATH,
            FILE_TYPE,
            ROW_NUMBER() OVER (
              PARTITION BY POST_NO
              ORDER BY FILE_ORDER ASC
            ) AS RN
          FROM SNS_POST_FILE
        ) F
          ON P.POST_NO = F.POST_NO
         AND F.RN = 1
        WHERE U.USER_STATUS NOT IN ('BLK', 'DEL')
          AND P.FEED_STATUS != 'BLK'
          AND NOT EXISTS (
            SELECT 1
            FROM SNS_USER_BLOCK B
            WHERE
              (
                B.BLOCKER_ID = :loginUserId
                AND B.BLOCKED_ID = P.USER_ID
              )
              OR
              (
                B.BLOCKER_ID = P.USER_ID
                AND B.BLOCKED_ID = :loginUserId
              )
          )
          AND (
            U.ACCOUNT_VISIBLE = 'PUB'

            OR (
              U.ACCOUNT_VISIBLE = 'PRV'
              AND EXISTS (
                SELECT 1
                FROM SNS_FOLLOWS FOL
                WHERE FOL.FOLLOWER_ID = :loginUserId
                  AND FOL.FOLLOWING_ID = P.USER_ID
              )
            )

            OR P.USER_ID = :loginUserId
          )
      )
      WHERE SEARCH_SCORE > 0
      ORDER BY SEARCH_SCORE DESC, CDATE DESC
      FETCH FIRST 20 ROWS ONLY
      `,
      {
        searchKeyword,
        loginUserId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const list = result.rows.map((post) => ({
      postId: post.POST_NO,
      title: post.TITLE,
      fileType: post.FILE_TYPE,
      imageUrl: `http://localhost:3010${post.FILE_PATH}`,
      searchScore: post.SEARCH_SCORE
    }));

    const tagResult = await connection.execute(
      `
      SELECT TAG_NO
      FROM SNS_TAG
      WHERE LOWER(TAG_NAME) = LOWER(:keyword)
      FETCH FIRST 1 ROWS ONLY
      `,
      { keyword },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (tagResult.rows.length > 0) {
      await saveUserActLog(connection, {
      userId: loginUserId,
      actType: "SCH",
      targetType: "TAG",
      targetNo: tagResult.rows[0].TAG_NO
    });

    await updateTagAlgoYn(connection, tagResult.rows[0].TAG_NO);

    await connection.commit();
    }

    res.json({
      result: "success",
      list
    });
  } catch (err) {
    console.error("Post search error:", err);

    res.status(500).json({
      result: "fail",
      message: "기록 검색 중 오류가 발생했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

router.post("/user-click", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        result: "fail",
        message: "대상 사용자가 없습니다."
      });
    }

    await saveUserActLog(connection, {
      userId: loginUserId,
      actType: "SCH",
      targetType: "USR",
      targetId: targetUserId
    });

    await connection.commit();

    res.json({
      result: "success"
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    console.error("User click log error:", err);

    res.status(500).json({
      result: "fail"
    });

  } finally {

    if (connection) {
      await connection.close();
    }

  }
});

module.exports = router;