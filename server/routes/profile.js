const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

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

    const accountVisible = userResult.rows[0].ACCOUNT_VISIBLE || "PUB";

    let canViewFollowInfo = false;

    if (userId === loginUserId) {
      canViewFollowInfo = true;
    } else if (accountVisible === "PUB") {
      canViewFollowInfo = true;
    } else if (accountVisible === "PRV") {
      const result = await connection.execute(
        `
        SELECT COUNT(*) AS CNT
        FROM SNS_FOLLOWS
        WHERE FOLLOWER_ID = :loginUserId
          AND FOLLOWING_ID = :userId
        `,
        { loginUserId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      canViewFollowInfo = result.rows[0].CNT > 0;
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

    const user = userResult.rows[0];

    const profile = {
      userId: user.USER_ID,
      userNickname: user.USER_NICKNAME,
      userIntro: user.USER_INTRO || "",
      profileImg: user.PROFILE_IMG
        ? `http://localhost:3010${user.PROFILE_IMG}`
        : null,
      relationBadge: user.RELATION_BADGE || "ALL",
      postCount: postCountResult.rows[0].POST_COUNT,
      followerCount: followerCountResult.rows[0].FOLLOWER_COUNT,
      followingCount: followingCountResult.rows[0].FOLLOWING_COUNT,
      postList
    };

    res.json({
      result: "success",
      profile,
      canViewFollowInfo
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

// 팔로워 목록
router.get("/:userId/followers", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;

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
    if (connection) {
      await connection.close();
    }
  }
});

// 팔로잉 목록
router.get("/:userId/followings", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;

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
    if (connection) {
      await connection.close();
    }
  }
});

// 좋아요한 글 목록
router.get("/:userId/likes", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { userId } = req.params;
    const loginUserId = req.user.userId;

    const visibleUserResult = await connection.execute(
      `
      SELECT ACCOUNT_VISIBLE
      FROM SNS_USERS
      WHERE USER_ID = :userId
        AND USER_STATUS = 'ACT'
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const accountVisible =
      visibleUserResult.rows.length > 0
        ? visibleUserResult.rows[0].ACCOUNT_VISIBLE
        : "PUB";

    let canViewLikedPosts = false;

    if (userId === loginUserId) {
      canViewLikedPosts = true;
    } else if (accountVisible === "PUB") {
      canViewLikedPosts = true;
    } else if (accountVisible === "PRV") {
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

      canViewLikedPosts = followResult.rows[0].CNT > 0;
    }

    if (!canViewLikedPosts) {
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
    console.error("Liked post list error:");
    console.error(err);
    console.error(err.message);
    console.error(err.stack);

    res.status(500).json({
      result: "fail",
      message: "좋아요한 글을 불러오지 못했습니다."
    });
  } finally {
    if (connection) {
      await connection.close();
    }
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
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;