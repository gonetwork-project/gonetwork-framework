export type ConfigValue = {
	port: number,
	testrpcCmd: string,
	testrpcOut: string,
	mqttPort: number
};

export type Config = {
	[key:string]: ConfigValue
}

const cfg:Config = {
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

const env = process.env.NODE_ENV || 'develop';
export default cfg[env];
