/*
* @Author: amitshah
* @Date:   2018-05-21 22:01:45
* @Last Modified by:   amitshah
* @Last Modified time: 2018-05-24 22:45:10
*/


// var HumanStandardTokenJson = require("./smart-contracts/build/contracts/HumanStandardToken.json");
// var StandardTokenJson = require("./build/contracts/StandardToken.json");
// var ChannelManagerJson =require("./build/contracts/ChannelManagerContract.json");
// var ChannelManagerJson = require("./build/contracts/ChannelManagerLibrary.json");
// var NettingChannelJson =require("./build/contracts/NettingChannelContract.json");
// var NettingChannelJson = require("./build/contracts/NettingChannelLibrary.json");
// var UtilsJson = require("./build/contracts/Utils.json");

const process = require("process");
const fs = require("fs");
const WalletProvider = require("truffle-wallet-provider");
const util = require("ethereumjs-util");
const EthereumWallet = require("ethereumjs-wallet");
var Contract = require("truffle-contract");
const blockchain = require("../lib/blockchain/blockchain");


var wallet = null;

var args = process.argv.slice(2);
var k = args.indexOf("--generate");
if(k>=0){
    wallet = require("ethereumjs-wallet").generate();
  	fs.writeFileSync("v3_wallet.json", JSON.stringify(wallet.toV3("",[true])));
}else{
	try{
	  var data = JSON.parse(fs.readFileSync("v3_wallet.json"));
	  console.log(JSON.stringify(data));
	  wallet = EthereumWallet.fromV3(data, "", [true]);
	}catch(err){
		console.log("Cannot find v3_wallet.json in the current directory.  You can generate by running this script and passing --generate flag");
	}
} 
var provider = new WalletProvider(wallet, "https://ropsten.infura.io/");




const BUILD_DIR = "../smart-contracts/build/contracts/";
const builtContracts = fs.readdirSync(BUILD_DIR).reduce((result,build)=>{
	var json = JSON.parse(fs.readFileSync(BUILD_DIR + build ));
	console.log(json);
	var ct= Contract(json);
	ct.setProvider(provider);

	ct.defaults({from: provider.address,       
      	gas:3500000,
      	gasPrice:1000000000})
	ct.setNetwork(3);
	result[build.split(".")[0]]= ct ;
	return result;
},{});

const bcs = new blockchain.BlockchainService(new util.BN(3), function(callback){
	callback(wallet.getPrivateKey());
}, "https://ropsten.infura.io/");

(async ()=>{

	
})();


const express = require('express')
const app = express()

var standardToken = null;
var got = null;
var not = null;
var nettingChannelLibrary = null;
var channelManagerLibrary = null;
var channelManager = null;



app.use(async function (req, res, next) {
  req._bc = {};
  req._bc.nonce = await bcs.getTransactionCount(wallet.getAddress());
  req._bc.balance = await bcs.getBalance(wallet.getAddress());
  req._bc.gotBalance = (await bcs.getTokenBalance(util.toBuffer("0x5396078f1e759d74504fa6761488d5b308a47dab"),wallet.getAddress(), wallet.getAddress())).balance;
  req._bc.notBalance = (await bcs.getTokenBalance(util.toBuffer("0xf290b84fd582d6c0cf5a343b1ef41dad7bc4b01b"),wallet.getAddress(), wallet.getAddress())).balance;
  next()
})

app.get("/", async(req,res)=>{
	res.send(req._bc);
})

