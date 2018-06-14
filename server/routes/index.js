const express = require('express');
const router = express.Router();

router.use('/testrpc', require('./testrpc.js'));
router.use('/mqtt', require('./mqtt.js'));

module.exports = router;
