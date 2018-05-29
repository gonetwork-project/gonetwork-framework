const stateChannel = require('state-channel')
const util = require('ethereumjs-util')
const bcs = require('../lib/blockchain/blockchain.js')
const simulator = require('./simulate_engine')

var DEBUG = false
var rostpen = false

// todo: make environment agnostic / injected from external
process.argv.forEach(function (val, index, array) {
  if (val === 'DEBUG') {
    DEBUG = true
  }

  if (val === 'rostpen') {
    rostpen = true
  }
})

var url = 'http://localhost:8000'
var urlPost = 'http://127.0.0.1:8545'
urlPost = url
if (rostpen) {
  url = 'ws://127.0.0.1:8546'
  urlPost = 'https://ropsten.infura.io/QxoWjkfgF4aVMUV4rbTG'
  // urlPost = 'https://api.infura.io/v1/jsonrpc/ropsten';//"http://localhost:8545";
}
var pk1 = util.toBuffer('0xb507928218b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42')
var pk2 = util.toBuffer('0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78')
// var pk3 = util.toBuffer('0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d')
// var pk4 = util.toBuffer('0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224')

var acct1 = '0xf0c3043550e5259dc1c838d0ea600364d999ea15'
var acct2 = '0xb0ae572146ab8b5990e069bff487ac25635dabe8'
var acct3 = '0xff8a018d100ace078d214f02be8df9c6944e7a2b'
var acct4 = '0xf77e9ef93380c70c938ca2e859baa88be650d87d'

// function infoMessage (msg) {
//   console.log('\r\n' + msg + '\r\n')
// }

// function txToCurlRq (data) {
//   return 'curl -H "Content-Type: application/json"  --data \'{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":["0x' + data.toString('hex') + '"],"id":1}\' ' + urlPost
// }

// function callToCurlRq2 (data) {
//   return 'curl -H "Content-Type: application/json"  --data \'' + JSON.stringify(data) + '\' ' + urlPost
// }

// function callToCurlRq (data) {
//   return 'curl ' + urlPost + '&' + querystring.stringify(data)
// }

var channelManagerAddress = '0x05e1b1806579881cfd417e1716f23b1900568346'
var goTokenAddress = '0x185ee0970d2c43e3350f3e2b0ac596a2d781b206'
var testToken = '0x9c1af2395beb97375eaee816e355863ec925bc2e'
var channelAddress = '0x3d5cd93a20cea6da5ab23afb16bb43e80652dc0b'
var acct1Nonce = 5
var acct2Nonce = 1
var channelManagerNonce = 0
var globalBlock

var web3 = null
if (rostpen) {
  var Web3 = require('web3')
  web3 = new Web3(url)

  web3.eth.getTransactionReceiptMined = function getTransactionReceiptMined (txHash, interval) {
    const self = this
    const transactionReceiptAsync = function (resolve, reject) {
      self.getTransactionReceipt(txHash, (error, receipt) => {
        if (error) {
          reject(error)
        } else if (receipt == null) {
          setTimeout(
            () => transactionReceiptAsync(resolve, reject),
            interval || 500)
        } else {
          resolve(receipt)
        }
      })
    }

    if (Array.isArray(txHash)) {
      return Promise.all(txHash.map(
        oneTxHash => self.getTransactionReceiptMined(oneTxHash, interval)))
    } else if (typeof txHash === 'string') {
      return new Promise(transactionReceiptAsync)
    } else {
      throw new Error('Invalid Type: ' + txHash)
    }
  }

  channelManagerAddress = '0xde8a6a2445c793db9af9ab6e6eaacf880859df01'
  goTokenAddress = '0xa28a7a43bc389064ab5d16c0338968482b4e02bd'
  testToken = '0xbed8d09854a7013af00bdae0f0969f7285c2f4d2'
  channelAddress = null // UPDATE THIS FROM ROSTPEN TEST
  acct1Nonce = 57
  acct2Nonce = 3
  // acct4Nonce
  // acct3Nonce
  channelManagerNonce = 0

  web3.eth.getBlockNumber().then(function (block) {
    // currentBlock = new util.BN(block + 50)

    web3.eth.getTransactionCount(acct1).then(function (txCount) {
      acct1Nonce = txCount

      web3.eth.getTransactionCount(acct2).then(function (txCount) {
        acct2Nonce = txCount
        web3.eth.getTransactionCount(acct4).then(function (txCount) {
          // acct4Nonce = txCount
          web3.eth.getTransactionCount(channelManagerAddress).then(function (txCount) {
            channelManagerNonce = txCount
            web3.eth.getTransactionCount(acct3).then(function (txCount) {
              // acct3Nonce = txCount
              run()
            })
          }).catch(function (error) {
            console.log(error)
          })
        })
      })
    })
  })
} else {
  run()
}

