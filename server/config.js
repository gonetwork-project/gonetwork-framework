const cfg = {
	'develop': {
		port: 3000,
		testrpcCmd: 'node node_modules/ethereumjs-testrpc/build/cli.node.js ',
		testrpcOut: 'testrpc.log',
		mqttPort: 1883
	},
	'production': {
		port: 3000,
		testrpcCmd: 'node node_modules/ethereumjs-testrpc/build/cli.node.js ',
		testrpcOut: 'testrpc.log',
		mqttPort: 1883
	}
};

module.exports = cfg[process.env.NODE_ENV] || cfg['develop'];
