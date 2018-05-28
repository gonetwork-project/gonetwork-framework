/*
* @Author: amitshah
* @Date:   2018-04-13 15:16:52
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-28 22:44:44
*/

const merkletree = require('./merkletree');
const util = require('ethereumjs-util')
const sjcl = require('sjcl');
const rlp = require('rlp');
const abi = require("ethereumjs-abi");
const message = require('./message');



/** @class channel state endpoint; each Channel is composed of two channel state represent both actors
* @property {message.Proof} proof-the proof snapshot of this endpoint.  If this channel state represents the peer, this proof is submitted during
* channel closing. 
* @property {Object.<string,message.Lock>} pendingLocks - the pending locks that have not had their secrets revealed.  The key is the hashLock value
* @property {Object.<string,message.OpenLock>} openLocks - the opened locks that have had their secrets revealed.  The key is the hashLock value
* @property {merkletree.MerkleTree} merkleTree - the merkleTree based on the pending and open locks
* @property {BN} depositBalance=0 - the amount of funds deposited on-chain by this channel state endpoint
* @property {Buffer} address - the ethereum address of the particpant who's state this endpoint represents
* @see Channel
*/
class ChannelState{
  /** @constructor
  * @param {object} options*/
  constructor(options){
    this.proof = options.proof || new message.ProofMessage({});
    //dictionary of locks ordered by hashLock key
    this.pendingLocks = {};
    this.openLocks = {};
    this.merkleTree = options.merkleTree || new merkletree.MerkleTree([]);
    //the amount the user has put into the channel
    this.depositBalance = options.depositBalance || new util.BN(0);
    this.address = options.address || message.EMPTY_20BYTE_BUFFER;
  }

  /** @property {BN} the nonce that ensures transfer ordering as retreived from the proof */
  get nonce(){
    return this.proof.nonce;
  }

  /** @property {BN} the monotonically increasing transferredAmount retrieved from the proof */
  get transferredAmount(){
    return this.proof.transferredAmount;
  }

  /** update the channel state to reflect locked transfer
  * @param {(message.LockedTransfer|message.MediatedTransfer)}
  * @throws "Invalid Message Type: DirectTransfer expected"
  * @throws "Invalid Lock: lock already registered"
  * @throws "Invalid hashLockRoot"
  */
  applyLockedTransfer(lockedTransfer){
    if(!lockedTransfer instanceof message.LockedTransfer){
      throw new Error("Invalid Message Type: DirectTransfer expected");
    }
    var proof = lockedTransfer.toProof();
    var lock = lockedTransfer.lock;
    var hashLockKey = lock.hashLock.toString('hex');
    if(this.pendingLocks.hasOwnProperty(hashLockKey) || this.openLocks.hasOwnProperty(hashLockKey)){
      throw new Error("Invalid Lock: lock already registered");
    }
    var mt = this._computeMerkleTreeWithHashlock(lock);

    if(mt.getRoot().compare(proof.locksRoot)!= 0){
        throw new Error("Invalid hashLockRoot");
    };
    this.pendingLocks[hashLockKey] = lock;
    this.proof = proof;
    this.merkleTree = mt;
  }

  /** update the channel state to reflect direct transfer
  * @param {message.DirectTransfer}
  * @throws "Invalid Message Type: DirectTransfer expected"
  * @throws "Invalid hashLockRoot"
  */
  applyDirectTransfer(directTransfer){
    if(!directTransfer instanceof message.DirectTransfer){
      throw new Error("Invalid Message Type: DirectTransfer expected");
    }
    if(this.merkleTree.getRoot().compare(directTransfer.locksRoot)!==0){
      throw new Error("Invalid hashLockRoot");
    }
    this.proof = directTransfer.toProof();
  }

