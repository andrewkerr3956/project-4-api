var express = require('express');
var router = express.Router();
var yahoo =  require('yahoo-stock-prices');
import { Sequelize, Model, DataType } from 'sequelize';
const sequelize = new Sequelize('Users', 'root', 'root', {
  dialect: 'mysql'
}); 

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/api/search/:symbol', async(req, res) => {
  try {
    // res.set('Access-Control-Allow-Origin', '*');
    const data = await yahoo.getCurrentData(req.params.symbol);
    res.json({success: true, data: data});
  } catch(e) {
    console.log(e)
    res.json({success: false, data:"Unsuccessful."});
  }
});

router.put('/api/users/:params', (req, res) => {
  let query = encodeURI(req.params);
  sequelize.query(`INSERT INTO Users (username, password) VALUES (${query.username}, ${query.password})`).then([results, metadata]);
})

module.exports = router;
