/*
* @Author: amitshah
* @Date:   2018-04-17 00:55:47
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-28 23:43:00
*/

const messageLib = require('./message');
const channelLib = require('./channel');
const channelStateLib = require('./channel-state');
const stateMachineLib = require('./state-machine');
const util = require('ethereumjs-util');
const events = require('events');


/** 
* @class GoNetworks Engine encapsualtes off chain interactions between clients and propogation onto the blockchain.  
* The Engine is platform agnostic and adaptble to different blockchains by providing appropriate blockchainService adapters
* Overriding the send callback also allows for custom transport layers and methods (not neccessarily IP network based)
* @extends events.EventEmitter
* @property {BN} msgID=0
* @property {BN} currentBlock=0 - the current block which is synchronized to the onchain mined block value via blockchainService handler callbacks
* @property {Buffer} publicKey - Future Use: ElGamal Elliptic Curve Asymmetric Encryption public key to be sent to channel partners
* @property {InitiatorFactory} initiatorStateMachine=stateMachine.IntiatorFactory - creates a new state machine for mediated transfers you initiate
* @property {TargetFactory} targeStateMachine=stateMachine.TargetFactory - creates a new state machine for mediated transfers that are intended for you 
* @property {object} messageState={} - tracks the state of mediated transfer messages using msgID as the key i.e. this.messageState[msgID] = stateMachine.*
* @property {object} channelByPeer={} - channels by peers ethereum address as hex string no 0x prefix 
* @property {object} channels={} - channels by on-chain contract address hex string no 0x prefix
* @property {object} pendingChannels={} - used to track newChannel requests initiated by the engine
* @property {function} signatureService 
* @property {object} blockchain
*/
class Engine extends events.EventEmitter {

  /**
   * @constructror.
   * @param {Buffer} address - your ethereum address; ETH Address is merely the last 20 bytes of the keccak256 hash of the public key given the public private key pair.
   * @param {Function} signatureService - the callback that requests the privatekey for signing of messages.  This allows the user to store the private key in a secure store or other means
   * @param {BlockchainService} blockchainService - a class extending the BlockchainService class to monitor and propogate transactions on chain. Override for different Blockchains
   */
  constructor(address,signatureService,blockchainService){
    super();
   
    //dictionary of channels[peerAddress] that are pending mining
    this.pendingChannels = {};
    this.channels = {};
    //dictionary of channels[peerState.address.toString('hex')];
    this.channelByPeer = {};
    //dictionary of messages[msgID] = statemachine.*
    this.messageState = {};

    this.currentBlock = new util.BN(0);
    this.msgID = new util.BN(0);

    this.publicKey;
    this.address = address;
    this.initiatorStateMachine = stateMachineLib.InitiatorFactory();
    this.targetStateMachine = stateMachineLib.TargetFactory();
    var self = this;
    this.initiatorStateMachine.on("*",function(event,state){
      self.handleEvent(event,state);
    });
    this.targetStateMachine.on("*",function(event,state){
      self.handleEvent(event,state);
    });

    this.signature = signatureService;
    this.blockchain = blockchainService;
    //sanity check
    if(!channelLib.SETTLE_TIMEOUT.gt(channelLib.REVEAL_TIMEOUT)){
      throw new Error("SETTLE_TIMEOUT must be strictly and much larger then REVEAL_TIMEOUT");
    }
    this.currentBlock = new util.BN(0);
  }

  /**
     * Handle an incoming message after it has been deserialized
     * @param {message.SignedMessage} message
     * @returns {message.Ack}
     * @throws "Invalid Message: no signature found"
     * @throws "Invalid Message: uknown message received"
     */
  onMessage(message){
    //TODO: all messages must be signed here?
    if(!message.isSigned()){
      throw new Error("Invalid Message: no signature found");
    }

    if(message instanceof messageLib.RequestSecret){
      this.onRequestSecret(message);
    }else if(message instanceof messageLib.RevealSecret){
      this.onRevealSecret(message);
    }else if(message instanceof messageLib.MediatedTransfer){
      this.onMediatedTransfer(message);
    }else if(message instanceof messageLib.DirectTransfer){
      this.onDirectTransfer(message);
    }else if(message instanceof messageLib.SecretToProof){
      this.onSecretToProof(message);
    }else{
      throw new Error("Invalid Message: uknown message received");
    }
    
    return new messageLib.Ack({msgID:message.msgID, messageHash:message.getHash(), to:message.from});
    
  }

