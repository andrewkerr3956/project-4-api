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
  const error = "Data for this symbol could not be found."
  try {
    const data = await yahoo.getCurrentData(req.params.symbol);
    res.send({ data });
  } catch (e) {
    console.log(e)
    res.send({ error });
  }
});

router.get('/api/portfolio/:userid', async (req, res) => {
  let userid = req.params.userid;
  mysql.conn.query(`SELECT * FROM vw_UserPortfolio WHERE userid=${userid} `, async (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      console.log(results);
      res.send({ results })
    }
    else {
      console.log("Nothing retrieved at that id.")
    }
  })
})

// Checking if the credentials match when you login.
router.post('/api/portfolio/', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  // Decrypt the password to check if they match.
  mysql.conn.query(`SELECT * FROM Users WHERE username='${username}'`, async (err, results) => {
    if (err) throw err;
    const error = "Invalid login information."
    console.log(results);
    if (results.length > 0) {
      let matchPassword = await bcrypt.compare(password.toString(), results[0].password.toString());
      if (matchPassword) {
        console.log("Logged in!!!");
        console.log(`Retrieving portfolio at ${results[0].userid}...`);
        mysql.conn.query(`SELECT * FROM vw_UserPortfolio WHERE userid = ${results[0].userid}`, async(err, results) => {
          if(err) throw err;
          if(results > 0) {
            console.log("Portfolio successfully retrieved!");
          }
          res.send( { results } );
        });     
      }
      else {
        res.send({ error })
      }
    }
    else {
      res.send({ error });
    }
  });
  

});

// Inserting a new user into database
router.put('/api/portfolio/', async (req, res) => {
  let username = req.body.username;
  // Check if the username already exists
  mysql.conn.query(`SELECT * FROM Users WHERE Username = '${username}'`, async (err, results) => {
    if (err) throw err;
    const error = "Username already exists!";
    if (results.length > 0) {
      res.send({ error });
    }
    else {
      // Encrypt the password
      let password = bcrypt.hashSync(req.body.password, 10);
      mysql.conn.query(`INSERT INTO Users (username, password) VALUES ('${username}', '${password}')`, async (err, results) => {
        if (err) throw err;
        console.log(results);
      });
      mysql.conn.query(`UPDATE Users SET portfolioid=LAST_INSERT_ID() WHERE userid=LAST_INSERT_ID()`, async (err, results) => {
        if (err) throw err;
        console.log(results);
      });
    }
  });
});

router.put('/api/portfolio/save', async(req, res) => {
  const error = "Portfolio could not be saved."
  let collection = req.body.portfolioData
  console.log(collection);
  mysql.conn.query(`UPDATE Portfolio SET collection = '${JSON.stringify(collection)}' WHERE portfolioid = ${req.body.portfolioId}`, async(err, results) => {
    if (err) throw err;
    console.log(results);
    if(results.changedRows > 0) {
      res.send({ results });
    }
    else {
      res.send({ error });
    }
    console.log(results)
  })
});

module.exports = router;
