const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { saveUserActLog, updateTagAlgoYn } = require("./userActLog");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/post");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const saveName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, saveName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("이미지 또는 영상 파일만 업로드할 수 있습니다."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

// 카테고리 조회
router.get("/category", async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `
      SELECT *
      FROM SNS_CATEGORY
      WHERE USE_YN = 'Y'
      ORDER BY CATEGORY_NO
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      categoryList: result.rows
    });
  } catch (err) {
    console.error("Category list error", err);

    res.status(500).json({
      result: "fail",
      message: "카테고리 조회 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 태그 검색
router.get("/tag/search", async (req, res) => {
  const { keyword } = req.query;

  if (!keyword || keyword.trim() === "") {
    return res.json({
      result: "success",
      tagList: []
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `
      SELECT *
      FROM SNS_TAG
      WHERE TAG_NAME LIKE :keyword
      ORDER BY 
        CASE 
          WHEN TAG_NAME = :exactKeyword THEN 1
          WHEN TAG_NAME LIKE :startKeyword THEN 2
          ELSE 3
        END,
        TAG_NAME
      FETCH FIRST 10 ROWS ONLY
      `,
      {
        keyword: `%${keyword}%`,
        exactKeyword: keyword,
        startKeyword: `${keyword}%`
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      tagList: result.rows
    });
  } catch (err) {
    console.error("Tag search error", err);

    res.status(500).json({
      result: "fail",
      message: "태그 검색 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 기록 수정용 상세 조회
router.get("/edit/:postNo", authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { postNo } = req.params;

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const postResult = await connection.execute(
      `
      SELECT
        POST_NO,
        USER_ID,
        CATEGORY_NO,
        TITLE,
        TO_CHAR(DBMS_LOB.SUBSTR(CONTENT, 4000, 1)) AS CONTENT,
        PLACE_NAME,
        PLACE_ADDRESS,
        LAT,
        LNG,
        CMT_YN,
        IS_AD,
        VIEW_COUNT,
        FEED_STATUS,
        CDATE,
        UDATE
      FROM SNS_POST
      WHERE POST_NO = :postNo
        AND USER_ID = :userId
        AND FEED_STATUS = 'ACT'
        AND IS_AD = 'N'
      `,
      {
        postNo: Number(postNo),
        userId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "수정할 기록을 찾을 수 없습니다."
      });
    }

    const tagResult = await connection.execute(
      `
      SELECT
        T.TAG_NO,
        T.TAG_NAME
      FROM SNS_POST_TAG PT
      JOIN SNS_TAG T ON PT.TAG_NO = T.TAG_NO
      WHERE PT.POST_NO = :postNo
      ORDER BY T.TAG_NAME
      `,
      { postNo: Number(postNo) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const fileResult = await connection.execute(
      `
      SELECT
        FILE_NO,
        POST_NO,
        ORIGIN_NAME,
        FILE_PATH,
        FILE_TYPE,
        FILE_ORDER
      FROM SNS_POST_FILE
      WHERE POST_NO = :postNo
      ORDER BY FILE_ORDER
      `,
      { postNo: Number(postNo) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      post: postResult.rows[0],
      tags: tagResult.rows,
      files: fileResult.rows
    });
  } catch (err) {
    console.error("Post edit detail error", err);

    res.status(500).json({
      result: "fail",
      message: "수정 기록 조회 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 기록하기
router.post("/write", authMiddleware, upload.array("files", 5), async (req, res) => {
  const userId = req.user.userId;

  const {
    categoryNo,
    title,
    content,
    placeName,
    placeAddress,
    lat,
    lng,
    cmtYn,
    tags
  } = req.body;

  if (!categoryNo || !title || !content) {
    return res.status(400).json({
      result: "fail",
      message: "카테고리, 제목, 내용을 입력해주세요."
    });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      result: "fail",
      message: "사진 또는 영상을 1개 이상 등록해주세요."
    });
  }

  if (title.length > 100) {
    return res.status(400).json({
      result: "fail",
      message: "제목은 100자 이하만 가능합니다."
    });
  }

  if (content.length > 5000) {
    return res.status(400).json({
      result: "fail",
      message: "내용은 5000자 이하만 가능합니다."
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const postResult = await connection.execute(
      `
      INSERT INTO SNS_POST (
        POST_NO,
        USER_ID,
        CATEGORY_NO,
        TITLE,
        CONTENT,
        PLACE_NAME,
        PLACE_ADDRESS,
        LAT,
        LNG,
        CMT_YN,
        IS_AD,
        VIEW_COUNT,
        FEED_STATUS,
        CDATE
      )
      VALUES (
        SEQ_SNS_POST.NEXTVAL,
        :userId,
        :categoryNo,
        :title,
        :content,
        :placeName,
        :placeAddress,
        :lat,
        :lng,
        :cmtYn,
        'N',
        0,
        'ACT',
        SYSDATE
      )
      RETURNING POST_NO INTO :postNo
      `,
      {
        userId,
        categoryNo: Number(categoryNo),
        title,
        content,
        placeName: placeName || null,
        placeAddress: placeAddress || null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        cmtYn: cmtYn || "Y",
        postNo: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER
        }
      },
      { autoCommit: false }
    );

    const postNo = postResult.outBinds.postNo[0];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        const fileType = file.mimetype.startsWith("image/") ? "IMG" : "VDO";

        await connection.execute(
          `
          INSERT INTO SNS_POST_FILE (
            FILE_NO,
            POST_NO,
            ORIGIN_NAME,
            SAVE_NAME,
            FILE_PATH,
            FILE_TYPE,
            FILE_SIZE,
            FILE_ORDER,
            CDATE
          )
          VALUES (
            SEQ_SNS_POST_FILE.NEXTVAL,
            :postNo,
            :originName,
            :saveName,
            :filePath,
            :fileType,
            :fileSize,
            :fileOrder,
            SYSDATE
          )
          `,
          {
            postNo,
            originName: Buffer.from(file.originalname, "latin1").toString("utf8"),
            saveName: file.filename,
            filePath: `/uploads/post/${file.filename}`,
            fileType,
            fileSize: file.size,
            fileOrder: i + 1
          },
          { autoCommit: false }
        );
      }
    }

    let tagList = [];

    if (Array.isArray(tags)) {
      tagList = tags;
    } else if (typeof tags === "string") {
      tagList = tags.split(",");
    }

    tagList = tagList
      .map((tag) => String(tag).trim().replace(/^#/, ""))
      .filter((tag) => tag !== "");

    if (tagList.length > 0) {

      const uniqueTagList = [...new Set(tagList)];

      for (const tagName of uniqueTagList) {
        const tagResult = await connection.execute(
          `
          SELECT *
          FROM SNS_TAG
          WHERE TAG_NAME = :tagName
          `,
          { tagName },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        let tagNo;

        if (tagResult.rows.length > 0) {
          tagNo = tagResult.rows[0].TAG_NO;
        } else {
          const insertTagResult = await connection.execute(
            `
            INSERT INTO SNS_TAG (
              TAG_NO,
              TAG_NAME,
              TAG_TYPE,
              ALGO_YN
            )
            VALUES (
              SEQ_SNS_TAG.NEXTVAL,
              :tagName,
              'USR',
              'N'
            )
            RETURNING TAG_NO INTO :tagNo
            `,
            {
              tagName,
              tagNo: {
                dir: oracledb.BIND_OUT,
                type: oracledb.NUMBER
              }
            },
            { autoCommit: false }
          );

          tagNo = insertTagResult.outBinds.tagNo[0];
        }

        await connection.execute(
          `
          INSERT INTO SNS_POST_TAG (
            POST_TAG_NO,
            POST_NO,
            TAG_NO
          )
          VALUES (
            SEQ_SNS_POST_TAG.NEXTVAL,
            :postNo,
            :tagNo
          )
          `,
          {
            postNo,
            tagNo
          },
          { autoCommit: false }
        );

        await updateTagAlgoYn(connection, tagNo);
      }
    }

    await saveUserActLog(connection, {
      userId,
      actType: "PST",
      targetType: "PST",
      targetNo: postNo,
    });

    await connection.commit();

    res.json({
      result: "success",
      message: "기록이 등록되었습니다.",
      postNo
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Post write error", err);

    res.status(500).json({
      result: "fail",
      message: "기록 등록 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 기록 수정
router.put("/edit/:postNo", authMiddleware, upload.array("files", 5), async (req, res) => {
  const userId = req.user.userId;
  const { postNo } = req.params;

  const {
    categoryNo,
    title,
    content,
    placeName,
    placeAddress,
    lat,
    lng,
    cmtYn,
    tags,
    removedFileNos
  } = req.body;

  if (!categoryNo || !title || !content) {
    return res.status(400).json({
      result: "fail",
      message: "카테고리, 제목, 내용을 입력해주세요."
    });
  }

  let removeFileNoList = [];

  if (removedFileNos) {
    try {
      removeFileNoList = JSON.parse(removedFileNos);
    } catch (err) {
      removeFileNoList = [];
    }
  }

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const ownerResult = await connection.execute(
      `
      SELECT *
      FROM SNS_POST
      WHERE POST_NO = :postNo
        AND USER_ID = :userId
        AND FEED_STATUS = 'ACT'
        AND IS_AD = 'N'
      `,
      { postNo: Number(postNo), userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        result: "fail",
        message: "수정할 기록을 찾을 수 없습니다."
      });
    }

    await connection.execute(
      `
      UPDATE SNS_POST
      SET CATEGORY_NO = :categoryNo,
          TITLE = :title,
          CONTENT = :content,
          PLACE_NAME = :placeName,
          PLACE_ADDRESS = :placeAddress,
          LAT = :lat,
          LNG = :lng,
          CMT_YN = :cmtYn
      WHERE POST_NO = :postNo
        AND USER_ID = :userId
      `,
      {
        categoryNo: Number(categoryNo),
        title,
        content,
        placeName: placeName || null,
        placeAddress: placeAddress || null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        cmtYn: cmtYn || "Y",
        postNo: Number(postNo),
        userId
      },
      { autoCommit: false }
    );

    if (removeFileNoList.length > 0) {
      await connection.executeMany(
        `
        DELETE FROM SNS_POST_FILE
        WHERE POST_NO = :postNo
          AND FILE_NO = :fileNo
        `,
        removeFileNoList.map((fileNo) => ({
          postNo: Number(postNo),
          fileNo: Number(fileNo)
        })),
        { autoCommit: false }
      );
    }

    const fileCountResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_POST_FILE
      WHERE POST_NO = :postNo
      `,
      { postNo: Number(postNo) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (fileCountResult.rows[0].CNT + req.files.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        result: "fail",
        message: "사진 또는 영상을 1개 이상 등록해주세요."
      });
    }

    const maxOrderResult = await connection.execute(
      `
      SELECT NVL(MAX(FILE_ORDER), 0) AS MAX_ORDER
      FROM SNS_POST_FILE
      WHERE POST_NO = :postNo
      `,
      { postNo: Number(postNo) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const maxOrder = maxOrderResult.rows[0].MAX_ORDER;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileType = file.mimetype.startsWith("image/") ? "IMG" : "VDO";

      await connection.execute(
        `
        INSERT INTO SNS_POST_FILE (
          FILE_NO,
          POST_NO,
          ORIGIN_NAME,
          SAVE_NAME,
          FILE_PATH,
          FILE_TYPE,
          FILE_SIZE,
          FILE_ORDER,
          CDATE
        )
        VALUES (
          SEQ_SNS_POST_FILE.NEXTVAL,
          :postNo,
          :originName,
          :saveName,
          :filePath,
          :fileType,
          :fileSize,
          :fileOrder,
          SYSDATE
        )
        `,
        {
          postNo: Number(postNo),
          originName: Buffer.from(file.originalname, "latin1").toString("utf8"),
          saveName: file.filename,
          filePath: `/uploads/post/${file.filename}`,
          fileType,
          fileSize: file.size,
          fileOrder: maxOrder + i + 1
        },
        { autoCommit: false }
      );
    }

    await connection.execute(
      `
      DELETE FROM SNS_POST_TAG
      WHERE POST_NO = :postNo
      `,
      { postNo: Number(postNo) },
      { autoCommit: false }
    );

    let tagList = [];

    if (Array.isArray(tags)) {
      tagList = tags;
    } else if (typeof tags === "string") {
      tagList = tags.split(",");
    }

    tagList = [...new Set(
      tagList
        .map((tag) => String(tag).trim().replace(/^#/, ""))
        .filter((tag) => tag !== "")
    )];

    for (const tagName of tagList) {
      const tagResult = await connection.execute(
        `
        SELECT *
        FROM SNS_TAG
        WHERE TAG_NAME = :tagName
        `,
        { tagName },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      let tagNo;

      if (tagResult.rows.length > 0) {
        tagNo = tagResult.rows[0].TAG_NO;
      } else {
        const insertTagResult = await connection.execute(
          `
          INSERT INTO SNS_TAG (
            TAG_NO,
            TAG_NAME,
            TAG_TYPE,
            ALGO_YN
          )
          VALUES (
            SEQ_SNS_TAG.NEXTVAL,
            :tagName,
            'USR',
            'N'
          )
          RETURNING TAG_NO INTO :tagNo
          `,
          {
            tagName,
            tagNo: {
              dir: oracledb.BIND_OUT,
              type: oracledb.NUMBER
            }
          },
          { autoCommit: false }
        );

        tagNo = insertTagResult.outBinds.tagNo[0];
      }

      await connection.execute(
        `
        INSERT INTO SNS_POST_TAG (
          POST_TAG_NO,
          POST_NO,
          TAG_NO
        )
        VALUES (
          SEQ_SNS_POST_TAG.NEXTVAL,
          :postNo,
          :tagNo
        )
        `,
        {
          postNo: Number(postNo),
          tagNo
        },
        { autoCommit: false }
      );

      await updateTagAlgoYn(connection, tagNo);
    }

    await connection.commit();

    res.json({
      result: "success",
      message: "기록이 수정되었습니다."
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Post edit error", err);

    res.status(500).json({
      result: "fail",
      message: "기록 수정 실패"
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;