  onRequestSecret(requestSecret){
    if(this.messageState.hasOwnProperty(requestSecret.msgID)){
      this.messageState[requestSecret.msgID].applyMessage('receiveRequestSecret',requestSecret);
    }

  }

  onRevealSecret(revealSecret){
    //handle reveal secret for all channels that have a lock created by it
    //we dont care where it came from unless we want to progress our state machine
    var errors = [];
    Object.values(this.channelByPeer).map(function (channel) {
      try{
        channel.handleRevealSecret(revealSecret);
      }catch(err){
        errors.push(err)
      }

    });
    //update all state machines that are in awaitRevealSecret state
    Object.values(this.messageState).map(function (messageState) {
      try{
        //the state machines will take care of echoing RevealSecrets
        //to channel peerStates

        messageState.applyMessage('receiveRevealSecret',revealSecret);
      }catch(err){
        errors.push(err)
      }
    });

    errors.map(function (error) {
      console.log(error);
    });
  }

  onSecretToProof(secretToProof){
    //handle reveal secret for all channels that have a lock created by it.
    //this is in the case where for some reason we get a SecretToProof before
    //a reveal secret

    //encapsulate in message.RevealSecret type of message, we dont have to sign it
    //it is not required
    var tempRevealSecret = new messageLib.RevealSecret({secret:secretToProof.secret})
    this.signature(tempRevealSecret);
    Object.values(this.channelByPeer).map(function (channel) {
      try{

        channel.handleRevealSecret(tempRevealSecret);
      }catch(err){
        console.log(err);
      }

    });

    Object.values(this.messageState).map(function (messageState) {
      try{
        //the state machines will take care of echoing RevealSecrets
        //to channel peerStates
        messageState.applyMessage('receiveRevealSecret',tempRevealSecret);
      }catch(err){
        console.log(err);
      }
    });

    if(!this.channelByPeer.hasOwnProperty(secretToProof.from.toString('hex'))){
      throw new Error("Invalid SecretToProof: unknown sender");
    }

    var channel = this.channelByPeer[secretToProof.from.toString('hex')];
    channel.handleTransfer(secretToProof,this.currentBlock);
    if(this.messageState.hasOwnProperty(secretToProof.msgID)){
      this.messageState[secretToProof.msgID].applyMessage('receiveSecretToProof',secretToProof);
    }else{
      //Something went wrong with the statemachine :(
    }


  }

  onDirectTransfer(directTransfer){
    if(!this.channelByPeer.hasOwnProperty(directTransfer.from.toString('hex'))){
      throw new Error('Invalid DirectTransfer: channel does not exist');
    }

    var channel = this.channelByPeer[directTransfer.from.toString('hex')];
    if(!channel.isOpen()){
      throw new Error('Invalid Channel State:state channel is not open');
    }

    console.log("EMIT TO UI: transferred:"+directTransfer.transferredAmount.sub(channel.peerState.transferredAmount));
    channel.handleTransfer(directTransfer,this.currentBlock);
  }