app.get('/initialize', async (req, res) => {
	req.setTimeout(0);
	console.log("HERE");
	standardToken = await builtContracts["StandardToken"].new();
	builtContracts["HumanStandardToken"].link("StandardToken",standardToken.address);
	got = await builtContracts["HumanStandardToken"].new(100000000,"GoNetwork",1,"$GOT");
	not = await builtContracts["HumanStandardToken"].new(500000000, "NotToken", 1, "$NOT");

	builtContracts["NettingChannelLibrary"].link("StandardToken", standardToken.address);
	nettingChannelLibrary = await builtContracts["NettingChannelLibrary"].new();
	builtContracts["NettingChannelContract"].link("NettingChannelLibrary",nettingChannelLibrary.address);
	
	builtContracts["ChannelManagerLibrary"].link("NettingChannelLibrary", nettingChannelLibrary.address);	
	channelManagerLibrary =await builtContracts["ChannelManagerLibrary"].new();

	builtContracts["ChannelManagerContract"].link("ChannelManagerLibrary", channelManagerLibrary.address);
	channelManager = await builtContracts["ChannelManagerContract"].new(got.address, not.address);
	
	res.send({"$GOT":got.address, "$NOT":not.address, "ChannelManagerContract":channelManager.address});
});

app.get("/approve",async(req,res)=>{
	req.setTimeout(0);
	const token = req.query.token;
	const spender = req.query.spender;
	const amount = req.query.amount;
	var result = await bcs.approve(new util.BN(req._bn.nonce), new util.BN(1000000000), 
		token, 
		spender, 
		new util.BN(amount));
	res.send(result);
});

app.get("/createChannel",async(req,res)=>{
	req.setTimeout(0);
	const partner = util.toBuffer(util.addHexPrefix(req.query.partner));
	const timeout = new util.BN(parseInt(req.query.timeout));
	const nonce = new util.BN(req.query.nonce);
	console.log(partner,timeout,nonce);
	//res.send("DONE");
	var result = await bcs.newChannel(
		nonce, 
		 new util.BN(10000000000), 
		 "0xba98a778030df9ba1103f673a28eba180b87c181", 
		 "0x"+partner.toString("hex"), 
		 timeout) 
	 res.send(result);
});

app.get("/deposit",async(req,res)=>{
	req.setTimeout(0);
	var channel = util.toBuffer(util.addHexPrefix(req.query.channel));
	const amount = new util.BN(parseInt(req.query.amount));
	var result = await bcs.approve(new util.BN(req.query.nonce), new util.BN(1000000000), 
		"0xf290b84fd582d6c0cf5a343b1ef41dad7bc4b01b", 
		channel, 
		amount);
	res.send(result);
});

app.listen(3000, () => console.log('Example app listening on port 3000'))

// var provider = new WalletProvider(wallet, "https://ropsten.infura.io/");

// // Step 2: Turn that contract into an abstraction I can use

// var StandardToken = contract(StandardTokenContract);

// // Step 3: Provision the contract with a web3 provider
// MyContract.setProvider(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));

// // Step 4: Use the contract!
// MyContract.deployed().then(function(deployed) {
//   return deployed.someFunction();
// });

// module.exports = function(deployer,network) {
	
//     deployer.then(async () => {
//       await deployer.deploy(StandardToken)
//       await deployer.link(StandardToken, HumanStandardToken);
//       await deployer.deploy(HumanStandardToken, 100000000,"GoNetwork",1,"$GOT");
//       var gotToken= await HumanStandardToken.deployed();
//       console.log("Ropsten Gotoken Address:"+gotToken.address.toString('hex'));

//       var testToken = await HumanStandardToken.new(5000000,"TEST_TOKEN",1, "$NO");
//       console.log("Ropsten ERC20 Token Address:" + testToken.address.toString('hex') );
      
//       await  deployer.link(HumanStandardToken, NettingChannelLibrary);
//       await deployer.deploy(NettingChannelLibrary);
//       await deployer.link(NettingChannelLibrary,NettingChannelContract);
//       await deployer.link(NettingChannelLibrary, ChannelManagerLibrary);   
//       await deployer.deploy(ChannelManagerLibrary);
//       await deployer.link(ChannelManagerLibrary, ChannelManagerContract);
//       await deployer.deploy(ChannelManagerContract, gotToken.address, testToken.address);
//     });
//   }   
// };
