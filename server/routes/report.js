const express = require("express");
const router = express.Router();

const { oracledb, dbConfig } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const reporterId = req.user.userId;
    const { targetType, targetId, targetNo, reason, detail } = req.body;

    if (!["PST", "CMT", "USR"].includes(targetType)) {
      return res.status(400).json({
        result: "fail",
        message: "신고 대상이 올바르지 않습니다."
      });
    }

    if (!targetId || !reason || !reason.trim()) {
      return res.status(400).json({
        result: "fail",
        message: "신고 사유를 선택해주세요."
      });
    }

    if ((targetType === "PST" || targetType === "CMT") && !targetNo) {
      return res.status(400).json({
        result: "fail",
        message: "신고 대상 번호가 없습니다."
      });
    }

    if (targetType === "USR" && reporterId === targetId) {
      return res.status(400).json({
        result: "fail",
        message: "자기 자신은 신고할 수 없습니다."
      });
    }

    const duplicateResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_REPORT
      WHERE REPORTER_ID = :reporterId
        AND TARGET_TYPE = :targetType
        AND TARGET_ID = :targetId
        AND NVL(TARGET_NO, -1) = NVL(:targetNo, -1)
        AND STATUS = 'WAT'
      `,
      {
        reporterId,
        targetType,
        targetId,
        targetNo: targetNo || null
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (duplicateResult.rows[0].CNT > 0) {
      return res.status(409).json({
        result: "fail",
        message: "이미 신고한 대상입니다."
      });
    }

    await connection.execute(
      `
      INSERT INTO SNS_REPORT (
        REPORT_NO,
        REPORTER_ID,
        TARGET_TYPE,
        TARGET_NO,
        TARGET_ID,
        REASON,
        DETAIL,
        STATUS,
        CDATE
      ) VALUES (
        SEQ_SNS_REPORT.NEXTVAL,
        :reporterId,
        :targetType,
        :targetNo,
        :targetId,
        :reason,
        :detail,
        'WAT',
        SYSDATE
      )
      `,
      {
        reporterId,
        targetType,
        targetNo: targetNo || null,
        targetId,
        reason: reason.trim(),
        detail: detail && detail.trim() ? detail.trim() : null
      },
      { autoCommit: true }
    );

    res.json({
      result: "success",
      message: "신고가 접수되었습니다."
    });

  } catch (err) {
    console.error("Report insert error:", err);

    res.status(500).json({
      result: "fail",
      message: "신고 접수에 실패했습니다."
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;