  onMediatedTransfer(mediatedTransfer){
    if(!this.channelByPeer.hasOwnProperty(mediatedTransfer.from.toString('hex'))){
      throw new Error('Invalid MediatedTransfer: channel does not exist');
    }

    var channel = this.channelByPeer[mediatedTransfer.from.toString('hex')];
    if(!channel.isOpen()){
      throw new Error('Invalid MediatedTransfer Received:state channel is not open');
    }
    //register the mediated transfer

    channel.handleTransfer(mediatedTransfer,this.currentBlock);
    if(mediatedTransfer.target.compare(this.address)===0){
      console.log("Start targetStateMachine");
      this.messageState[mediatedTransfer.msgID] = new stateMachineLib.MessageState(mediatedTransfer,this.targetStateMachine);
      this.messageState[mediatedTransfer.msgID].applyMessage('init',this.currentBlock);
    }
  }

  /**
     * Send a locked transfer to your channel partner. This method intiatlizes a initator state machine which will queue the message for send via handleEvent
     * @param {Buffer} to - eth address who this message will be sent to.  Only differs from target if mediating a transfer
     * @param {Buffer} target - eth address of the target.
     * @param {BN} amount - amount to lock and send.
     * @param {BN} expiration - the absolute block number this locked transfer expires at.
     * @param {Buffer} secret - Bytes32 cryptographic secret
     * @param {Buffer} hashLock - Bytes32 keccak256(secret) value.
     * @throws "Invalid MediatedTransfer: channel does not exist"
     * @throws 'Invalid Channel State:state channel is not open'
     */
  sendMediatedTransfer(to,target,amount,expiration,secret,hashLock){
    if(!this.channelByPeer.hasOwnProperty(to.toString('hex'))){
      throw new Error("Invalid MediatedTransfer: channel does not exist");
    }
    var channel = this.channelByPeer[to.toString('hex')];
    if(!channel.isOpen()){
      throw new Error('Invalid Channel State:state channel is not open');
    }

    //var expiration = this.currentBlock.add(channel.SETTLE_TIMEOUT);
    var msgID = this.incrementedMsgID();
    var mediatedTransferState = ({msgID:msgID,
      "lock":{
        hashLock:hashLock,
        amount:amount,
        expiration:expiration,
      },
      target:to,
      initiator:this.address,
      currentBlock:this.currentBlock,
      secret:secret,
      to:channel.peerState.address});

    this.messageState[msgID] = new stateMachineLib.MessageState(mediatedTransferState,this.initiatorStateMachine);
    this.messageState[msgID].applyMessage('init');
  }



  /**
     * Send a direct transfer to your channel partner.  This method calls send(directTransfer) and applies the directTransfer to the local channel state.
     * @param {Buffer} to - eth address who this message will be sent to.  Only differs from target if mediating a transfer
     * @param {Buffer} transferredAmount - the monotonically increasing amount to send.  This value is set by taking the previous transferredAmount + amount you want to transfer.
     * @throws "Invalid MediatedTransfer: unknown to address"
     * @throws 'Invalid DirectTransfer:state channel is not open'
     */
  sendDirectTransfer(to,transferredAmount){
    if(!this.channelByPeer.hasOwnProperty(to.toString('hex'))){
      throw new Error("Invalid MediatedTransfer: unknown to address");
    }
    var channel = this.channelByPeer[to.toString('hex')];
    if(!channel.isOpen()){
      throw new Error('Invalid DirectTransfer:state channel is not open');
    }
    var msgID = this.incrementedMsgID();
    var directTransfer = channel.createDirectTransfer(msgID,transferredAmount);
    this.signature(directTransfer);
    this.send(directTransfer);
    channel.handleTransfer(directTransfer);
  }

  incrementedMsgID(){
    this.msgID = this.msgID.add(new util.BN(1));
    return this.msgID;
  }


  /**Send the message. Override this function to define different transport channels
     * e.g integrate this with TELEGRAMS Api and securely transfer funds between users on telegram.
     * Generate qrcodes for revelSecret message
     * or implement webRTC p2p protocol for transport etc.
     * @param {message} msg - A message implementation in the message namespace 
     */
  send(msg){
    console.log("SENDING:"+messageLib.SERIALIZE(msg));
  }

