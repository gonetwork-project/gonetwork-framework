var HumanStandardToken = artifacts.require("./HumanStandardToken.sol");
var StandardToken = artifacts.require("./StandardToken.sol");
var ChannelManagerContract = artifacts.require("./ChannelManagerContract.sol");
var ChannelManagerLibrary = artifacts.require("./ChannelManagerLibrary.sol");

var NettingChannelContract = artifacts.require("./NettingChannelContract.sol");

var NettingChannelLibrary = artifacts.require("./NettingChannelLibrary.sol");
//var Registry = artifacts.require("./Registry.sol");
var Utils = artifacts.require("./Utils.sol");

var web3 = require('Web3');

module.exports = function(deployer) {
	console.log("Deploying Standard Token");
    var acct1 = "0x7e24f888e631f0ff32f030a361a3bb0e0026a216";
    var acct2 = "0xe415cae97729d38d2156b2b3d628e0f8f61f8aac";
    var acct3 = "0xe9a476b0dfb0dfb93fc6bfed1a97b34689e4c032";
  	deployer.deploy(StandardToken).then(function(){

      deployer.deploy(HumanStandardToken, 100000000,"GoNetwork",1,"$GOT").then(function(){
        var gotToken = HumanStandardToken.at(HumanStandardToken.address);
        var token = null;
         HumanStandardToken.new(50000, "TEST_TOKEN", 1, "$NO",{from:acct2}).then(function(instance){
          token = instance;
           console.log("ERC20 TOKEN \r\n\r\n");
                  console.log(token.address);
            console.log("\r\n\r\n=======================\r\n\r\n");

        deployer.link(HumanStandardToken, NettingChannelLibrary);
        deployer.deploy(NettingChannelLibrary).then(function() {
          deployer.link(NettingChannelLibrary,NettingChannelContract);
          deployer.link(NettingChannelLibrary, ChannelManagerLibrary);          
          deployer.deploy(ChannelManagerLibrary).then(function() {
            deployer.link(ChannelManagerLibrary, ChannelManagerContract);
            deployer.deploy(ChannelManagerContract, gotToken.address, token.address).then(function(){

              ChannelManagerContract.deployed().then(function(instance) {
               
                gotToken.approve(ChannelManagerContract.address,500, {from:acct1}).then(function(){
                  instance.newChannel(acct2, 150, {from:acct1}).then(function (result) {
                  console.log("NEW CHANNEL RESULT \r\n\r\n");
                  console.log(result);
                  console.log("\r\n\r\n=======================\r\n\r\n");
                  if(result.logs[0].event !== "ChannelNew"){
                    throw new Error("COULD NOT CREATE NEW CHANNEL");
                  }
                  instance.getChannelWith(acct2,{from:acct1}).then(function(channelAddress){
                    console.log(channelAddress);
                    var ncc = NettingChannelContract.at(channelAddress);


                    token.approve(ncc.address,400,{from:acct2}).then(function (next) {
                      ncc.deposit(250,{from:acct2}).then(function (result) {
                           console.log(" CHANNEL DEPOSIT RESULT \r\n\r\n");
                            console.log(result);
                            console.log("\r\n\r\n=======================\r\n\r\n");

                      }).catch(function (err) {
                          console.log("COULD NOT DEPOST 250");
                         
                      });
                    }).catch(function(err) {
                      console.log("COULD NOT APPROVE TOKEN ");
                    })//approve token
                    
                  }).catch(function (e) {
                    
                  })
                }).catch(function (e) {
                  console.log("ERROR Creating New Channel:"+e.message);
                })//New Channel

                instance.newChannel(acct3, 150, {from:acct1}).then(function (result) {
                }).catch(function(err) {
                  console.log("ERROR Creating New Channel with Acct3:"+ e.message);
                })

                })

                
                
              });
              

            });
            
        })//CHannelManagerLibrary

        
        });//NettingChannelLibrary

        })//ERC-20 Random token
      })//Gonetwork TOken

      
    

    });

  	
  	

};
