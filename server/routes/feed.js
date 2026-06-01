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
        U.USER_NICKNAME,
        U.PROFILE_IMG
      FROM SNS_POST P
      JOIN SNS_USERS U
        ON P.USER_ID = U.USER_ID
      WHERE U.USER_STATUS NOT IN ('BLK', 'DEL')
        AND P.FEED_STATUS != 'BLK'
        AND (
          U.ACCOUNT_VISIBLE = 'PUB'

          OR (
            U.ACCOUNT_VISIBLE = 'PRV'
            AND EXISTS (
              SELECT 1
              FROM SNS_FOLLOWS F
              WHERE F.FOLLOWER_ID = :userId
                AND F.FOLLOWING_ID = P.USER_ID
            )
          )

          OR P.USER_ID = :userId
        )
      ORDER BY P.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const posts = postResult.rows;

    if (posts.length === 0) {
      return res.status(200).json({
        result: "success",
        feedList: [],
        todayStats: []
      });
    }

    const postNos = posts.map((post) => post.POST_NO);

    const binds = {};
    const placeholders = postNos.map((postNo, index) => {
      const key = `postNo${index}`;
      binds[key] = postNo;
      return `:${key}`;
    }).join(", ");

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

    const tagResult = await connection.execute(
      `
      SELECT
        PT.POST_NO,
        T.*
      FROM SNS_POST_TAG PT
      JOIN SNS_TAG T
        ON PT.TAG_NO = T.TAG_NO
      WHERE PT.POST_NO IN (${placeholders})
      `,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const likeResult = await connection.execute(
      `
      SELECT
        POST_NO,
        COUNT(*) AS LIKE_COUNT
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
        AND USER_ID = :userId
      `,
      {
        ...binds,
        userId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const commentResult = await connection.execute(
      `
      SELECT
        POST_NO,
        COUNT(*) AS COMMENT_COUNT
      FROM SNS_COMMENTS
      WHERE POST_NO IN (${placeholders})
        AND CMT_STATUS = 'ACT'
      GROUP BY POST_NO
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

    const tagsByPost = {};
    tagResult.rows.forEach((tag) => {
      if (!tagsByPost[tag.POST_NO]) {
        tagsByPost[tag.POST_NO] = [];
      }

      tagsByPost[tag.POST_NO].push(tag.TAG_NAME);
    });

    const likeCountByPost = {};
    likeResult.rows.forEach((like) => {
      likeCountByPost[like.POST_NO] = like.LIKE_COUNT;
    });

    const likedPostSet = new Set(
      likedResult.rows.map((like) => like.POST_NO)
    );

    const commentCountByPost = {};
    commentResult.rows.forEach((comment) => {
      commentCountByPost[comment.POST_NO] = comment.COMMENT_COUNT;
    });

    const feedList = posts.map((post) => {
      const files = filesByPost[post.POST_NO] || [];
      const firstFile = files[0];

      return {
        postId: post.POST_NO,
        userId: post.USER_ID,
        userNickname: post.USER_NICKNAME,

        userProfileImg: post.PROFILE_IMG
          ? `http://localhost:3010${post.PROFILE_IMG}`
          : null,
        timeAgo: post.CDATE,
        category: post.CATEGORY_NO,
        title: post.TITLE,
        content: post.CONTENT || "",
        cmtYn: post.CMT_YN,

        imageUrl: firstFile ? firstFile.fileUrl : null,
        fileType: firstFile ? firstFile.fileType : null,
        files,

        tags: tagsByPost[post.POST_NO] || [],

        likeCount: likeCountByPost[post.POST_NO] || 0,
        likedYn: likedPostSet.has(post.POST_NO),

        commentCount: commentCountByPost[post.POST_NO] || 0,

        location: post.PLACE_NAME || "",
        locationAddress: post.PLACE_ADDRESS || ""
      };
    });

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

//  댓글
router.get("/:postNo", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const { postNo } = req.params;

    const result = await connection.execute(
      `
      SELECT
        C.COMMENT_NO,
        C.POST_NO,
        C.USER_ID,
        C.PARENT_COMMENT_NO,
        C.MENTION_USER_ID,
        C.CONTENT,
        C.CDATE,
        U.USER_NICKNAME,
        MU.USER_NICKNAME AS MENTION_USER_NICKNAME
      FROM SNS_COMMENTS C
      JOIN SNS_USERS U
        ON C.USER_ID = U.USER_ID
      LEFT JOIN SNS_USERS MU
        ON C.MENTION_USER_ID = MU.USER_ID
      WHERE C.POST_NO = :postNo
        AND C.CMT_STATUS = 'ACT'
      ORDER BY C.CDATE ASC
      `,
      { postNo },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const parentComments = result.rows
      .filter((row) => !row.PARENT_COMMENT_NO)
      .map((row) => ({
        commentNo: row.COMMENT_NO,
        postNo: row.POST_NO,
        userId: row.USER_ID,
        parentCommentNo: row.PARENT_COMMENT_NO,
        mentionUserId: row.MENTION_USER_ID,
        mentionUserNickname: row.MENTION_USER_NICKNAME,
        userNickname: row.USER_NICKNAME,
        content: row.CONTENT,
        cdate: row.CDATE,
        replies: []
      }));

    result.rows
      .filter((row) => row.PARENT_COMMENT_NO)
      .forEach((reply) => {
        const parent = parentComments.find(
          (comment) => comment.commentNo === reply.PARENT_COMMENT_NO
        );

        if (parent) {
          parent.replies.push({
            commentNo: reply.COMMENT_NO,
            postNo: reply.POST_NO,
            userId: reply.USER_ID,
            parentCommentNo: reply.PARENT_COMMENT_NO,
            mentionUserId: reply.MENTION_USER_ID,
            mentionUserNickname: reply.MENTION_USER_NICKNAME,
            userNickname: reply.USER_NICKNAME,
            content: reply.CONTENT,
            cdate: reply.CDATE
          });
        }
      });

    res.json({
      result: "success",
      commentList: parentComments
    });
  } catch (err) {
    console.error("Comment list error:", err);
    res.status(500).json({
      result: "fail",
      message: "댓글을 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 댓글 달기
router.post("/", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;
    const { postNo, content, parentCommentNo, mentionUserId } = req.body;

    if (!postNo || !content || !content.trim()) {
      return res.status(400).json({
        result: "fail",
        message: "댓글 내용을 입력해주세요."
      });
    }

    await connection.execute(
      `
      INSERT INTO SNS_COMMENTS (
        COMMENT_NO,
        USER_ID,
        POST_NO,
        PARENT_COMMENT_NO,
        MENTION_USER_ID,
        CONTENT,
        CMT_STATUS,
        CDATE
      ) VALUES (
        SEQ_SNS_COMMENTS.NEXTVAL,
        :userId,
        :postNo,
        :parentCommentNo,
        :mentionUserId,
        :content,
        'ACT',
        SYSDATE
      )
      `,
      {
        userId,
        postNo,
        parentCommentNo: parentCommentNo || null,
        mentionUserId: mentionUserId || null,
        content
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "댓글이 등록되었습니다."
    });
  } catch (err) {
    console.error("Comment insert error:", err);
    res.status(500).json({
      result: "fail",
      message: "댓글 등록에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

router.post("/like", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;
    const { postNo } = req.body;

    const existsResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_POST_LIKE
      WHERE POST_NO = :postNo
        AND USER_ID = :userId
      `,
      {
        postNo,
        userId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existsResult.rows[0].CNT > 0) {

      await connection.execute(
        `
        DELETE FROM SNS_POST_LIKE
        WHERE POST_NO = :postNo
          AND USER_ID = :userId
        `,
        {
          postNo,
          userId
        },
        { autoCommit: true }
      );

      return res.json({
        result: "success",
        likedYn: false
      });
    }

    await connection.execute(
      `
      INSERT INTO SNS_POST_LIKE (
        LIKE_NO,
        USER_ID,
        POST_NO,
        CDATE
      )
      VALUES (
        SEQ_SNS_POST_LIKE.NEXTVAL,
        :userId,
        :postNo,
        SYSDATE
      )
      `,
      {
        userId,
        postNo
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      likedYn: true
    });

  } catch (err) {
    console.error("Like error:", err);

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