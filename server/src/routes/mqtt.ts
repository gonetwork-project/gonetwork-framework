import * as express from 'express'
import * as mosca from 'mosca';

import config from '../config'

const router = express.Router();

const settings = {
	port: config.mqttPort
}

let server: mosca.Server;

router.post('/start', (req, res) => {
	server = new mosca.Server(settings);
	server.on('ready', () => {
		console.log(`Server started at port: ${config.mqttPort}`);
		res.json({ success: true });
	});
});

router.post('/stop', (req, res) => {
	if (!server) {
		res.json({success: false});
		return;
	}

	server.close();
	
	res.json({success: true});
});


export default router;
