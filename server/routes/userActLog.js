const { oracledb } = require("../db");

async function saveUserActLog(connection, {
  userId,
  actType,
  targetType,
  targetNo,
  targetId,
  score
}) {
  if (!userId || !actType || !targetType) return;

  if (actType === "VIW" && targetType === "PST" && targetNo) {
    const duplicateResult = await connection.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM SNS_USER_ACT_LOG
      WHERE USER_ID = :userId
        AND ACT_TYPE = 'VIW'
        AND TARGET_TYPE = 'PST'
        AND TARGET_NO = :targetNo
        AND CDATE >= SYSDATE - (30 / 1440)
      `,
      {
        userId,
        targetNo
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (duplicateResult.rows[0].CNT > 0) {
      return;
    }
  }

  let finalScore = score;

  if (finalScore === undefined || finalScore === null) {
    const scoreResult = await connection.execute(
      `
      SELECT SCORE
      FROM SNS_ACT_SCORE
      WHERE ACT_TYPE = :actType
        AND USE_YN = 'Y'
      `,
      { actType },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    finalScore =
      scoreResult.rows.length > 0
        ? scoreResult.rows[0].SCORE
        : 0;
  }

  await connection.execute(
    `
    INSERT INTO SNS_USER_ACT_LOG (
      LOG_NO,
      USER_ID,
      ACT_TYPE,
      TARGET_TYPE,
      TARGET_NO,
      TARGET_ID,
      SCORE,
      CDATE
    )
    VALUES (
      SEQ_SNS_USER_ACT_LOG.NEXTVAL,
      :userId,
      :actType,
      :targetType,
      :targetNo,
      :targetId,
      :score,
      SYSDATE
    )
    `,
    {
      userId,
      actType,
      targetType,
      targetNo: targetNo || null,
      targetId: targetId || null,
      score: finalScore
    },
    { autoCommit: false }
  );
}

async function updateTagAlgoYn(connection, tagNo) {
  if (!tagNo) return;

  await connection.execute(
    `
    UPDATE SNS_TAG T
    SET T.ALGO_YN = 'Y'
    WHERE T.TAG_NO = :tagNo
      AND T.ALGO_YN = 'N'
      AND (
        SELECT COUNT(*)
        FROM SNS_POST_TAG PT
        WHERE PT.TAG_NO = T.TAG_NO
      ) >= 3
      AND (
        SELECT COUNT(*)
        FROM SNS_USER_ACT_LOG L
        WHERE L.ACT_TYPE = 'SCH'
          AND L.TARGET_TYPE = 'TAG'
          AND L.TARGET_NO = T.TAG_NO
      ) >= 5
    `,
    { tagNo },
    { autoCommit: false }
  );
}

module.exports = {
  saveUserActLog,
  updateTagAlgoYn
};