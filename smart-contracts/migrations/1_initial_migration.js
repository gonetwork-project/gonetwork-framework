var HumanStandardToken = artifacts.require("./HumanStandardToken.sol");
var StandardToken = artifacts.require("./StandardToken.sol");
var ChannelManagerContract = artifacts.require("./ChannelManagerContract.sol");
var ChannelManagerLibrary = artifacts.require("./ChannelManagerLibrary.sol");

var NettingChannelContract = artifacts.require("./NettingChannelContract.sol");

var NettingChannelLibrary = artifacts.require("./NettingChannelLibrary.sol");
//var Registry = artifacts.require("./Registry.sol");
var Utils = artifacts.require("./Utils.sol");

var web3 = require('Web3');

//testrpc -g 20  --unlock 0 --unlock 1 --unlock 2 --unlock 3 --account="0xb507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42,10000000000000000000000000" --account="0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78,10000000000000000000000000" --account="0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d,10000000000000000000000000" --account="0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224,10000000000000000000000000"


module.exports = function(deployer) {
	console.log("Deploying Standard Token");
    var acct1 = "0xf0c3043550e5259dc1c838d0ea600364d999ea15";
    var acct2 = "0xb0ae572146ab8b5990e069bff487ac25635dabe8";
    var acct3 = "0xff8a018d100ace078d214f02be8df9c6944e7a2b";
    var acct4 = "0xf77e9ef93380c70c938ca2e859baa88be650d87d";
   

  deployer.then(async () => {
    await deployer.deploy(StandardToken)
    await deployer.link(StandardToken, HumanStandardToken);
    await deployer.deploy(HumanStandardToken, 100000000,"GoNetwork",1,"$GOT");
    var gotToken= await HumanStandardToken.deployed();
    console.log("GOT ADDRESS:"+gotToken.address.toString('hex'));

    var testToken = await HumanStandardToken.new(50000,"TEST_TOKEN",1, "$NO", {from:acct2});
    console.log("TEST ERC20:" + testToken.address.toString('hex') );
    //await testToken.transfer(acct1, 25000,{from:acct2});

    await  deployer.link(HumanStandardToken, NettingChannelLibrary);
    await deployer.deploy(NettingChannelLibrary);
    await deployer.link(NettingChannelLibrary,NettingChannelContract);
    await deployer.link(NettingChannelLibrary, ChannelManagerLibrary);   
    await deployer.deploy(ChannelManagerLibrary);
    await deployer.link(ChannelManagerLibrary, ChannelManagerContract);
    await deployer.deploy(ChannelManagerContract, gotToken.address, testToken.address);
    
    


   // deployer.deploy(StandardToken).then(function(success){
   //  console.log(success)
   // }).catch(function(error){
   //  console.log(error);
   // })
  	// deployer.deploy(StandardToken).then(function(){

   //    deployer.deploy(HumanStandardToken, 100000000,"GoNetwork",1,"$GOT").then(function(){
   //      var gotToken = HumanStandardToken.at(HumanStandardToken.address);
   //      var token = null;
   //       HumanStandardToken.new(50000, "TEST_TOKEN", 1, "$NO",{from:acct2}).then(function(instance){
   //        token = instance;
          

   //         console.log("ERC20 TOKEN \r\n\r\n");
   //                console.log(token.address);
   //          console.log("\r\n\r\n=======================\r\n\r\n");
   //          //transfer some money to account1
   //        token.transfer(acct1, 25000,{from:acct2}).then(function(res) {
   //          console.log(res);
   //        });
   //      deployer.link(HumanStandardToken, NettingChannelLibrary);
   //      deployer.deploy(NettingChannelLibrary).then(function() {
   //        deployer.link(NettingChannelLibrary,NettingChannelContract);
   //        deployer.link(NettingChannelLibrary, ChannelManagerLibrary);          
   //        deployer.deploy(ChannelManagerLibrary).then(function() {
   //          deployer.link(ChannelManagerLibrary, ChannelManagerContract);
   //          deployer.deploy(ChannelManagerContract, gotToken.address, token.address).then(function(){

   //            ChannelManagerContract.deployed().then(function(instance) {
               
   //              gotToken.approve(ChannelManagerContract.address,500, {from:acct1}).then(function(){
   //                instance.newChannel(acct2, 150, {from:acct1}).then(function (result) {
   //                console.log("NEW CHANNEL RESULT \r\n\r\n");
   //                console.log(result);
   //                console.log("\r\n\r\n=======================\r\n\r\n");
   //                if(result.logs[0].event !== "ChannelNew"){
   //                  throw new Error("COULD NOT CREATE NEW CHANNEL");
   //                }
   //                instance.getChannelWith(acct2,{from:acct1}).then(function(channelAddress){
   //                  console.log(channelAddress);
   //                  var ncc = NettingChannelContract.at(channelAddress);


   //                  token.approve(ncc.address,400,{from:acct2}).then(function (next) {
   //                    ncc.deposit(250,{from:acct2}).then(function (result) {
   //                         console.log(" CHANNEL DEPOSIT RESULT \r\n\r\n");
   //                          console.log(result);
   //                          console.log("\r\n\r\n=======================\r\n\r\n");

   //                    }).catch(function (err) {
   //                        console.log("COULD NOT DEPOST 250");
                         
   //                    });
   //                  }).catch(function(err) {
   //                    console.log("COULD NOT APPROVE TOKEN ");
   //                  })//approve token
                    
   //                }).catch(function (e) {
                    
   //                })
   //              }).catch(function (e) {
   //                console.log("ERROR Creating New Channel:"+e.message);
   //              })//New Channel

   //              instance.newChannel(acct3, 150, {from:acct1}).then(function (result) {
   //              }).catch(function(err) {
   //                console.log("ERROR Creating New Channel with Acct3:"+ e.message);
   //              })

   //              })

                
                
   //            });
              

   //          });
            
   //      })//CHannelManagerLibrary

        
   //      });//NettingChannelLibrary

   //      })//ERC-20 Random token
   //    })//Gonetwork TOken

      
    

   });

  	
  	

};
