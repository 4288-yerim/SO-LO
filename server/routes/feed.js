const express = require("express");
const router = express.Router();
const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { saveUserActLog } = require("./userActLog");

router.get("/", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;

    const loginUserResult = await connection.execute(
      `
      SELECT USER_STATUS
      FROM SNS_USERS
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const loginUserStatus = loginUserResult.rows[0]?.USER_STATUS || "";
    const isAdmin = loginUserStatus === "ADM";

    const postResult = await connection.execute(
    `
    WITH USER_TAG_SCORE AS (
      SELECT
        TARGET_NO AS TAG_NO,
        SUM(SCORE) AS TAG_SCORE
      FROM SNS_USER_ACT_LOG
      WHERE USER_ID = :userId
        AND TARGET_TYPE = 'TAG'
        AND TARGET_NO IS NOT NULL
      GROUP BY TARGET_NO
    ),
    USER_TARGET_USER AS (
      SELECT DISTINCT
        TARGET_ID AS TARGET_USER_ID
      FROM SNS_USER_ACT_LOG
      WHERE USER_ID = :userId
        AND TARGET_TYPE = 'USR'
        AND TARGET_ID IS NOT NULL
    ),
    POST_VIEW AS (
      SELECT
        TARGET_NO AS POST_NO,
        MAX(CDATE) AS LAST_VIEW_DATE
      FROM SNS_USER_ACT_LOG
      WHERE USER_ID = :userId
        AND ACT_TYPE = 'VIW'
        AND TARGET_TYPE = 'PST'
        AND TARGET_NO IS NOT NULL
      GROUP BY TARGET_NO
    ),
    BASE_POST AS (
      SELECT
        P.POST_NO,
        P.USER_ID,
        P.CATEGORY_NO,
        P.IS_AD,
        P.TITLE,
        DBMS_LOB.SUBSTR(P.CONTENT, 4000, 1) AS CONTENT,
        P.PLACE_NAME,
        P.PLACE_ADDRESS,
        P.LAT,
        P.LNG,
        P.CMT_YN,
        P.CDATE,
        U.USER_NICKNAME,
        U.PROFILE_IMG,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM SNS_FOLLOWS F
            WHERE F.FOLLOWER_ID = :userId
              AND F.FOLLOWING_ID = P.USER_ID
          )
          THEN 1 ELSE 0
        END AS FOLLOWED_YN,

        CASE
          WHEN PV.POST_NO IS NOT NULL
          THEN 1 ELSE 0
        END AS VIEWED_YN,

        PV.LAST_VIEW_DATE,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM USER_TARGET_USER UTU
            WHERE UTU.TARGET_USER_ID = P.USER_ID
          )
          THEN 1 ELSE 0
        END AS TARGET_USER_YN,

        NVL((
          SELECT SUM(UTS.TAG_SCORE)
          FROM SNS_POST_TAG PT
          JOIN USER_TAG_SCORE UTS
            ON PT.TAG_NO = UTS.TAG_NO
          WHERE PT.POST_NO = P.POST_NO
        ), 0) AS POST_TAG_SCORE,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM SNS_POST_TAG PT
            WHERE PT.POST_NO = P.POST_NO
          )
          AND NOT EXISTS (
            SELECT 1
            FROM SNS_POST_TAG PT
            JOIN USER_TAG_SCORE UTS
              ON PT.TAG_NO = UTS.TAG_NO
            WHERE PT.POST_NO = P.POST_NO
          )
          THEN 1 ELSE 0
        END AS ONLY_UNKNOWN_TAG_YN

      FROM SNS_POST P
      JOIN SNS_USERS U
        ON P.USER_ID = U.USER_ID
      LEFT JOIN POST_VIEW PV
        ON P.POST_NO = PV.POST_NO
      WHERE U.USER_STATUS NOT IN ('BLK', 'DEL')
        AND P.FEED_STATUS != 'BLK'
        AND NOT EXISTS (
          SELECT 1
          FROM SNS_USER_BLOCK B
          WHERE
            (
              B.BLOCKER_ID = :userId
              AND B.BLOCKED_ID = P.USER_ID
            )
            OR
            (
              B.BLOCKER_ID = P.USER_ID
              AND B.BLOCKED_ID = :userId
            )
        )
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
          
        AND P.USER_ID <> :userId
    )
    SELECT
      BASE_POST.*,

      CASE
        WHEN IS_AD = 'N'
          AND FOLLOWED_YN = 1
          AND VIEWED_YN = 0
        THEN 0

        WHEN IS_AD = 'N'
          AND POST_TAG_SCORE > 0
          AND VIEWED_YN = 0
        THEN 1

        WHEN IS_AD = 'N'
          AND TARGET_USER_YN = 1
          AND ONLY_UNKNOWN_TAG_YN = 1
          AND VIEWED_YN = 0
        THEN 2

        WHEN IS_AD = 'N'
          AND VIEWED_YN = 1
          AND LAST_VIEW_DATE < SYSDATE - 1
          AND FOLLOWED_YN = 1
        THEN 3

        WHEN IS_AD = 'N'
          AND VIEWED_YN = 1
          AND LAST_VIEW_DATE < SYSDATE - 1
          AND POST_TAG_SCORE > 0
        THEN 4

        WHEN IS_AD = 'N'
          AND VIEWED_YN = 1
          AND LAST_VIEW_DATE < SYSDATE - 1
          AND TARGET_USER_YN = 1
          AND ONLY_UNKNOWN_TAG_YN = 1
        THEN 5

        ELSE 6
      END AS FEED_GROUP,

      CASE
        WHEN IS_AD = 'Y'
          AND VIEWED_YN = 0
          AND POST_TAG_SCORE > 0
        THEN 1

        WHEN IS_AD = 'Y'
          AND VIEWED_YN = 0
          AND TARGET_USER_YN = 1
        THEN 2

        WHEN IS_AD = 'Y'
          AND VIEWED_YN = 0
        THEN 3

        WHEN IS_AD = 'Y'
          AND VIEWED_YN = 1
          AND LAST_VIEW_DATE < SYSDATE - 1
          AND POST_TAG_SCORE > 0
        THEN 4

        WHEN IS_AD = 'Y'
          AND VIEWED_YN = 1
          AND LAST_VIEW_DATE < SYSDATE - 1
          AND TARGET_USER_YN = 1
        THEN 5

        WHEN IS_AD = 'Y'
          AND VIEWED_YN = 1
          AND LAST_VIEW_DATE < SYSDATE - 1
        THEN 6

        ELSE 99
      END AS AD_GROUP

    FROM BASE_POST
    WHERE IS_AD = 'N'
      OR IS_AD = 'Y'
    ORDER BY
      CASE WHEN IS_AD = 'Y' THEN AD_GROUP ELSE FEED_GROUP END ASC,
      POST_TAG_SCORE DESC,
      CDATE DESC
    `,
    { userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

    const normalPosts = postResult.rows.filter(
      (post) => post.IS_AD !== "Y" && post.FEED_GROUP !== 99
    );

    const adPosts = postResult.rows.filter(
      (post) => post.IS_AD === "Y" && post.AD_GROUP !== 99
    );

    const posts = [];

    let adIndex = 0;

    normalPosts.forEach((post, index) => {
      posts.push(post);

      if ((index + 1) % 3 === 0 && adIndex < adPosts.length) {
        posts.push(adPosts[adIndex]);
        adIndex += 1;
      }
    });

    while (adIndex < adPosts.length) {
      posts.push(adPosts[adIndex]);
      adIndex += 1;
    }

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

    const adTagResult = await connection.execute(
      `
      SELECT
        APT.POST_NO,
        AT.AD_TAG_NAME
      FROM SNS_AD_POST_TAG APT
      JOIN SNS_AD_TAG AT
        ON APT.AD_TAG_NO = AT.AD_TAG_NO
      WHERE APT.POST_NO IN (${placeholders})
      `,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const adLinkResult = await connection.execute(
      `
      SELECT
        POST_NO,
        LINK_NAME,
        LINK_URL,
        LINK_ICON,
        LINK_ORDER
      FROM SNS_AD_LINK
      WHERE POST_NO IN (${placeholders})
      ORDER BY LINK_ORDER
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

    const adTagByPost = {};
    adTagResult.rows.forEach((tag) => {
      adTagByPost[tag.POST_NO] = tag.AD_TAG_NAME;
    });

    const adLinkByPost = {};
    adLinkResult.rows.forEach((link) => {
      if (!adLinkByPost[link.POST_NO]) {
        adLinkByPost[link.POST_NO] = [];
      }

      adLinkByPost[link.POST_NO].push({
        linkName: link.LINK_NAME,
        linkUrl: link.LINK_URL,
        linkIcon: link.LINK_ICON
      });
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
        canDeletePost: post.USER_ID === userId || isAdmin,
        isAd: post.IS_AD === "Y",
        adTag: adTagByPost[post.POST_NO] || null,
        adLinks: adLinkByPost[post.POST_NO] || [],

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
        locationAddress: post.PLACE_ADDRESS || "",
        lat: post.LAT,
        lng: post.LNG
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
    const loginUserId = req.user.userId;

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
        U.PROFILE_IMG,
        MU.USER_NICKNAME AS MENTION_USER_NICKNAME
      FROM SNS_COMMENTS C
      JOIN SNS_USERS U
        ON C.USER_ID = U.USER_ID
      LEFT JOIN SNS_USERS MU
        ON C.MENTION_USER_ID = MU.USER_ID
      WHERE C.POST_NO = :postNo
        AND C.CMT_STATUS = 'ACT'
        AND NOT EXISTS (
          SELECT 1
          FROM SNS_USER_BLOCK B
          WHERE
            (
              B.BLOCKER_ID = :loginUserId
              AND B.BLOCKED_ID = C.USER_ID
            )
            OR
            (
              B.BLOCKER_ID = C.USER_ID
              AND B.BLOCKED_ID = :loginUserId
            )
        )
      ORDER BY C.CDATE ASC
      `,
      { postNo, loginUserId },
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
        userProfileImg: row.PROFILE_IMG
          ? `http://localhost:3010${row.PROFILE_IMG}`
          : null,
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
            userProfileImg: reply.PROFILE_IMG
              ? `http://localhost:3010${reply.PROFILE_IMG}`
              : null,
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

    const postOwnerResult = await connection.execute(
  `
  SELECT USER_ID
  FROM SNS_POST
  WHERE POST_NO = :postNo
  `,
  { postNo },
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);

if (postOwnerResult.rows.length === 0) {
  return res.status(404).json({
    result: "fail",
    message: "존재하지 않는 게시글입니다."
  });
}

const postOwnerId = postOwnerResult.rows[0].USER_ID;

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
    { autoCommit: false }
  );

  if (postOwnerId !== userId) {
    const notiSettingResult = await connection.execute(
      `
      SELECT COMMENT_NOTI
      FROM SNS_USER_NOTI
      WHERE USER_ID = :postOwnerId
      `,
      { postOwnerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const commentNoti =
      notiSettingResult.rows.length > 0
        ? notiSettingResult.rows[0].COMMENT_NOTI
        : "Y";

    if (commentNoti === "Y") {
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
          :postOwnerId,
          :userId,
          'CMT',
          'PST',
          :postNo,
          '님이 회원님의 글에 댓글을 남겼습니다.',
          'N',
          SYSDATE
        )
        `,
        {
          postOwnerId,
          userId,
          postNo
        },
        { autoCommit: false }
      );
    }
  }

  await saveUserActLog(connection, {
    userId,
    actType: "CMT",
    targetType: "PST",
    targetNo: postNo,
  });

  await connection.commit();

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

router.delete("/comment/:commentNo", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const loginUserId = req.user.userId;
    const { commentNo } = req.params;

    const userResult = await connection.execute(
      `
      SELECT USER_STATUS
      FROM SNS_USERS
      WHERE USER_ID = :loginUserId
      `,
      { loginUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const isAdmin =
      userResult.rows[0]?.USER_STATUS === "ADM";

    const commentResult = await connection.execute(
      `
      SELECT USER_ID
      FROM SNS_COMMENTS
      WHERE COMMENT_NO = :commentNo
      `,
      { commentNo },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "존재하지 않는 댓글입니다."
      });
    }

    const writerId = commentResult.rows[0].USER_ID;

    if (writerId !== loginUserId && !isAdmin) {
      return res.status(403).json({
        result: "fail",
        message: "삭제 권한이 없습니다."
      });
    }

    await connection.execute(
      `
      UPDATE SNS_COMMENTS
      SET CMT_STATUS = 'DEL'
      WHERE COMMENT_NO = :commentNo
      `,
      { commentNo },
      { autoCommit: true }
    );

    res.json({
      result: "success"
    });

  } catch (err) {
    console.error("Comment delete error:", err);

    res.status(500).json({
      result: "fail",
      message: "댓글 삭제에 실패했습니다."
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

    const postOwnerResult = await connection.execute(
  `
  SELECT USER_ID
  FROM SNS_POST
  WHERE POST_NO = :postNo
  `,
  { postNo },
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);

if (postOwnerResult.rows.length === 0) {
  return res.status(404).json({
    result: "fail",
    message: "존재하지 않는 게시글입니다."
  });
}

const postOwnerId = postOwnerResult.rows[0].USER_ID;

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
    { autoCommit: false }
  );

  await saveUserActLog(connection, {
    userId,
    actType: "LKE",
    targetType: "PST",
    targetNo: postNo,
  });

  if (postOwnerId !== userId) {
    const notiSettingResult = await connection.execute(
      `
      SELECT LIKE_NOTI
      FROM SNS_USER_NOTI
      WHERE USER_ID = :postOwnerId
      `,
      { postOwnerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const likeNoti =
      notiSettingResult.rows.length > 0
        ? notiSettingResult.rows[0].LIKE_NOTI
        : "Y";

    if (likeNoti === "Y") {
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
          :postOwnerId,
          :userId,
          'LKE',
          'PST',
          :postNo,
          '님이 회원님의 글을 좋아합니다.',
          'N',
          SYSDATE
        )
        `,
        {
          postOwnerId,
          userId,
          postNo
        },
        { autoCommit: false }
      );
    }
  }

  await connection.commit();

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

router.post("/view", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;
    const { postNo } = req.body;

    await saveUserActLog(connection, {
      userId,
      actType: "VIW",
      targetType: "PST",
      targetNo: postNo,
    });

    await connection.commit();

    res.json({
      result: "success"
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    console.error("View log error:", err);

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