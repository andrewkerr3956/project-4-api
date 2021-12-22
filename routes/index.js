var express = require('express');
var router = express.Router();
var yahoo = require('yahoo-stock-prices');
const chart = require('chart.js');
const bcrypt = require('bcrypt');
const mysql = require('../lib/db.js');
const canvas = require('canvas');
const chartRender = require('../lib/chartRender.js');


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

router.get('/api/chart/', async(req, res) => {
  let thisChart = chartRender.myCanvas
  let stockChart = new chart.Chart(thisChart, {
    type: 'line',
    data: {
      labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
      datasets: [{
          label: 'Financial Data',
          data: [12, 19, 3, 5, 2, 3],
          backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)'
          ],
          borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
      }],
      options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
  },
  })
  let img = new canvas.Image();
  img = thisChart.toDataURL();
  res.send({img});
  stockChart.destroy();
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
        mysql.conn.query(`SELECT * FROM vw_UserPortfolio WHERE userid = ${results[0].userid}`, async (err, results) => {
          if (err) throw err;
          if (results > 0) {
            console.log("Portfolio successfully retrieved!");
          }
          res.send({ results });
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

router.put('/api/portfolio/save', async (req, res) => {
  const error = "Portfolio could not be saved."
  let collection = req.body.portfolioData
  let wallet = req.body.currentWallet
  console.log(collection);
  mysql.conn.query(`UPDATE Portfolio SET collection = '${JSON.stringify(collection)}', wallet=${wallet} WHERE portfolioid = ${req.body.portfolioId}`, async (err, results) => {
    if (err) throw err;
    console.log(results);
    if (results.changedRows > 0) {
      res.send({ results });
    }
    else {
      res.send({ error });
    }
    console.log(results)
  })
});

module.exports = router;
