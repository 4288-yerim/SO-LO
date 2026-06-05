const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

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

// 광고 태그 조회
router.get("/tag", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `
      SELECT *
      FROM SNS_AD_TAG
      WHERE USE_YN = 'Y'
      ORDER BY AD_TAG_NO
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      adTagList: result.rows
    });
  } catch (err) {
    console.error("Ad tag list error", err);

    res.status(500).json({
      result: "fail",
      message: "광고 태그 조회 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// 광고글 작성
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
    tags,
    adTags,
    adLinks
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

  let adTagList = [];

  if (Array.isArray(adTags)) {
    adTagList = adTags;
  } else if (adTags) {
    adTagList = [adTags];
  }

  adTagList = adTagList
    .map((tagNo) => Number(tagNo))
    .filter((tagNo) => !Number.isNaN(tagNo));

  if (adTagList.length === 0) {
    return res.status(400).json({
      result: "fail",
      message: "광고 태그를 1개 이상 선택해주세요."
    });
  }

  let linkList = [];

  try {
    linkList = JSON.parse(adLinks || "[]");
  } catch (err) {
    linkList = [];
  }

  linkList = linkList.filter((link) => {
    return link.linkName && link.linkUrl;
  });

  const invalidLink = linkList.find((link) => {
    const linkName = String(link.linkName).trim();
    const linkUrl = String(link.linkUrl).trim();

    return (
      linkName.length > 20 ||
      !/^https?:\/\//i.test(linkUrl)
    );
  });

  if (invalidLink) {
    return res.status(400).json({
      result: "fail",
      message: "링크명은 20자 이하, URL은 http:// 또는 https:// 형식이어야 합니다."
    });
  }

  linkList = linkList.map((link) => ({
    linkIcon: link.linkIcon || "",
    linkName: String(link.linkName).trim(),
    linkUrl: String(link.linkUrl).trim()
  }));

  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userResult = await connection.execute(
      `
      SELECT USER_BIZ
      FROM SNS_USERS
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userResult.rows.length === 0 || userResult.rows[0].USER_BIZ !== "Y") {
      return res.status(403).json({
        result: "fail",
        message: "비즈니스 계정만 광고글을 작성할 수 있습니다."
      });
    }

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
        'Y',
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

    let tagList = [];

    if (Array.isArray(tags)) {
      tagList = tags;
    } else if (typeof tags === "string") {
      tagList = tags.split(",");
    }

    tagList = tagList
      .map((tag) => String(tag).trim().replace(/^#/, ""))
      .filter((tag) => tag !== "");

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
    }

    const uniqueAdTagList = [...new Set(adTagList)];

    for (const adTagNo of uniqueAdTagList) {
      await connection.execute(
        `
        INSERT INTO SNS_AD_POST_TAG (
          AD_POST_TAG_NO,
          POST_NO,
          AD_TAG_NO,
          CDATE
        )
        VALUES (
          SEQ_SNS_AD_POST_TAG.NEXTVAL,
          :postNo,
          :adTagNo,
          SYSDATE
        )
        `,
        {
          postNo,
          adTagNo
        },
        { autoCommit: false }
      );
    }

    for (let i = 0; i < linkList.length; i++) {
      const link = linkList[i];

      await connection.execute(
        `
        INSERT INTO SNS_AD_LINK (
          LINK_NO,
          POST_NO,
          LINK_NAME,
          LINK_URL,
          LINK_ICON,
          LINK_ORDER,
          CDATE
        )
        VALUES (
          SEQ_SNS_AD_LINK.NEXTVAL,
          :postNo,
          :linkName,
          :linkUrl,
          :linkIcon,
          :linkOrder,
          SYSDATE
        )
        `,
        {
          postNo,
          linkName: link.linkName,
          linkUrl: link.linkUrl,
          linkIcon: link.linkIcon || null,
          linkOrder: i + 1
        },
        { autoCommit: false }
      );
    }

    await connection.commit();

    res.json({
      result: "success",
      message: "광고글이 등록되었습니다.",
      postNo
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Ad post write error", err);

    res.status(500).json({
      result: "fail",
      message: "광고글 등록 실패"
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;