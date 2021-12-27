var express = require('express');
var router = express.Router();
var yahoo = require('yahoo-stock-prices');
const chart = require('chart.js');
const bcrypt = require('bcrypt');
const mysql = require('../lib/db.js');
const canvas = require('canvas');
const chartRender = require('../lib/chartRender.js');
const transactionRender = require('../lib/transactionRender.js');
const moment = require('moment');

router.get('/', async(req, res) => {
  res.send("The API is working!");
});

// Route to retrieve the Financial Data from Yahoo Stock Prices API
router.get('/search/:symbol', async (req, res) => {
  const error = "Data for this symbol could not be found."
  try {
    const data = await yahoo.getCurrentData(req.params.symbol);
    res.send({ data });
  } catch (e) {
    console.log(e)
    res.send({ error });
  }
});

// Route to create a chart with Chart.js using data retrieved from the Yahoo Stock Prices API
router.get('/chart/:symbol', async (req, res) => {
  const today = new Date();
  let startMonth = today.getMonth() - 3; // startMonth will be 3 months prior to the current month.
  let startYear = today.getFullYear();
  // This conditional will make sure that the current month cannot be less than 0 (January).
  if (startMonth < 1) {
    if (startMonth === 0) {
      // If the startMonth is 1 behind January, it becomes December. Also, the year is not the current year, so it's the year before.
      startMonth = 12;
      startYear = today.getFullYear() - 1;
    }
    else if (startMonth === -1) {
      // If the startMonth is 2 behind January, it becomes November. Also, the year is not the current year, so it's the year before.
      startMonth = 11;
      startYear = today.getFullYear() - 1;
    }
    else if (startMonth === -2) {
      // If the startMonth is 3 behind January, it becomes October. Also, the year is not the current year, so it's the year before.
      startMonth = 10;
      startYear = today.getFullYear() - 1;
    }
    else {
      // If all else fails somehow, the startMonth will be January. Also, the year is not the current year, so it's the year before.
      startMonth = 1;
      startYear = today.getFullYear() - 1;
    }
  }
  let endMonth = today.getMonth() + 1 /* The +1 is needed here since the endMonth parameter of the API will not return any data from that month 
  (we want to display data for the current month as well). */
  console.log("startMonth ", startMonth, "endMonth ", endMonth)

  // This conditional will make sure that the current month cannot be greater than 12 (December).
  if (endMonth > 12) {
    // If the end month is greater than 11 (December), set it to 11.
    endMonth = 12;
  }

  let history = await yahoo.getHistoricalPrices(startMonth, 1, startYear, endMonth, today.getDay(),
    today.getFullYear(), req.params.symbol, "1wk");
  history.shift(); // This chops off an extra piece of data that would cause problems if it were there. 
  let historyPrice = [];
  history.map((item) => {
    if (item.adjclose !== undefined) {
      // For some stocks, sometimes the price will come up as undefined, we will remove those so the chart doesn't display a gap.
      historyPrice.push(item.adjclose);
    }
  })
  let historyDate = [];
  history.map((item) => {
    if (item.adjclose !== undefined) {
      // For some stocks, sometimes the price will come up as undefined, we will remove the dates of those so the chart doesn't display a gap.
      let newDate = new Date(item.date * 1000);
      let formatDate = moment(newDate);
      formatDate = formatDate.format("YYYY-MM-DD"); // Date will look a lot cleaner.
      historyDate.push(formatDate);
    }
  });
  // The dates and prices of the stocks show up from more recent to older. So we reverse that here so it's older to current, so the chart makes more sense. 
  let displayDates = historyDate.reverse();
  let displayPrices = historyPrice.reverse();
  // This is where the chart is drawn.
  let thisChart = chartRender.myCanvas
  let stockChart = new chart.Chart(thisChart, {
    type: 'line',
    data: {
      labels: displayDates.map((item) => item),
      datasets: [{
        label: req.params.symbol,
        data: displayPrices.map((item) => item),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  // We're converting the drawn chart to an Image.
  let img = new canvas.Image();
  img = thisChart.toDataURL(); // This makes it work with the src attribute of the HTML img element.
  res.send({ img });
  stockChart.destroy(); // Chart.js requires that we destroy the instance so that it can draw a new one when another symbol is searched.
});

// Route to retrieve the user's portfolio upon request based on userid.
router.get('/portfolio/:userid', async (req, res) => {
  let userid = req.params.userid;
  mysql.pool.getConnection((err, conn) => {
    if(err) throw err;
  conn.execute("SELECT * FROM vw_UserPortfolio WHERE userid= ?", [userid], async (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      console.log(results);
      res.send({ results })
    }
    else {
      console.log("Nothing retrieved at that id.")
    }

  })
  mysql.pool.releaseConnection(conn);
});
})

/* Route to create a chart for the user's transactions history. Getting the userid or info from database is unnecessary since sessionStorage
 has the most up-to-date infomation on the user's transactions history. */
// Using POST because it is easier to send the transactions array over.
router.post('/portfolio/view/', async (req, res) => {
  let transactionData = req.body.transactions;
  let transactionNumbers = [];
  for (let i = 1; i <= transactionData.length; i++) { // We use 1 as the start because we are using it as Transaction #'s not array indexes
    transactionNumbers.push(i);
  }
  let thisChart = transactionRender.transactionCanvas;
  let transactionChart = new chart.Chart(thisChart, {
    type: 'line',
    data: {
      labels: transactionNumbers.map((item) => item),
      datasets: [{
        label: "Wallet Balance",
        data: transactionData.map((item) => item),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 99, 132, 0.2)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  // We're converting the drawn chart to an Image.
  let img = new canvas.Image();
  img = thisChart.toDataURL(); // This makes it work with the src attribute of the HTML img element.
  res.send({ img });
  transactionChart.destroy(); // Chart.js requires that we destroy the instance so that it can draw a new one next time.
});

// Route to check if the credentials match when you login.
// POST request was used here since GET requests are not ideal for dealing with sensitive information.
router.post('/portfolio', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  mysql.pool.getConnection((err, conn) => {
    if (err) throw err;
    // Decrypt the password to check if they match.
    conn.execute("SELECT * FROM Users WHERE username = ?", [username], async (err, results) => {
      if (err) throw err;
      const error = "Invalid login information."
      if (results.length > 0) {
        // Compare the encrypted password first.
        let matchPassword = await bcrypt.compare(password.toString(), results[0].password.toString());
        if (matchPassword) { // Passwords match
          // Retrieve from a view I made in the database that joins the users and portfolio tables on portfolioid. User and portfolio id will be the same.
          conn.execute("SELECT * FROM vw_UserPortfolio WHERE userid = ?", [results[0].userid], async (err, results) => {
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
    mysql.pool.releaseConnection(conn);
  })

});

// Inserting a new user into database
// PUT was used here because as seen above, since I used a POST request to handle sensitive information using the same route.  
router.put('/portfolio', async (req, res) => {
  let username = req.body.username;
  mysql.pool.getConnection((err, conn) => {
    if (err) throw err;
  // Check if the username already exists
  conn.execute("SELECT * FROM Users WHERE username = ?", [username], async (err, results) => {
    if (err) throw err;
    const error = "Username already exists!";
    if (results.length > 0) {
      res.send({ error });
    }
    else {
      // Encrypt the password
      let password = bcrypt.hashSync(req.body.password, 10);
      conn.execute("INSERT INTO Users (username, password) VALUES (?, ?)", [username, password], async (err, results) => {
        if (err) throw err;
        console.log(results);
      });
      // I have my database automatically create a new portfolio when a user is made, this just matches the ids in the users table so they will be able to be joined.
      conn.execute("UPDATE Users SET portfolioid=LAST_INSERT_ID() WHERE userid=LAST_INSERT_ID()", async (err, results) => {
        if (err) throw err;
        console.log(results);
      });

    }
    
  });
  mysql.pool.releaseConnection(conn);
  });
});

// Route used to save the portfolio.
router.put('/portfolio/save', async (req, res) => {
  const error = "Portfolio could not be saved."
  let collection = req.body.portfolioData
  let wallet = req.body.currentWallet
  let transactions = req.body.transactions;
  mysql.pool.getConnection((err, conn) => {
    if (err) throw err;
    // Update the user's collection and wallet in their portfolio
    conn.query("UPDATE Portfolio SET collection = ?, wallet = ?, transactions = ? WHERE portfolioid = ?", [JSON.stringify(collection), wallet, JSON.stringify(transactions), req.body.portfolioId], async (err, results) => {
      if (err) throw err;
      if (results.changedRows > 0) {
        // We use changedRows because that tells us if anything was actually updated.
        res.send({ results });
      }
      else {
        res.send({ error });
      }
    })
    mysql.pool.releaseConnection(conn);
  })

});

module.exports = router;