  /** Internal event handlers triggered by state-machine workflows and blockchain events
  * @param {string} event - the GOT.* namespaced event triggered asynchronously by external engine components i.e. stateMachine, on-chain event handlers,etc.
  * @param {object} state - the accompanying object state 
  */
  handleEvent(event, state){
    try{

      if(event.startsWith('GOT.')){
        switch(event){
          case 'GOT.sendMediatedTransfer':
            var channel = this.channelByPeer[state.to.toString('hex')];
            if(!channel.isOpen()){
              throw new Error("Channel is not open");
            }

            //msgID,hashLock,amount,expiration,target,initiator,currentBlock
            var mediatedTransfer = channel.createMediatedTransfer(state.msgID,
              state.lock.hashLock,
              state.lock.amount,
              state.lock.expiration,
              state.target,
              state.initiator,
              state.currentBlock);
            this.signature(mediatedTransfer);
            this.send(mediatedTransfer);
            channel.handleTransfer(mediatedTransfer);
            break;
          case 'GOT.sendRequestSecret':
            var channel = this.channelByPeer[state.to.toString('hex')];
            var requestSecret = new messageLib.RequestSecret({msgID:state.msgID,to:state.from,
              hashLock:state.lock.hashLock,amount:state.lock.amount});
            this.signature(requestSecret);
            this.send(requestSecret);
            break;
          case 'GOT.sendRevealSecret':
            var channel = this.channelByPeer[state.to.toString('hex')];
            //technically, this workflow only works when target == to.  In mediated transfers
            //we need to act more generally and have the state machine tell us where we should
            //send this secret (backwards and forwards maybe)
            var revealSecret = new messageLib.RevealSecret({to:state.revealTo, secret:state.secret});
            this.signature(revealSecret);
            this.send(revealSecret);
            //we dont register the secret, we wait for the echo Reveal
            break;
          case 'GOT.sendSecretToProof':
            var channel = this.channelByPeer[state.to.toString('hex')];
            //OPTIMIZE:technically we can still send sec2proof,
            //it would beneficial to our partner saving $$ for lock withdrawal
            //but for now we act in no interest of the  peer endpoint :( meanie
            if(!channel.isOpen()){
              throw new Error("Channel is not open");
            }

            var secretToProof = channel.createSecretToProof(state.msgID,state.secret);
            this.signature(secretToProof)
            channel.handleTransfer(secretToProof);
            this.send(secretToProof);
            //TODO: in the future, wait to apply secret to proof locally. We basically locked the state up now
            //It makes sense, in a sense.  With this implementation, when a lock secret is revealed and echoed back
            // the peer MUST accept a valid SecretToProof or no more new transfers can take place as the states are unsynced
            //By having the peer echo back, we dont really do much difference, the state is simplex
            
            break;
          case 'GOT.closeChannel':
            var channel = this.channelByPeer[state.from.toString('hex')];
            //TODO emit closing
            return this.closeChannel(channel.channelAddress);
            //channel.handleClose(this.currentBlock);
            break;
          case 'GOT.issueSettle':
            //TODO emit "IssueSettle to ui + channel";
            var channelAddress = state;
            console.log("CAN ISSUE SETTLE:"+channelAddress.toString('hex'));
            break;
          }
          return;
        }
      }
    catch(err){
      this.handleError(err);
    }
  }

   /*** Internal error handler triggered by errors encountered by handleEvent  
    * @param {Error} err - the error caught during handleEvent execution
   */
  handleError(err){
    console.error(err);
  }
   
