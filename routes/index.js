var express = require('express');
var router = express.Router();
var yahoo =  require('yahoo-stock-prices');

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

module.exports = router;
