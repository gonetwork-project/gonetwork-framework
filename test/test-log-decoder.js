/*
* @Author: amitshah
* @Date:   2018-05-09 12:54:34
* @Last Modified by:   amitshah
* @Last Modified time: 2018-05-10 00:32:38
*/
const tape = require('tape');
const blockchain = require('../lib/blockchain/blockchain');
const logDecoder = require('../lib/blockchain/log-decoder');
const util = require('ethereumjs-util');
const fs = require('fs');

let ld = new logDecoder.LogDecoder();

console.log(ld);


 var bc = new blockchain.BlockchainService(3, function (cb) {
    return;
  },'https://ropsten.infura.io/QxoWjkfgF4aVMUV4rbTG');

let address=util.toBuffer("0x8ed2dfe5Ae460657CF8086975B81fCcA87add0f1");

async function  getTestLogs (address,filename){
	if (!fs.existsSync(filename)) {
   		var logs = await bc.getLogs(address,new util.BN(0),new util.BN(3201827,10),[]);
		fs.writeFileSync(filename, JSON.stringify(logs));
	}
}

function fnFormatter(name){
	return './test/data/'+name+'-logs.json';
}

(async()=>{
	await getTestLogs("0x8ed2dfe5Ae460657CF8086975B81fCcA87add0f1",fnFormatter("netting-channel"));
	await getTestLogs("0xde8a6a2445c793db9af9ab6e6eaacf880859df01",fnFormatter("channel-manager"));
	await getTestLogs("0xa28a7a43bc389064ab5d16c0338968482b4e02bd",fnFormatter("human-standard"));
	
	
	var ncLogs = JSON.parse(fs.readFileSync(fnFormatter("netting-channel")));
	var cmLogs = JSON.parse(fs.readFileSync(fnFormatter("channel-manager")));
	var hsLogs = JSON.parse(fs.readFileSync(fnFormatter("human-standard")));

	hsLogs.map(l=>{
		console.log(ld.decode(l));
	});

	ncLogs.map(l=>{
		console.log(ld.decode(l));		
	});

	cmLogs.map(l=>{
		console.log(ld.decode(l));
	})

})()