  /*** Blockchain callback when a new block is mined and blockNumber increases.  
  *This informs the engine of time progression via block number increments crucial for lockedtransfer
  * and channel lifecycle management
  * @param {BN} block - the latest mined block
  */
  onBlock(block){
    if(block.lt(this.currentBlock)){
      throw new Error("Block Error: block count must be monotonically increasing");
    }

    this.currentBlock = block;
    //handleBlock by all the in-flight messages
    //timeout or take action as needed
    var self = this;
    Object.values(this.messageState).map(function (messageState) {
      try{
        console.debug("CALL HANDLE BLOCK ON MESSAGE");
        messageState.applyMessage('handleBlock',self.currentBlock);
      }catch(err){
        console.log(err);
      }
    });
    //handleBlock for each of the channels, perhaps SETTLE_TIMEOUT has passed
    Object.values(this.channels).map(function(channel){
      console.debug("CALL HANDLE BLOCK ON CHANNEL");
      var events  = channel.onBlock(self.currentBlock);
      for(var i=0; i < events.length; i++){
        self.handleEvent.apply(events[i]);
      }
    });
  }

  /** Create a new channel given the peer ethereum address 
  * @param {Buffer} peerAddress - eth address
  * @returns {Promise} - the promise is settled when the channel is mined.  If there is an error during any point of execution in the mining
  * the onChannelNewError(peerAddress) is called
  */
  newChannel(peerAddress){
    //is this a blocking call?
    if(!this.pendingChannels.hasOwnProperty(peerAddress.toString('hex')) &&
     this.channelByPeer.hasOwnProperty(peerAddress.toString('hex')) 
      && this.channelByPeer[peerAddress.toString('hex')].state !== channelLib.CHANNEL_STATE_SETTLED){
      throw new Error("Invalid Channel: cannot create new channel as channel already exists with peer and is unsettled");
    }
    this.pendingChannels[peerAddress.toString('hex')] = true;
    var self = this;
    var _peerAddress = peerAddress;
    return this.blockchain.newChannel(peerAddress,channelLib.SETTLE_TIMEOUT).then(function(vals) {
      // ChannelNew(address netting_channel,address participant1,address participant2,uint settle_timeout);
      // var channelAddress = vals[0];
      // var addressOne = vals[1];
      // var addressTwo = vals[2];
      // var timeout = vals[3];
      //self.onChannelNew(channelAddress,addressOne,addressTwo,timeout);
    }).catch(function (err) {
      self.onChannelNewError(_peerAddress);
    });
    
  };

   /** close a channel given the peer ethereum address.  The close proof in the state is transferred during the call to close.
  * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
  * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
  * the onChannelCloseError(channelAddress) is called
  */
  closeChannel(channelAddress){
    if(!this.channels.hasOwnProperty(channelAddress.toString('hex'))){
      throw new Error("Invalid Close: unknown channel");
    }
    var channel = this.channels[channelAddress.toString('hex')];
    if(!channel.isOpen()){
      throw new Error("Invalid Close: Cannot reissue Closed");
    }

    var proof = channel.issueClose(this.currentBlock);
    var self = this;
    var _channelAddress = channelAddress;

    return this.blockchain.closeChannel(channelAddress,proof).then(function(closingAddress){
      //channelAddress,closingAddress,block
      //TODO: @Artur, only call this after the transaction is mined i.e. txMulitplexer 
      // return self.onChannelClose(_channelAddress,closingAddress);
    }).catch(function(error){
      return self.onChannelCloseError(_channelAddress);
    });
  
    
  }

  /** Update the proof after you learn a channel has been closed by the channel counter party 
  * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
  * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
  * the onTransferUpdatedError(channelAddress) is called
  */
  transferUpdate(channelAddress){
    if(!this.channels.hasOwnProperty(channelAddress.toString('hex'))){
      throw new Error("Invalid TransferUpdate: unknown channel");
    }
    var channel = this.channels[channelAddress.toString('hex')];
    if(channel.isOpen()){
      throw new Error("Invalid TransferUpdate: Cannot issue update on open channel");
    }
    var proof = channel.issueTransferUpdate(this.currentBlock);
    var self = this;
    var _channelAddress = channelAddress;
    
    return this.blockchain.updateTransfer(channelAddress, proof).then(function(nodeAddress){
      //self.onTransferUpdated(nodeAddress)
    }).catch(function(err) {
      self.onTransferUpdatedError(_channelAddress);
    })
    
  }

