/*
* @Author: amitshah
* @Date:   2018-05-09 12:54:34
* @Last Modified by:   amitshah
* @Last Modified time: 2018-05-10 00:39:16
*/
const tape = require('tape');
const blockchain = require('../lib/blockchain/blockchain');
const logDecoder = require('../lib/monitoring/log-decoder');
const util = require('ethereumjs-util');
const fs = require('fs');

var bc = new blockchain.BlockchainService(3, function (cb) {
	return;
}, 'https://ropsten.infura.io');

let address = util.toBuffer("0x8ed2dfe5Ae460657CF8086975B81fCcA87add0f1");

async function getTestLogs(address, filename) {
	if (!fs.existsSync(filename)) {
		var logs = await bc.getLogs(address, new util.BN(0), new util.BN(3201827, 10), []);
		fs.writeFileSync(filename, JSON.stringify(logs));
	}
}

function fnFormatter(name) {
	return './test/data/' + name + '-logs.json';
}

const keysByType = ls =>
	ls.reduce((acc, l) => {
		acc[l._type] = l
		return acc
	}, {});

(async () => {
	await getTestLogs("0x8ed2dfe5Ae460657CF8086975B81fCcA87add0f1", fnFormatter("netting-channel"));
	await getTestLogs("0xde8a6a2445c793db9af9ab6e6eaacf880859df01", fnFormatter("channel-manager"));
	await getTestLogs("0xa28a7a43bc389064ab5d16c0338968482b4e02bd", fnFormatter("human-standard"));

	[
		[logDecoder.decodeNettingChannel, "netting-channel"],
		[logDecoder.decodeChannelManager, "channel-manager"],
		[logDecoder.decodeToken, "human-standard"]
	].forEach(([decode, name]) => {
		const r = JSON.parse(fs.readFileSync(fnFormatter(name)))
			.map(decode)
		console.log(`\n ${name} -- total: ${r.length}`)
		// console.log(r[0], r[1], r[9])
		console.log(keysByType(r))
	})
})()
