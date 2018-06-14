const express = require('express');
const router = express.Router();
const mosca = require('mosca');
const config = require('../config.js');

const settings = {
	port: config.mqttPort
}

let server = null;

router.post('/start', (req, res) => {
	server = new mosca.Server(settings);
	server.on('ready', () => {
		console.log(`Server started at port: ${config.mqttPort}`);
		res.json({ success: true });
	});
	console.log(server);
});

router.post('/stop', (req, res) => {
	if (!server) {
		res.json({success: false});
		return;
	}

	server.close();
	//TODO stop server
	
	res.json({success: true});
});


module.exports = router;