   /** Issue withdraw proofs on-chain for locks that have had their corresponding secret revealed.  Locks can be settled on chain once a proof has been sent on-chain.
   * Locks can only be withdrawn once.
  * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
  * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
  * the onChannelSecretRevealedError(channelAddress) is called for each lock that was not successfully withdrawn on-chain and must be reissued
  */
  withdrawPeerOpenLocks(channelAddress){
    if(!this.channels.hasOwnProperty(channelAddress.toString('hex'))){
      throw new Error("Invalid Withdraw: unknown channel");
    }
    var channel = this.channels[channelAddress.toString('hex')];
    if(channel.isOpen()){
      throw new Error("Invalid Withdraw: Cannot issue withdraw on open channel");
    }
    var openLockProofs = channel.issueWithdrawPeerOpenLocks(this.currentBlock);
    var withdraws = [];
    for(var i=0; i< openLockProofs.length; i++){
        var p = openLockProofs[i];
        //nonce,gasPrice,nettingChannelAddress, encodedOpenLock, merkleProof,secret)
        var _secret = p.openLock.secret;
        var _channelAddress = channelAddress;
        var self = this;
        var promise = this.blockchain.withdrawLock(channelAddress,p.encodeLock(),p.merkleProof,_secret)
        .then(function(vals){
          // var secret = vals[0];
          // var receiverAddress = vals[1];
          //  //channelAddress, secret, receiverAddress,block
          //  return self.onChannelSecretRevealed(_channelAddress,secret,receiverAddress)
        })
        .catch(function(err){              
           return self.onChannelSecretRevealedError(_channelAddress,_secret);
        })
        withdraws.push(promise);
    }
    return Promise.all(withdraws);
    
  }

  /** Settle the channel on-chain after settle_timeout time has passed since closing, unlocking the on-chain collateral and distributing the funds
  * according to the proofs and lock withdrawals on chain. 
  * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
  * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
  * the onChannelSettledError(channelAddress) is called
  */
  settleChannel(channelAddress){
    if(!this.channels.hasOwnProperty(channelAddress)){
      throw new Error("Invalid Settle: unknown channel");
    }
    var channel = this.channels[channelAddress.toString('hex')];
    if(channel.isOpen()){
      throw new Error("Invalid Settle: cannot issue settle on open channel");
    }

    var _channelAddress = channelAddress;
    var self = this;
    channel.issueSettle(this.currentBlock);
    var _channelAddress = channelAddress;
    return self.blockChain.settle(_channelAddress).then(function () {
      //return self.onChannelSettled(_channelAddress);
    }).catch(function(err){
      return self.onChannelSettledError(_channelAddress);
    });
  }

  /** Deposit an amount of the ERC20 token into the channel on-chain.  After the transaction is mined successfully,
  * that amount will be available for net transfer in the channel. This is effectively the collateral locked up during the 
  * channel lifetime and cannot be freed until the channel is closed and settled.
  * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
  * @param {BN} amount - the amount of the ERC20 token to deposit.  The maxium amount of the cumulative deposits is determined by the allowance setup for the channel.
  * @see Engine.approveChannel
  * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
  * the onChannelNewBalanceError(channelAddress) is called
  */
  depositChannel(channelAddress,amount){
    if(!this.channels.hasOwnProperty(channelAddress)){
      throw new Error("Invalid Settle: unknown channel");
    }
    var channel = this.channels[channelAddress.toString('hex')];
    if(!channel.isOpen()){
      throw new Error("Invalid Deposite: cannot issue settle on open channel");
    }
    var _channelAddress = channelAddress;
    var self = this;
    return self.blockChain.depoist(_channelAddress,amount).then(function (vals) {
      // event ChannelNewBalance(address token_address, address participant, uint balance);
      // var tokenAddress = vals[0];
      // var nodeAddress = vals[1];
      // var balance = vals[2];
      // return self.onChannelNewBalance(_channelAddress,nodeAddress,balance);
    }).catch(function(err){
      return self.onChannelNewBalanceError(_channelAddress);
    });
  }

