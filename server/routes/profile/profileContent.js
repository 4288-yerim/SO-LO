const express = require("express");
const router = express.Router();

const { oracledb, dbConfig } = require("../../db");
const authMiddleware = require("../../middleware/authMiddleware");

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

async function getFilesByPost(connection, postRows) {
  const postNos = postRows.map((post) => post.POST_NO);

  if (postNos.length === 0) return {};

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

  const filesByPost = {};

  fileResult.rows.forEach((file) => {
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

  return filesByPost;
}

// 작성한 글 목록 조회
router.get("/:userId/posts", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;

    const canView = await checkCanViewProfileContents(connection, loginUserId, userId);

    if (!canView) {
      return res.json({
        result: "success",
        postList: []
      });
    }

    const postResult = await connection.execute(
      `
      SELECT
        P.POST_NO,
        P.USER_ID,
        P.TITLE,
        DBMS_LOB.SUBSTR(P.CONTENT, 4000, 1) AS CONTENT,
        P.CATEGORY_NO,
        P.PLACE_NAME,
        P.PLACE_ADDRESS,
        P.CMT_YN,
        P.CDATE
      FROM SNS_POST P
      WHERE P.USER_ID = :userId
        AND P.FEED_STATUS = 'ACT'
      ORDER BY P.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const filesByPost = await getFilesByPost(connection, postResult.rows);

    const postList = postResult.rows.map((post) => {
      const files = filesByPost[post.POST_NO] || [];
      const firstFile = files[0];

      return {
        postId: post.POST_NO,
        userId: post.USER_ID,
        title: post.TITLE,
        content: post.CONTENT || "",
        category: post.CATEGORY_NO,
        placeName: post.PLACE_NAME || "",
        placeAddress: post.PLACE_ADDRESS || "",
        cmtYn: post.CMT_YN,
        timeAgo: post.CDATE,
        imageUrl: firstFile ? firstFile.fileUrl : null,
        fileType: firstFile ? firstFile.fileType : null,
        files
      };
    });

    res.json({
      result: "success",
      postList
    });
  } catch (err) {
    console.error("Profile post list error:", err);

    res.status(500).json({
      result: "fail",
      message: "작성한 글을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 좋아요한 글 목록 조회
router.get("/:userId/likes", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;

    const canView = await checkCanViewProfileContents(connection, loginUserId, userId);

    if (!canView) {
      return res.json({
        result: "success",
        likedPostList: []
      });
    }

    const postResult = await connection.execute(
      `
      SELECT
        P.POST_NO,
        P.USER_ID,
        U.USER_NICKNAME,
        P.TITLE,
        DBMS_LOB.SUBSTR(P.CONTENT, 4000, 1) AS CONTENT,
        P.CATEGORY_NO,
        P.PLACE_NAME,
        P.PLACE_ADDRESS,
        P.CMT_YN,
        P.CDATE
      FROM SNS_POST_LIKE L
      JOIN SNS_POST P
        ON L.POST_NO = P.POST_NO
      JOIN SNS_USERS U
        ON P.USER_ID = U.USER_ID
      WHERE L.USER_ID = :userId
        AND P.USER_ID <> :userId
        AND P.FEED_STATUS = 'ACT'
        AND U.USER_STATUS = 'ACT'
      ORDER BY L.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const filesByPost = await getFilesByPost(connection, postResult.rows);

    const likedPostList = postResult.rows.map((post) => {
      const files = filesByPost[post.POST_NO] || [];
      const firstFile = files[0];

      return {
        postId: post.POST_NO,
        userId: post.USER_ID,
        userNickname: post.USER_NICKNAME,
        title: post.TITLE,
        content: post.CONTENT || "",
        category: post.CATEGORY_NO,
        placeName: post.PLACE_NAME || "",
        placeAddress: post.PLACE_ADDRESS || "",
        cmtYn: post.CMT_YN,
        timeAgo: post.CDATE,
        imageUrl: firstFile ? firstFile.fileUrl : null,
        fileType: firstFile ? firstFile.fileType : null,
        files
      };
    });

    res.json({
      result: "success",
      likedPostList
    });
  } catch (err) {
    console.error("Liked post list error:", err);

    res.status(500).json({
      result: "fail",
      message: "좋아요한 글을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// SO:LOG 조회
router.get("/:userId/solog", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;

    const canView = await checkCanViewProfileContents(connection, loginUserId, userId);

    if (!canView) {
      return res.json({
        result: "success",
        sologList: []
      });
    }

    res.json({
      result: "success",
      sologList: []
    });
  } catch (err) {
    console.error("SO:LOG error:", err);

    res.status(500).json({
      result: "fail",
      message: "SO:LOG를 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;