function run () {
  var bc = new bcs.BlockchainService(3, function (cb) {
    cb(pk1)
  }, urlPost)

  var bc2 = new bcs.BlockchainService(3, function (cb) {
    cb(pk2)
  }, urlPost)

  // var bc4 = new bcs.BlockchainService(3, function (cb) {
  //   cb(pk4)
  // }, urlPost)

  // var bc3 = new bcs.BlockchainService(3, function (cb) {
  //   cb(pk3)
  // }, urlPost)

  // bc.getTokenBalance(util.toBuffer(goTokenAddress),util.toBuffer(acct1),util.toBuffer(acct1)).then(console.log);
  // var channel = null
  bc.getAddressAndBalance(util.toBuffer(channelAddress), util.toBuffer(acct1), util.toBuffer(acct1)).then(console.log)

  bc.getNettingContractsByAddress(util.toBuffer(channelManagerAddress), util.toBuffer(acct1), util.toBuffer(acct1)).then(function (result) {
    console.log(result['address[]'])
  }).catch(function (err) {
    console.log(err)
  })

  function setupNewChannelAndDeposit () {
    bc.approve(acct1Nonce++, 50000000000, goTokenAddress, channelManagerAddress, 500).then(function (result) {
      console.log(result)

      bc.newChannel(acct1Nonce++, 50000000000, channelManagerAddress, acct2, 40).then(function (result) {
        console.log(result)

        if (!channelAddress) {
          // Deterministally calculate the new channel address
          // new contract addresses = keccack256(rlp(address,nonce));
          channelAddress = util.addHexPrefix(
            (util.rlphash([util.toBuffer(channelManagerAddress),
              util.toBuffer(new util.BN(channelManagerNonce))]).slice(12)).toString('hex')
          )

          console.log('New channel will be generated at:' + channelAddress)
        }

        bc.approve(acct1Nonce++, 50000000000, util.toBuffer(testToken), channelAddress, new util.BN(500)).then(function (result) {
          console.log(result)
          setTimeout(function () {
            bc.deposit(acct1Nonce++, 50000000000, channelAddress, new util.BN(29)).then(
              function (result) {
                console.log(result)
                setTimeout(function () {
                  runSimulatorAndCloseAndSettle()
                }, 15000)
              })
          }, 10000)
        })
      })
    })
  }

  globalBlock = new util.BN(0)
  function monitorSettle (channelAddressBuffer, accountBuffer) {
    var blockTimer = setInterval(function () {
      bc.getBlockNumber().then(function (block) {
        console.log(block.toString(10))
        globalBlock = block
      })
    }, 1000)
    return new Promise(function (resolve, reject) {
      var interval = setInterval(function () {
        bc.getContractData(channelAddressBuffer, accountBuffer).then(function (contractData) {
          if (globalBlock.sub(contractData.closed).gt(contractData.settle_timeout)) {
            console.log('global block number: ' + globalBlock.toString(10) + ' - ' +
              'closed time: ' + contractData.closed.toString(10) + ' > timeout: ' +
              contractData.settle_timeout.toString(10))
            clearTimeout(blockTimer)
            clearTimeout(interval)
            resolve(contractData)
          }
        })
      }, 2000)
    })
  };

  // monitorSettle(util.toBuffer("0x56C920248434e780C20EB617741a45CEd0ce076A"),util.toBuffer(acct2)).then(function(contractData){
  //   console.log("SETTLING CHANNEL");
  //                     bc2.settle(acct2Nonce++,25000000000,util.toBuffer("0x56C920248434e780C20EB617741a45CEd0ce076A")).then(console.log).catch(console.log);
  // });

  function runSimulatorAndCloseAndSettle () {
    var blockchainQueue = []

    // channelAddress = "0xf4a8f0eb2675ed1cda6d78dd4f4fffbf3ae0b9c3";
    simulator.simulate(blockchainQueue, channelAddress, acct1, pk1, acct2, pk2, new util.BN(4076192))

    var proof = blockchainQueue[0][1]
    console.log(proof)

    bc2.close(acct2Nonce++, 50000000000, channelAddress, proof).then(function (result) {
      console.log(result)
      var proof2 = blockchainQueue[1][1]
      console.log(proof2)

      setTimeout(function () {
        bc.updateTransfer(acct1Nonce++, 25000000000, channelAddress, proof2)
          .then(function (result) {
            console.log(result)
            setTimeout(function () {
              // var k = 0
              for (var i = 2; i < blockchainQueue.length; i++) {
                var withdrawProof = blockchainQueue[i]
                var encodedLock = withdrawProof[1]
                var secret = withdrawProof[3]
                var merkleProof = withdrawProof[2]
                if (DEBUG) {
                  console.log('\r\nENCODED LOCK:0x' + encodedLock.toString('hex'))
                  console.log('MERKLE PROOF:' + '0x' + withdrawProof[1].reduce(function (sum, proof) { sum += proof.toString('hex'); return sum }, ''))
                  console.log('SECRET:0x' + secret.toString('hex'))
                  console.log('LOCKSROOT:' + proof2.locksRoot.toString('hex') + '\r\n')
                }
                if (stateChannel.merkletree.checkMerkleProof(merkleProof, proof2.locksRoot, util.sha3(encodedLock)) === true) {
                  // k++
                  bc.withdrawLock(acct1Nonce++, 20000000000, channelAddress, encodedLock, merkleProof, secret).then(console.log)

                  // console.log("web3.eth.sendRawTransaction(\"0x"+tx.serialize().toString('hex')+"\",function(err,txHash){ console.log(err);})");
                } else {
                  throw new Error(' ERROR WITHDRAWING LOCK')
                }
              }
              // await mining and issue settle
              monitorSettle(util.toBuffer(channelAddress), util.toBuffer(acct2)).then(function (contractData) {
                console.log(contractData)
                bc.getParticipantData(util.toBuffer(channelAddress), util.toBuffer(acct1)).then(function (participantData) {
                  console.log(participantData)
                  bc.getParticipantData(util.toBuffer(channelAddress), util.toBuffer(acct2)).then(function (participantData) {
                    console.log(participantData)
                    bc2.settle(acct2Nonce++, 25000000000, util.toBuffer(channelAddress)).then(console.log).catch(console.log)
                  })
                })
              })
            }, 15000)
          })
      }, 15000)
    })
  }
  setupNewChannelAndDeposit()
  // var  q = [];
  // simulator.simulate(q, util.toBuffer("0x3d5cd93a20cea6da5ab23afb16bb43e80652dc0b"), acct1, pk1, acct2, pk2, new util.BN(4076192));
  // // console.log(q.length);
  // console.log(q[0][1]);
  // console.log(q[1][1]);
  // console.log(util.sha3(q[2][3]).toString("hex"));
  // console.log(q[2][1].toString("hex"));
  // console.log(q[4][3].toString("hex"));
}// end function run