  /** approve the channel to take ERC20 deposits.  This must be called before a deposit can be made successfully.  This utlimately creates and allowance
  * for the channel on the ERC20 contract.
  * @param {Buffer} channelAddress - the on-chain nettingchannel address of the channel
  * @param {BN} amount - the maximum amount of the ERC20 token to allow the channel to transfer when making a deposit.  
  * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
  * the onApprovalError(channelAddress) is called
  */
  approveChannel(channelAddress,amount){
    if(!this.channels.hasOwnProperty(channelAddress)){
      throw new Error("Invalid approve Channel: unknown channel");
    }
    var channel = this.channels[channelAddress.toString('hex')];
    var _channelAddress = channel.channelAddress;
    return self.blockChain.approve(self.blockchain.tokenAddress,channel.channelAddress,amount)
    .then(function (vals) {
      //event Approval(address indexed _owner, address indexed _spender, uint256 _value);
      // var owner = vals[0];
      // var spender = vals[1];
      // var value = vals[2];
     
      // return self.onApproval(owner,spender,value);
    }).catch(function(err){
      return self.onApprovalError(_channelAddress);
    });
  }

  /** Approve the channelManager to take the flat fee in GOT ERC20 tokens when a channel is created.  This only needs to be called once when the engine is initialized
  * @param {BN} amount - the maximum allowance of GOT ERC20 tokens to allow the channelManager to transfer.  
  * @returns {Promise} - the promise is settled when the channel close request is mined.  If there is an error during any point of execution in the mining
  * the onApprovalError() is called
  */
  approveChannelManager(amount){
    return self.blockChain.approve(self.blockchain.gotokenAddress,
      self.blockchain.chanelManagerAddress,
      amount)
    .then(function (vals) {
      //event Approval(address indexed _owner, address indexed _spender, uint256 _value);
      // var owner = vals[0]; 
      // var spender = vals[1];
      // var value = vals[2];
      // return self.onApproval(owner,spender,value);
    }).catch(function(err){
      return self.onApprovalError();
    });
  }
  
  /** Callback when a ERC20 token approves someone for an allowance
  * @param {String} owner - ethereum address hexString
  * @param {String} spender - ethereum address hexString
  * @param {BN} value - the allowance that was set
  */
  onApproval(owner,spender,value){
    return true;
  };

  onApprovalError(address){
    return true;
  }

  /** Callback when a new channel is created by the channel manager
  * @param {String} channelAddress - ethereum address hexString
  * @param {String} addressOne - ethereum address hexString
  * @param {String} addressTwo - ethereum address hexString
  * @param {BN} settleTimeout- the settle_timeout for the channel
  */
  onChannelNew(channelAddress,addressOne,addressTwo,settleTimeout){
    var peerAddress = null;
    if(addressOne.compare(this.address)===0){
      peerAddress = addressTwo;
    }else if(addressTwo.compare(this.address)===0){
      peerAddress = addressOne;
    }else{
      //something very wrong
      throw new Error("Invalid Channel Event:unknown new channel");
    }

    
    var existingChannel = this.channelByPeer[peerAddress.toString('hex')];
    if(existingChannel && existingChannel.state !== channelLib.CHANNEL_STATE_SETTLED){
      throw new Error("Invalid Channel: cannot add new channel as it already exists");
    }

    var stateOne = new channelStateLib.ChannelState({
      address:this.address
    });

    var stateTwo = new channelStateLib.ChannelState({
        address:peerAddress
    });
    
      //constructor(peerState,myState,channelAddress,settleTimeout,revealTimeout,currentBlock){
    var channel = new channelLib.Channel(stateTwo,stateOne,channelAddress,
       this.currentBlock);
    this.channels[channel.channelAddress.toString('hex')] = channel;
    this.channelByPeer[channel.peerState.address.toString('hex')] = channel;

    if(this.pendingChannels.hasOwnProperty(peerAddress.toString('hex'))){
      delete this.pendingChannels[peerAddress.toString('hex')] ;
    }
    return true;
  }