  /** applies the secret to to unlock a pending lock
  * @param {message.RevealSecret}
  * @throws "Invalid Message Type: RevealSecret expected"
  * @throws "Invalid Lock: uknown lock secret received"
  */
  applyRevealSecret(revealSecret){
    if(!revealSecret instanceof message.RevealSecret){
      throw new Error("Invalid Message Type: RevealSecret expected");
    }
    var hashLock = revealSecret.hashLock;
    var hashLockKey = hashLock.toString('hex');
    var pendingLock = null;
    if(!(this.pendingLocks.hasOwnProperty(hashLockKey) || this.openLocks.hasOwnProperty(hashLockKey))){
      throw new Error("Invalid Lock: uknown lock secret received");
    }
    if(this.pendingLocks.hasOwnProperty(hashLockKey)){
      //TODO this must be atomic operation, you will have to sanity check on restart
      //if we crash here, we will have the same lock twice...
      pendingLock = this.pendingLocks[hashLockKey];
      this.openLocks[hashLockKey] = new message.OpenLock(pendingLock,revealSecret.secret);
      delete this.pendingLocks[hashLockKey];
    }
  }

  /** removes the open lock and applies the locked amount to the transferredAmount allowing indefinte channel lifetime
  * @param {message.SecretToProof}
  * @throws "Invalid Message Type: SecretToProof expected"
  * @throws "Invalid Lock: uknown lock secret received"
  * @throws "Invalid hashLockRoot in SecretToProof"
  */
  applySecretToProof(secretToProof){
    if(!secretToProof instanceof message.SecretToProof){
      throw new Error("Invalid Message Type: SecretToProof expected");
    }
    var proof = secretToProof.toProof();
    var secret = secretToProof.secret;
    var hashLock = secretToProof.hashLock;
    var hashLockKey = hashLock.toString('hex');

    var pendingLock = null;
    if(this.pendingLocks.hasOwnProperty(hashLockKey)){
      pendingLock = this.pendingLocks[hashLockKey];
    }else if(this.openLocks.hasOwnProperty(hashLockKey)){
      pendingLock = this.openLocks[hashLockKey];
    }
    if(!pendingLock){
      throw new Error("Invalid Lock: uknown lock secret received");
    }

    var mt = this._computeMerkleTreeWithoutHashlock(pendingLock);
    if(!mt.getRoot().compare(proof.locksRoot) ==0){
      throw new Error("Invalid hashLockRoot in SecretToProof");
    }

    //we compare this fundamental assumption in the Channel
    // if(!(proof.transferredAmount == pendingLock.amount + this.proof.transferredAmount){
    //   throw new Error("Invalid transferredAmount in SecretToProof");
    // }

    //remove the secret from lock states, always use local copies of variables
    if(this.pendingLocks.hasOwnProperty(pendingLock.hashLock.toString('hex'))){
      delete this.pendingLocks[pendingLock.hashLock.toString('hex')];
    }else if(this.openLocks.hasOwnProperty(pendingLock.hashLock.toString('hex'))){
      delete this.openLocks[pendingLock.hashLock.toString('hex')];
    }
    this.proof = proof;
    this.merkleTree = mt;
  }
   /** Internal computes merkle tree including a new leaf element
   * @param {message.Lock}
   * @returns {merkletree.MerkleTree}
   */
   _computeMerkleTreeWithHashlock(lock){
      var mt = new merkletree.MerkleTree(Object.values(Object.assign({},this.pendingLocks, this.openLocks)).concat(lock).map(
        function (l) {
        return l.getMessageHash();
      }));

      mt.generateHashTree();
      return mt;
    }
    /** Internal computes merkle tree  without a particular leaf element
    * @param {message.Lock}
    * @returns {merkletree.MerkleTree}
    */
    _computeMerkleTreeWithoutHashlock(lock){
      var hashLockKey = lock.hashLock.toString('hex');
      var locks = Object.assign({}, this.pendingLocks, this.openLocks);
      if(!locks.hasOwnProperty(hashLockKey)){
        throw new Error("Unknown Lock: Cannot compute merkletree trying to remove Unknown lock");
      }
      delete locks[hashLockKey];

       var mt = new merkletree.MerkleTree(Object.values(locks).map(
        function (l) {
        return l.getMessageHash();
      }));

      mt.generateHashTree();
      return mt;
    }


