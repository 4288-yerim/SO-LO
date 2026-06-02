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

async function getStatsByPost(connection, postRows, loginUserId) {
  const postNos = postRows.map((post) => post.POST_NO);

  if (postNos.length === 0) {
    return {
      likeCountByPost: {},
      likedPostSet: new Set(),
      commentCountByPost: {}
    };
  }

  const binds = {};
  const placeholders = postNos
    .map((postNo, index) => {
      const key = `postNo${index}`;
      binds[key] = postNo;
      return `:${key}`;
    })
    .join(", ");

  const likeResult = await connection.execute(
    `
    SELECT POST_NO, COUNT(*) AS LIKE_COUNT
    FROM SNS_POST_LIKE
    WHERE POST_NO IN (${placeholders})
    GROUP BY POST_NO
    `,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const likedResult = await connection.execute(
    `
    SELECT POST_NO
    FROM SNS_POST_LIKE
    WHERE POST_NO IN (${placeholders})
      AND USER_ID = :loginUserId
    `,
    {
      ...binds,
      loginUserId
    },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const commentResult = await connection.execute(
    `
    SELECT POST_NO, COUNT(*) AS COMMENT_COUNT
    FROM SNS_COMMENTS
    WHERE POST_NO IN (${placeholders})
      AND CMT_STATUS = 'ACT'
    GROUP BY POST_NO
    `,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const likeCountByPost = {};
  likeResult.rows.forEach((row) => {
    likeCountByPost[row.POST_NO] = row.LIKE_COUNT;
  });

  const likedPostSet = new Set(
    likedResult.rows.map((row) => row.POST_NO)
  );

  const commentCountByPost = {};
  commentResult.rows.forEach((row) => {
    commentCountByPost[row.POST_NO] = row.COMMENT_COUNT;
  });

  return {
    likeCountByPost,
    likedPostSet,
    commentCountByPost
  };
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
        P.LAT,
        P.LNG,
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

    const {
      likeCountByPost,
      likedPostSet,
      commentCountByPost
    } = await getStatsByPost(connection, postResult.rows, loginUserId);

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
        lat: post.LAT,
        lng: post.LNG,
        cmtYn: post.CMT_YN,
        timeAgo: post.CDATE,
        imageUrl: firstFile ? firstFile.fileUrl : null,
        fileType: firstFile ? firstFile.fileType : null,
        files,

        tags: [],

        likeCount: likeCountByPost[post.POST_NO] || 0,
        likedYn: likedPostSet.has(post.POST_NO),
        commentCount: commentCountByPost[post.POST_NO] || 0,

        location: post.PLACE_NAME || "",
        locationAddress: post.PLACE_ADDRESS || ""
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
        P.LAT,
        P.LNG,
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

    const {
      likeCountByPost,
      likedPostSet,
      commentCountByPost
    } = await getStatsByPost(connection, postResult.rows, loginUserId);

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
        files,

        tags: [],

        likeCount: likeCountByPost[post.POST_NO] || 0,
        likedYn: likedPostSet.has(post.POST_NO),
        commentCount: commentCountByPost[post.POST_NO] || 0,

        location: post.PLACE_NAME || "",
        locationAddress: post.PLACE_ADDRESS || ""
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

// 찜한 업체 목록 조회
router.get("/:userId/favorites", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;
    const isMyProfile = loginUserId === userId;

    const canView = await checkCanViewProfileContents(
      connection,
      loginUserId,
      userId
    );

    if (!canView) {
      return res.json({
        result: "success",
        canViewFavorites: false,
        favoriteFolderList: []
      });
    }

    const folderSql = `
      SELECT
        F.FOLDER_NO,
        F.USER_ID,
        F.FOLDER_NAME,
        F.FOLDER_INFO,
        F.IS_SHARED,
        F.CDATE,
        COUNT(P.FAVORITE_NO) AS PLACE_COUNT
      FROM SNS_FAVORITE_FOLDER F
      LEFT JOIN SNS_FAVORITE_PLACE P
        ON F.FOLDER_NO = P.FOLDER_NO
      WHERE F.USER_ID = :userId
        ${isMyProfile ? "" : "AND F.IS_SHARED = 'Y'"}
      GROUP BY
        F.FOLDER_NO,
        F.USER_ID,
        F.FOLDER_NAME,
        F.FOLDER_INFO,
        F.IS_SHARED,
        F.CDATE
      ORDER BY F.CDATE DESC
    `;

    const folderResult = await connection.execute(
      folderSql,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const placeResult = await connection.execute(
      `
      SELECT
        P.FAVORITE_NO,
        P.FOLDER_NO,
        P.PLACE_NAME,
        P.PLACE_ADDRESS,
        P.LAT,
        P.LNG,
        P.MEMO,
        P.CDATE
      FROM SNS_FAVORITE_PLACE P
      JOIN SNS_FAVORITE_FOLDER F
        ON P.FOLDER_NO = F.FOLDER_NO
      WHERE P.USER_ID = :userId
        ${isMyProfile ? "" : "AND F.IS_SHARED = 'Y'"}
      ORDER BY P.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const placesByFolder = {};

    placeResult.rows.forEach((place) => {
      if (!placesByFolder[place.FOLDER_NO]) {
        placesByFolder[place.FOLDER_NO] = [];
      }

      placesByFolder[place.FOLDER_NO].push({
        favoriteNo: place.FAVORITE_NO,
        folderNo: place.FOLDER_NO,
        placeName: place.PLACE_NAME,
        placeAddress: place.PLACE_ADDRESS,
        lat: place.LAT,
        lng: place.LNG,
        memo: place.MEMO || "",
        cdate: place.CDATE
      });
    });

    const favoriteFolderList = folderResult.rows.map((folder) => ({
      folderNo: folder.FOLDER_NO,
      userId: folder.USER_ID,
      folderName: folder.FOLDER_NAME,
      folderInfo: folder.FOLDER_INFO || "",
      isShared: folder.IS_SHARED,
      placeCount: folder.PLACE_COUNT || 0,
      cdate: folder.CDATE,
      placeList: placesByFolder[folder.FOLDER_NO] || []
    }));

    res.json({
      result: "success",
      canViewFavorites: true,
      favoriteFolderList
    });
  } catch (err) {
    console.error("Profile favorite list error:", err);

    res.status(500).json({
      result: "fail",
      message: "찜한 업체를 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;