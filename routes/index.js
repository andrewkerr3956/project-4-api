var express = require('express');
var router = express.Router();
var yahoo = require('yahoo-stock-prices');
const bcrypt = require('bcrypt');
const mysql = require('../lib/db.js');


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
  mysql.conn.connect();
});

router.get('/api/search/:symbol', async (req, res) => {
  try {
    const data = await yahoo.getCurrentData(req.params.symbol);
    res.json({ success: true, data: data });
  } catch (e) {
    console.log(e)
    res.json({ success: false, data: "Unsuccessful." });
  }
});

// Checking if the credentials match when you login.
router.post('/api/portfolio/', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  // Decrypt the password to check if they match.
  const user = mysql.conn.query(`SELECT * FROM Users WHERE username='${username}'`, async (err, results) => {
    if (err) throw err;
    console.log(results);
    const matchPassword = await bcrypt.compare(password.toString(), results[0].password.toString());
    if (matchPassword) {
      console.log("Logged in!!!");
    }
  });
});

// Inserting a new user into database
router.put('/api/portfolio/', async (req, res) => {
  let username = req.body.username;
  // Check if the username already exists
  mysql.conn.query(`SELECT * FROM Users WHERE Username = '${username}'`, async (err, results) => {
    if (err) throw err;
    if (results > 0) {
      console.log("Username already exists!");
    }
    if(results <= 0) {
      // Encrypt the password
      let password = bcrypt.hashSync(req.body.password, 10);
      mysql.conn.query(`INSERT INTO Users (username, password) VALUES ('${username}', '${password}')`, async (err, results) => {
        if (err) throw err;
        console.log(results);
      });
    }
  });
});


module.exports = router;
