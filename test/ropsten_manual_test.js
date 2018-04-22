/*
* @Author: amitshah
* @Date:   2018-04-17 22:26:32
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-21 19:48:35
*/
const stateChannel= require('state-channel');
const events = require('events');
const util = require("ethereumjs-util");
const bcs = require('../src/blockchain.js');
const simulator = require("./simulate_engine");
const message = stateChannel.message;
var DEBUG = false;
var rostpen = false;

process.argv.forEach(function (val, index, array) {
  if(val === "DEBUG"){
    DEBUG = true;
  }

  if(val === "rostpen"){
    rostpen = true;
  }
});

var url = "http://localhost:8000";
var urlPost = url;
if(rostpen){
  url = "ws://127.0.0.1:8546";
  urlPost = "http://localhost:8545";
}
var pk1=util.toBuffer("0xb507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42");
var pk2 =util.toBuffer("0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78");
var pk3=util.toBuffer("0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d");
var pk4=util.toBuffer("0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224");

var acct1 = "0xf0c3043550e5259dc1c838d0ea600364d999ea15";
var acct2 = "0xb0ae572146ab8b5990e069bff487ac25635dabe8";
var acct3 = "0xff8a018d100ace078d214f02be8df9c6944e7a2b";
var acct4 = "0xf77e9ef93380c70c938ca2e859baa88be650d87d";

function infoMessage(msg){
  console.log("\r\n"+msg+"\r\n");
}

function txToCurlRq(data){
  return 'curl -H "Content-Type: application/json"  --data \'{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":["0x'+ data.toString('hex')+'"],"id":1}\' '+ urlPost

}

var channelManagerAddress = "0x05e1b1806579881cfd417e1716f23b1900568346";
var goTokenAddress = "0x185ee0970d2c43e3350f3e2b0ac596a2d781b206";
var testToken = "0x9c1af2395beb97375eaee816e355863ec925bc2e";
var channelAddress = "0x3d5cd93a20cea6da5ab23afb16bb43e80652dc0b";
var acct1Nonce = 5;
var acct2Nonce = 1;
var acct4Nonce = 0;
var currentBlock = new util.BN(3076192);
var channelManagerNonce = 0;


var web3 = null;
if(rostpen){
  var Web3 =require("web3");
  web3 = new Web3(url);
  
  web3.eth.getTransactionReceiptMined= function getTransactionReceiptMined(txHash, interval) {
    const self = this;
    const transactionReceiptAsync = function(resolve, reject) {
        self.getTransactionReceipt(txHash, (error, receipt) => {
            if (error) {
                reject(error);
            } else if (receipt == null) {
                setTimeout(
                    () => transactionReceiptAsync(resolve, reject),
                    interval ? interval : 500);
            } else {
                resolve(receipt);
            }
        });
    };

    if (Array.isArray(txHash)) {
        return Promise.all(txHash.map(
            oneTxHash => self.getTransactionReceiptMined(oneTxHash, interval)));
    } else if (typeof txHash === "string") {
        return new Promise(transactionReceiptAsync);
    } else {
        throw new Error("Invalid Type: " + txHash);
    }
  };

  channelManagerAddress = "0xde8a6a2445c793db9af9ab6e6eaacf880859df01";
  goTokenAddress = "0xa28a7a43bc389064ab5d16c0338968482b4e02bd";
  testToken = "0xbed8d09854a7013af00bdae0f0969f7285c2f4d2";
  channelAddress = null; //UPDATE THIS FROM ROSTPEN TEST
  acct1Nonce = 57;
  acct2Nonce = 3;
  acct4Nonce = 12;
  channelManagerNonce = 0;

  web3.eth.getBlockNumber().then(function(block){
    currentBlock = new util.BN(block + 50);

    web3.eth.getTransactionCount(acct1).then(function(txCount) {
      acct1Nonce = txCount;

      web3.eth.getTransactionCount(acct2).then(function(txCount) {
        acct2Nonce = txCount;
        web3.eth.getTransactionCount(acct4).then(function(txCount) {
          acct4Nonce = txCount;
           web3.eth.getTransactionCount(channelManagerAddress).then(function(txCount) {
            channelManagerNonce = txCount;
            

            run();
            return;
          }).catch(function (error) {
            console.log(error);
          });
          return;
        });
        return;
      })
      return;
    })

   return; 
  })
    
  
  
  


}else{
  run();
}

