const express = require('express');
const router = express.Router();
const exec = require('child_process').exec;
const config = require('../config.js');

/* Port number for currently running "testrpc" */
let port = '';

router.post('/start', (req, res) => {
	const params = req.body.params;
	
	let arr = params.split(/ +/);
	let portIndex = arr.indexOf('-p');
	if (portIndex === -1) {
		portIndex = arr.indexOf('--port');
	}
	
	port = (portIndex === -1) ? '8545' : arr[portIndex + 1];

	proc = exec(`${config.testrpcCmd} ${params} | tee ${config.testrpcOut}`, 
				(err, stdout, stderr) => {});

	res.json({ success: true });
});

router.post('/stop', (req, res) => {
	if (!port) {
		res.json({success: false});
		return;
	}

	exec("kill `lsof -i :" + port + " | tail -n 1 | awk  '{print $2}'`");
	port = '';
	res.json({success: true});
});


module.exports = router;
