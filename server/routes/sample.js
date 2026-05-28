const express = require("express");
const router = express.Router();

const { oracledb, dbConfig } = require("../db");

router.get("/", async (req, res) => {

  let conn;

  try {

    conn = await oracledb.getConnection(dbConfig);

    const result = await conn.execute(`
      SELECT *
      FROM USERS
    `);

    res.json(result.rows);

  } catch (err) {

    console.log(err);

    res.status(500).send("DB 오류");

  } finally {

    if (conn) {
      await conn.close();
    }

  }

});

module.exports = router;