function run(){
  var bc = new bcs.BlockchainService(0,function(cb) {
    cb(pk1);
  })

  var bc2 = new bcs.BlockchainService(0,function(cb) {
    cb(pk2);
  })

  var bc4 = new bcs.BlockchainService(0,function(cb) {
    cb(pk4);
  })

  
  
 
  //Approve 
  infoMessage("Approve ChannelManager to allow it to transfer Gonetwork Token to newly created netting channels")
  var tx = bc.approve(acct1Nonce,5,goTokenAddress,channelManagerAddress, 500);
  console.log(txToCurlRq(tx.serialize()));

  infoMessage("Create new channel between acct1 and acct4");
  tx = bc.newChannel(acct1Nonce+1,1,channelManagerAddress, acct4,20);
  console.log(txToCurlRq(tx.serialize()));

  if(!channelAddress){
      //Deterministally calculate the new channel address 
      //new contract addresses = keccack256(rlp(address,nonce));
      channelAddress = util.addHexPrefix(
        (util.rlphash([util.toBuffer(channelManagerAddress), 
        util.toBuffer(new util.BN(channelManagerNonce))]).slice(12,)).toString('hex')
      );

      console.log("New channel will be generated at:"+channelAddress);
     
      run2();
     
        
        
  }else{
    run2();
  }

  function run2(){
    var blockchainQueue =[];
    simulator.simulate(blockchainQueue,channelAddress,acct1,pk1,acct4,pk4,currentBlock);



    //console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");
    //console.log("\r\n");

    //so we can complete the deposit
    infoMessage("Approve channel an allowance to make transfers into itself when we call deposit on it")
    tx = bc.approve(acct1Nonce+2,1, testToken,channelAddress,500);
    console.log(txToCurlRq(tx.serialize()));



    //console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");
    //console.log("\r\n");
    infoMessage("acct2 send some testTOken to account1");
    tx = bc2.transferToken(acct2Nonce, 1, testToken,acct1, 1000);
    console.log(txToCurlRq(tx.serialize()));

    infoMessage("acct1 deposit into you state channel:"+channelAddress.toString('hex'));
    tx = bc.deposit(acct1Nonce+3,20,channelAddress,27);
    console.log(txToCurlRq(tx.serialize()));
    var proof = blockchainQueue[0][1];

    infoMessage("acct4 closes your state channel");
    tx = bc4.close(acct4Nonce,1,channelAddress,proof);
    console.log(txToCurlRq(tx.serialize()));


    infoMessage("acct1 update your balance proof");
    var proof2 = blockchainQueue[2][1];
    tx = bc.updateTransfer(acct1Nonce+4,1,channelAddress,proof2);
    console.log(txToCurlRq(tx.serialize()));



    infoMessage("Acct1 expected locksroots encompassing 3 openLocks:"+proof2.locksRoot.toString('hex'))

    var k = 0;
    for(var i =0; i < blockchainQueue[3][1].length; i++){
      var withdrawProof = blockchainQueue[3][1][i];
      var encodedLock = withdrawProof[2].slice(0,96);
      var secret =withdrawProof[2].slice(96,128);
      if(DEBUG){
        
        console.log("\r\nENCODED LOCK:0x"+ encodedLock.toString('hex'));
        console.log("MERKLE PROOF:"+"0x"+withdrawProof[1].reduce(function(sum,proof){ sum+=proof.toString('hex'); return sum;},""));
        console.log("SECRET:0x"+ secret.toString("hex"));
        console.log("LOCKSROOT:"+proof2.locksRoot.toString('hex') + "\r\n");
      }
      if(util.sha3(secret).compare(withdrawProof[0].hashLock)===0 && stateChannel.merkletree.checkMerkleProof(withdrawProof[1], proof2.locksRoot, util.sha3(encodedLock)) === true){
        k++;  
        //console.info("lock #"+k+" processing encoded lock:" +encodedLock.toString('hex'));
        // withdrawProof array index (Lock object, merkleProof: Bytes<32>[], Bytes<96> encodedLock)
        infoMessage("Withdraw lock:"+k);
        tx = bc.withdrawLock(acct1Nonce+4+k, 1, channelAddress, withdrawProof[2],withdrawProof[1],secret);
        console.log(txToCurlRq(tx.serialize()));

        //console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");

      }else{
        throw new Error(k);
      }

       
    }



    //RUN IN TESTRPC to move blocks ahead
    if(!rostpen){
      infoMessage("run this command on testrpc to make the blockNumber move ahead passed settle_timeout of 250");
      console.log("for(var i =0; i < 250; i++){");
      console.log("web3.eth.sendTransaction({from:web3.eth.accounts[1],to:web3.eth.accounts[2],value:10})");
      console.log("}");
    }

    // tx = bc.handleRefund(15,1,"0x05e1b1806579881cfd417e1716f23b1900568346", "0x8bf6a4702d37b7055bc5495ac302fe77dae5243b");
    // console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");

    infoMessage("acct1 settles channel");
    tx = bc.settle(acct1Nonce+4+k+1,1,channelAddress);
    console.log(txToCurlRq(tx.serialize()));

    if(DEBUG){
      const NettingChannelContract = require('../smart-contracts/build/contracts/NettingChannelContract.json');
      console.info(JSON.stringify(NettingChannelContract.abi));

      const ChannelManagerContract = require('../smart-contracts/build/contracts/ChannelManagerContract.json');
      console.info(JSON.stringify(ChannelManagerContract.abi));

    }

    return;
  }
}//end function run
debugger;
