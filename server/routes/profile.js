const express = require("express");
const router = express.Router();
const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/:userId", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;

    const userResult = await connection.execute(
      `
      SELECT
        USER_ID,
        USER_NICKNAME,
        USER_INTRO
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

    const postCountResult = await connection.execute(
      `
      SELECT COUNT(*) AS POST_COUNT
      FROM SNS_POST
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const postResult = await connection.execute(
      `
      SELECT
        P.POST_NO,
        P.TITLE,
        DBMS_LOB.SUBSTR(P.CONTENT, 4000, 1) AS CONTENT,
        P.CATEGORY_NO,
        P.PLACE_NAME,
        P.PLACE_ADDRESS,
        P.CDATE
      FROM SNS_POST P
      WHERE P.USER_ID = :userId
      ORDER BY P.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const postNos = postResult.rows.map((post) => post.POST_NO);

    let fileRows = [];

    if (postNos.length > 0) {
      const binds = {};
      const placeholders = postNos
        .map((postNo, index) => {
          const key = `postNo${index}`;
          binds[key] = postNo;
          return `:${key}`;
        })
        .join(", ");

      const fileResult = await connection.execute(
        `
        SELECT *
        FROM SNS_POST_FILE
        WHERE POST_NO IN (${placeholders})
        ORDER BY POST_NO ASC, FILE_ORDER ASC
        `,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      fileRows = fileResult.rows;
    }

    const filesByPost = {};

    fileRows.forEach((file) => {
      if (!filesByPost[file.POST_NO]) {
        filesByPost[file.POST_NO] = [];
      }

      filesByPost[file.POST_NO].push({
        fileNo: file.FILE_NO,
        fileUrl: `http://localhost:3010${file.FILE_PATH}`,
        fileType: file.FILE_TYPE,
        fileOrder: file.FILE_ORDER
      });
    });

    const postList = postResult.rows.map((post) => {
      const files = filesByPost[post.POST_NO] || [];
      const firstFile = files[0];

      return {
        postId: post.POST_NO,
        title: post.TITLE,
        content: post.CONTENT || "",
        category: post.CATEGORY_NO,
        placeName: post.PLACE_NAME || "",
        placeAddress: post.PLACE_ADDRESS || "",
        timeAgo: post.CDATE,
        imageUrl: firstFile ? firstFile.fileUrl : null,
        fileType: firstFile ? firstFile.fileType : null,
        files
      };
    });

    const profile = {
      userId: userResult.rows[0].USER_ID,
      userNickname: userResult.rows[0].USER_NICKNAME,
      userIntro: userResult.rows[0].USER_INTRO || "",
      postCount: postCountResult.rows[0].POST_COUNT,
      followerCount: 0,
      followingCount: 0,
      postList
    };

    res.json({
      result: "success",
      profile
    });
  } catch (err) {
    console.error("Profile error:", err);

    res.status(500).json({
      result: "fail",
      message: "프로필을 불러오지 못했습니다."
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;