    /**retreive the lock corresponding to the keccak256 hash of the secret
   * @param {Buffer} secret
   * @returns {(message.Lock| message.OpenLock | null)}
   */
    getLockFromSecret(secret){
      var hashLock = util.sha3(secret);
      var hashLockKey = hashLock.toString('hex');
      if(this.pendingLocks.hasOwnProperty(hashLockKey)){
        return this.pendingLocks[hashLockKey];
      }
      if(this.openLocks.hasOwnProperty(hashLockKey)){
        return this.openLocks[hashLockKey];
      }
      return null;
    }

    /** determine if this channel has the lock in pending or open state 
    * @param {message.Lock} lock
    * @returns {bool}
    */
    containsLock(lock){
      var hashLockKey = lock.hashLock.toString("hex");
      return this.pendingLocks.hasOwnProperty(hashLockKey) || this.openLocks.hasOwnProperty(hashLockKey);
    }

    /** @property {BN} return the minimum lock expiration time across all open locks. This effectively give an upper bound for how long the channel
    * can remain open unless the lock is converted to a transfer via message.SecretToProof message sent from counterparty.
    */
    get minOpenLockExpiration(){
      return reduce(
      map(Object.values(this.openLocks),function  (lock) {
        return lock.expiration;
      }),function (expiration,lock) {
        if(lock.expiration.lt(expiration)){
          return lock.expiration;
        }
        return expiration;
      },new util.BN(0));
    }

    /** determine the amount of funds that are locked. The safeblock parameter is required if you want to prevent 
    * channel exhaustion due to lock expirations.  
    * @param {BN} safeBlock
    * @returns {BN}
    */
    lockedAmount(safeBlock){
      //we only want lockedAmounts that have not yet expired
      return this._lockAmount(Object.values(this.pendingLocks),safeBlock);
    }

    /** the amount of funds that are unlocked and usable in the netting channel
    * @returns {BN}
    */
    unlockedAmount(){
       //we sort of disregard the expiration, the expiration of unlocked
       //locks forces an onchain settle more then anything
       return this._lockAmount(Object.values(this.openLocks));
    }

    /** the total amount of funds that are availble regarding both locked and unlocked funds
    * @param {message.Lock[]} locksArray
    * @param {BN} safeBlock - safe expiration time
    * @returns {BN}
    */
    _lockAmount(locksArray,safeBlock){

      if(safeBlock){
        safeBlock = message.TO_BN(safeBlock);
       return locksArray.reduce(function(sum,lock){
        if(lock.expiration.gt(safeBlock)){

          return sum.add(lock.amount);
        }
        return sum;
      }, new util.BN(0));
     }else{
      return locksArray.reduce(function(sum,lock){
        return sum.add(lock.amount);
      }, new util.BN(0));
     }
    }

    /** Deprecated */
    balance(peerState){
      throw new Error("not implemented");
    }

    /** Deprecated */
    transferrable(peerState){
      throw new Error("not implemented");
      this.balance(peerState).sub(this.lockedAmount);
    }

    /** create a lock proof that maybe submitted for onchain withdrawal of lock during the settlement period
    * @param {message.OpenLock} lock
    * @returns {Buffer[]}
    */ 
    generateLockProof(lock){
     var lockProof = this.merkleTree.generateProof(lock.getMessageHash());
     var verified = merkletree.checkMerkleProof(lockProof,this.merkleTree.getRoot(),lock.getMessageHash());
     if(!verified){
      throw new Error("Error creating lock proof");
     }
     return lockProof;
    }

}

module.exports= {
  ChannelState
};



