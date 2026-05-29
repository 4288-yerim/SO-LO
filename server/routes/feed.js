const express = require("express");
const router = express.Router();
const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;

    const postResult = await connection.execute(
      `
      SELECT
        P.POST_NO,
        P.USER_ID,
        P.CATEGORY_NO,
        P.TITLE,
        DBMS_LOB.SUBSTR(P.CONTENT, 4000, 1) AS CONTENT,
        P.PLACE_NAME,
        P.PLACE_ADDRESS,
        P.LAT,
        P.LNG,
        P.CMT_YN,
        P.CDATE,
        U.USER_NICKNAME
      FROM SNS_POST P
      JOIN SNS_USERS U
        ON P.USER_ID = U.USER_ID
      WHERE P.USER_ID = :userId
      ORDER BY P.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const feedList = [];

    for (const post of postResult.rows) {
      const fileResult = await connection.execute(
        `
        SELECT *
        FROM SNS_POST_FILE
        WHERE POST_NO = :postNo
        ORDER BY FILE_ORDER ASC
        `,
        { postNo: post.POST_NO },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const tagResult = await connection.execute(
        `
        SELECT T.*
        FROM SNS_POST_TAG PT
        JOIN SNS_TAG T
          ON PT.TAG_NO = T.TAG_NO
        WHERE PT.POST_NO = :postNo
        `,
        { postNo: post.POST_NO },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const firstFile = fileResult.rows[0];

      feedList.push({
        postId: post.POST_NO,
        userNickname: post.USER_NICKNAME,
        timeAgo: post.CDATE,
        category: post.CATEGORY_NO,
        title: post.TITLE,
        content: post.CONTENT || "",
        imageUrl: firstFile
          ? `http://localhost:3010${firstFile.FILE_PATH}`
          : null,
        fileType: firstFile ? firstFile.FILE_TYPE : null,
        tags: tagResult.rows.map((tag) => tag.TAG_NAME),
        likeCount: 0,
        commentCount: 0,
        location: post.PLACE_NAME || "",
        locationAddress: post.PLACE_ADDRESS || ""
      });
    }

    const statResult = await connection.execute(
      `
      SELECT
        CATEGORY_NO,
        SUM(CASE WHEN TRUNC(CDATE) = TRUNC(SYSDATE) THEN 1 ELSE 0 END) AS TODAY_COUNT,
        SUM(CASE WHEN TRUNC(CDATE) = TRUNC(SYSDATE - 1) THEN 1 ELSE 0 END) AS YESTERDAY_COUNT
      FROM SNS_POST
      GROUP BY CATEGORY_NO
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const todayStats = statResult.rows.map((row) => {
      const todayCount = row.TODAY_COUNT || 0;
      const yesterdayCount = row.YESTERDAY_COUNT || 0;

      return {
        category: row.CATEGORY_NO,
        count: todayCount,
        diff: todayCount - yesterdayCount
      };
    });

    res.status(200).json({
      result: "success",
      feedList,
      todayStats
    });

  } catch (err) {
    console.error("Feed list error:", err);
    res.status(500).json({
      result: "fail",
      message: "피드 목록을 불러오지 못했습니다."
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;