  onChannelNewError(peerAddress){
    if(this.pendingChannels.hasOwnProperty(peerAddress.toString('hex'))){
      delete this.pendingChannels[peerAddress.toString('hex')] ;
    }
    return;
    //TODO: emit UnableToCreate Channel with Peer
  }

  /** Callback when a channel has tokens deposited into it on-chain
  * @param {String} channelAddress - ethereum address hexString
  * @param {String} address - the particpants ethereum address in hexString who deposited the funds
  * @param {String} balance - the new deposited balance for the participant in the channel
  */
  onChannelNewBalance(channelAddress,address,balance){
    this.channels[channelAddress.toString('hex')].onChannelNewBalance(address,balance);
    return true;
  }

  onChannelNewBalanceError(){
    return false;
  }

  /** Callback when a  channel is closed on chain identifying which of the partners initiated the close
  * @param {String} channelAddress - ethereum address hexString
  * @param {String} closingAddress - ethereum address hexString
  */
  onChannelClose(channelAddress,closingAddress){

   var channel = this.channels[channelAddress.toString('hex')];
   channel.onChannelClose(closingAddress, this.currentBlock)
   if(closingAddress.compare(this.address) !==0){

    return this.transferUpdate(channelAddress)
   }
   return true;
  }

  onChannelCloseError(channelAddress,proof){
    var channel = this.channels[channelAddress.toString('hex')];
    return channel.onChannelCloseError();
  }

  /** Callback when a the counterpary has updated their transfer proof on-chain
  * @param {String} channelAddress - ethereum address hexString
  * @param {String} nodeAddress - the party who submitted the proof
  */
  onTransferUpdated(channelAddress,nodeAddress){
    return this.channels[channelAddress.toString('hex')].onTransferUpdated(nodeAddress,this.currentBlock);
  }

  onTransferUpdatedError(channelAddress){
    return this.channels[channelAddress.toString('hex')].onTransferUpdatedError();
  }

  /** Callback when a channel is settled on-chain
  * @param {String} channelAddress - ethereum address hexString
  */
  onChannelSettled(channelAddress){
    return this.channels[channelAddress.toString('hex')].onChannelSettled(this.currentBlock);
  }
  onChannelSettledError(channelAddress){
   return this.channels[channelAddress.toString('hex')].onChannelSettledError();;
  }

  /** Callback when a lock has been withdrawn on-chain.  If a user was withholding the secret in a mediate transfer,
  * the party can now unlock the pending locks in the other channels.  This is why it is essential in a mediated transfer setting
  * that each hop decrements the expiration by a safe margin such that they may claim a lock off chain in case of byzantine faults
  * @param {String} channelAddress - ethereum address hexString
  * @param {String} secret - the 32 byte secret in hexString
  * @param {String} receiverAddress - ethereum address hexString which unlocked the lock on-chain
  */
  onChannelSecretRevealed(channelAddress, secret, receiverAddress){
    return this.channels[channelAddress.toString('hex')].onChannelSecretRevealed(secret,receiverAddress,this.currentBlock);
  };
  onChannelSecretRevealedError(channelAddress, secret){
    return this.channels[channelAddress.toString('hex')].onChannelSecretRevealedError(secret);
  };

  /** Callback when a channel has been closed and the channel lifetime exceeds the refund interval.
  * i.e. channel.closedBlock - channel.openedBlock > refundInterval.  This is in hopes to incentives longer lived state channels
  * by reducing the cost of their deployment for longer periods.
  * @param {String} channelAddress - ethereum address hexString
  * @param {String} receiverAddress - ethereum address hexString of the party that received the refund
  * @param {BN} amount- the amount of GOT refunded
  */
  onRefund(channelAddress,receiverAddress,amount){
    return true;
  }
  

}

module.exports = {
  Engine
}


