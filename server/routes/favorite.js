const express = require("express");
const router = express.Router();

const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// 내 찜 폴더 목록 조회
router.get("/folders", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;

    const result = await connection.execute(
      `
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
      GROUP BY
        F.FOLDER_NO,
        F.USER_ID,
        F.FOLDER_NAME,
        F.FOLDER_INFO,
        F.IS_SHARED,
        F.CDATE
      ORDER BY F.CDATE DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const folderList = result.rows.map((folder) => ({
      folderNo: folder.FOLDER_NO,
      userId: folder.USER_ID,
      folderName: folder.FOLDER_NAME,
      folderInfo: folder.FOLDER_INFO || "",
      isShared: folder.IS_SHARED,
      placeCount: folder.PLACE_COUNT || 0,
      cdate: folder.CDATE
    }));

    res.json({
      result: "success",
      folderList
    });
  } catch (err) {
    console.error("Favorite folder list error:", err);

    res.status(500).json({
      result: "fail",
      message: "찜 폴더를 불러오지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 새 찜 폴더 생성
router.post("/folders", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;
    const { folderName, folderInfo, isShared } = req.body;

    if (!folderName || !folderName.trim()) {
      return res.status(400).json({
        result: "fail",
        message: "폴더명을 입력해주세요."
      });
    }

    const sharedValue = isShared === "Y" ? "Y" : "N";

    const duplicateResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_FAVORITE_FOLDER
      WHERE USER_ID = :userId
        AND FOLDER_NAME = :folderName
      `,
      {
        userId,
        folderName: folderName.trim()
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (duplicateResult.rows[0].CNT > 0) {
      return res.status(409).json({
        result: "fail",
        message: "이미 같은 이름의 폴더가 있습니다."
      });
    }

    const insertResult = await connection.execute(
      `
      INSERT INTO SNS_FAVORITE_FOLDER (
        FOLDER_NO,
        USER_ID,
        FOLDER_NAME,
        FOLDER_INFO,
        IS_SHARED,
        CDATE
      )
      VALUES (
        SEQ_SNS_FAVORITE_FOLDER.NEXTVAL,
        :userId,
        :folderName,
        :folderInfo,
        :isShared,
        SYSDATE
      )
      RETURNING FOLDER_NO INTO :folderNo
      `,
      {
        userId,
        folderName: folderName.trim(),
        folderInfo: folderInfo || null,
        isShared: sharedValue,
        folderNo: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER
        }
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "폴더가 생성되었습니다.",
      folder: {
        folderNo: insertResult.outBinds.folderNo[0],
        userId,
        folderName: folderName.trim(),
        folderInfo: folderInfo || "",
        isShared: sharedValue,
        placeCount: 0
      }
    });
  } catch (err) {
    console.error("Favorite folder insert error:", err);

    res.status(500).json({
      result: "fail",
      message: "폴더 생성에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 내가 이 장소를 찜한 적 있는지 확인
router.get("/place/check", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;
    const { placeName, placeAddress } = req.query;

    if (!placeName || !placeAddress) {
      return res.json({
        result: "success",
        favoritedYn: false
      });
    }

    const result = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_FAVORITE_PLACE
      WHERE USER_ID = :userId
        AND PLACE_NAME = :placeName
        AND PLACE_ADDRESS = :placeAddress
      `,
      {
        userId,
        placeName,
        placeAddress
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      result: "success",
      favoritedYn: result.rows[0].CNT > 0
    });
  } catch (err) {
    console.error("Favorite place check error:", err);

    res.status(500).json({
      result: "fail",
      message: "찜 여부를 확인하지 못했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 업체 찜 저장
router.post("/place", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;
    const {
      folderNo,
      placeName,
      placeAddress,
      lat,
      lng,
      memo
    } = req.body;

    if (!folderNo || !placeName || !placeAddress || lat === undefined || lng === undefined) {
      return res.status(400).json({
        result: "fail",
        message: "업체 정보가 부족합니다."
      });
    }

    const folderResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_FAVORITE_FOLDER
      WHERE FOLDER_NO = :folderNo
        AND USER_ID = :userId
      `,
      {
        folderNo,
        userId
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (folderResult.rows[0].CNT === 0) {
      return res.status(403).json({
        result: "fail",
        message: "선택한 폴더에 저장할 수 없습니다."
      });
    }

    const duplicateResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_FAVORITE_PLACE
      WHERE USER_ID = :userId
        AND FOLDER_NO = :folderNo
        AND PLACE_NAME = :placeName
        AND PLACE_ADDRESS = :placeAddress
      `,
      {
        userId,
        folderNo,
        placeName,
        placeAddress
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (duplicateResult.rows[0].CNT > 0) {
      return res.status(409).json({
        result: "fail",
        message: "이미 이 폴더에 저장된 업체입니다."
      });
    }

    await connection.execute(
      `
      INSERT INTO SNS_FAVORITE_PLACE (
        FAVORITE_NO,
        FOLDER_NO,
        USER_ID,
        PLACE_NAME,
        PLACE_ADDRESS,
        LAT,
        LNG,
        MEMO,
        CDATE
      )
      VALUES (
        SEQ_SNS_FAVORITE_PLACE.NEXTVAL,
        :folderNo,
        :userId,
        :placeName,
        :placeAddress,
        :lat,
        :lng,
        :memo,
        SYSDATE
      )
      `,
      {
        folderNo,
        userId,
        placeName,
        placeAddress,
        lat,
        lng,
        memo: memo || null
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "업체가 저장되었습니다.",
      favoritedYn: true
    });
  } catch (err) {
    console.error("Favorite place insert error:", err);

    res.status(500).json({
      result: "fail",
      message: "업체 저장에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 찜 폴더 삭제
router.delete("/folders/:folderNo", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const userId = req.user.userId;
    const { folderNo } = req.params;

    const folderResult = await connection.execute(
      `
      SELECT FOLDER_NO
      FROM SNS_FAVORITE_FOLDER
      WHERE FOLDER_NO = :folderNo
        AND USER_ID = :userId
      `,
      { folderNo, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (folderResult.rows.length === 0) {
      return res.status(403).json({
        result: "fail",
        message: "삭제할 수 없는 폴더입니다."
      });
    }

    await connection.execute(
      `
      DELETE FROM SNS_FAVORITE_PLACE
      WHERE FOLDER_NO = :folderNo
        AND USER_ID = :userId
      `,
      { folderNo, userId },
      { autoCommit: false }
    );

    await connection.execute(
      `
      DELETE FROM SNS_FAVORITE_FOLDER
      WHERE FOLDER_NO = :folderNo
        AND USER_ID = :userId
      `,
      { folderNo, userId },
      { autoCommit: false }
    );

    await connection.commit();

    res.json({
      result: "success",
      message: "폴더가 삭제되었습니다."
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("Favorite folder delete error:", err);

    res.status(500).json({
      result: "fail",
      message: "폴더 삭제에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;