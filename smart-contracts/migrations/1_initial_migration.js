var HumanStandardToken = artifacts.require("./HumanStandardToken.sol");
var StandardToken = artifacts.require("./StandardToken.sol");
var ChannelManagerContract = artifacts.require("./ChannelManagerContract.sol");
var ChannelManagerLibrary = artifacts.require("./ChannelManagerLibrary.sol");

var NettingChannelContract = artifacts.require("./NettingChannelContract.sol");

var NettingChannelLibrary = artifacts.require("./NettingChannelLibrary.sol");
var Registry = artifacts.require("./Registry.sol");
var Utils = artifacts.require("./Utils.sol");

var web3 = require('Web3');

module.exports = function(deployer) {
	console.log("Deploying Standard Token");
    var acct1 = "0xa3f014d83a74b28315409bb5fbfbb5264f9a5f4a";
    var acct2 = "0x8de2b400973114e6346caf278e7832fb4a99c338";
   
  	deployer.deploy(StandardToken).then(function(){

      deployer.deploy(HumanStandardToken, 100000000,"GoNetwork",1,"$GOT").then(function(){

        deployer.link(HumanStandardToken, NettingChannelLibrary);
        deployer.deploy(NettingChannelLibrary).then(function() {

          deployer.link(NettingChannelLibrary,NettingChannelContract);

          deployer.link(NettingChannelLibrary, ChannelManagerLibrary);
          //deployer.link(NettingChannelContract, ChannelManagerLibrary);
          
          deployer.deploy(ChannelManagerLibrary).then(function() {
            deployer.link(ChannelManagerLibrary, ChannelManagerContract);


            deployer.deploy(ChannelManagerContract, HumanStandardToken.address).then(function(){

              ChannelManagerContract.deployed().then(function(instance) {
               

                instance.newChannel(acct2, 150, {from:acct1}).then(function (result) {
                  console.log(result);
                  instance.getChannelWith(acct2,{from:acct1}).then(function(channelAddress){
                    console.log(channelAddress);
                    var ncc = NettingChannelContract.at(channelAddress);

                    HumanStandardToken.deployed().then(function(hst) {

                      hst.approve(ncc.address,500,{from:acct1}).then(function (next) {
                        ncc.deposit(250,{from:acct1}).then(function (result) {
                          console.log("DEPOSITED 250");
                          // body...
                        }).catch(function (err) {
                          conole.log("COULD NOT DEPOST 250");
                          // body...
                        });
                        // body...
                      })
                    })
                  }).catch(function (e) {
                    // body...
                  })
                }).catch(function (e) {
                  console.log("ERROR"+e.message);
                })
                
              });
              

            });
            
        })//CHannelManagerLibrary

        
      });


      })

      
    

    });

  	
  	

};
