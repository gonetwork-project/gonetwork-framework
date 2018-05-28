/*
* @Author: amitshah
* @Date:   2018-04-13 15:17:02
* @Last Modified by:   amitshah
* @Last Modified time: 2018-04-28 19:39:07
*/
const util = require('ethereumjs-util');
util.Buffer = require('buffer').Buffer;

/**
 * @namespace merkletree
 */

/**@class MerkleTree 
* A special thanks to blog posts by ameensol and raiden-network team and their work on merkle proofs 
* A class the implements both ordered and unordered leaf nodes for a merkele tree
* leverages keccak256 hashes
* if the leaves are to be unordered, then the intermediate nodes are ordered by their buffer values and concatenated prior to; 
* used primarily for validation of objects. By default, order is not preserved and we use Buffer.Compare order
* @constructor
* @param {Buffer[]} elements - an array of 32 Byte hashed Buffer elements that will make up the tree
* @param {bool} ordered - determines if the elements preserve ordering as we walk up the tree to generate proofs
* @memberof merkletree
*/
function MerkleTree(elements,ordered) {
  this.ordered = ordered;
  // remove empty strings
  this.elements = elements.filter(function(n){ return n != undefined });

  // check only buffers have been submitted
  for(var i=0; i< this.elements.length; i++){
    //if the element was a buffer, it was left untouched, if it was hex or string, converted
    var buffer = util.toBuffer(this.elements[i]);
    if(!(buffer.length ==32)){
      throw new Error("32 byte buffer expected as input element");
    }
  }
  this.levels = [];
  if(!ordered){
    this.levels.push(this.elements.sort(Buffer.compare));
  }else{
    this.levels.push(this.elements);
  }
}

/** getRoot - returns the 32 byte merkle root element or 0 buffer otherewise
* @returns {Buffer}
*/
MerkleTree.prototype.getRoot = function() {
  if(this.elements.length ===0){
    return Buffer.alloc(32);
  }
  return this.levels[this.levels.length - 1][0]
}




/** Internal generateHashTree - a side-effect driven function that generates the levels of the merkle tree; there are log2(n) levels*/
MerkleTree.prototype.generateHashTree=  function(){
    var level = this.levels[0];
    do{
        //212afc935a5685e12f22195713fac5ba98989c7dda8b0764f5e8256fc1544a075b9972cfef311465c48e55f03a979b661529a5671b939fdd85e842af34650d90
        level = this.sumLevel(level);
        this.levels.push(level);
    }while(level.length> 1);
}


/** Internal sumLevell*/
MerkleTree.prototype.sumLevel = function(elements){
    //move to front of array
    var result = [];

    var zeroBuffer = util.toBuffer(0);
    var k = 0;
//    we cant really balance the tree, that maybe crazy at larger transaction counts
//      akin to perhaps preallocating a binary tree
//    if([temp count] % 2 != 0){
//        keccack_256(hash, 32, zero, 32);
//        [temp addObject:[NSValue valueWithPointer:hash]];
//    }

    while(k < elements.length){

        var a = elements[k++];
        var b = null;
        var hash = null;
        var buffer = null;
        if(k < elements.length){
            //concat buffers
            buffer =concatBuffer(a,elements[k++],this.ordered);
           //we re-use and blowup the hash value stored
            hash = util.sha3(buffer);
            result.push(hash);

        }else{
            //send up the hash as is on the tree
            result.push(elements[k-1]);
        }
    }
    //move enumerator back to the end
    return result;
}

/** concatBuffer - concat two buffers in byte order or in the order supplied depneding on the order flag 
* @param {Buffer} a 
* @param {Buffer} b  
* @param {bool} ordered - if true, concats a+b, if false then Buffer.compare sort a and b and then concat
* @returns (Buffer)
* @memberof merkletree
*/
function concatBuffer(a,b,ordered){
  //TODO: IS this portable??
  //TypedArrays apparent supported across all browser, have to see if safari webkit supports
  //incremental sort of buffers
  if(!ordered){
    return util.Buffer.concat([a,b].sort(Buffer.compare));
  }else{
    return util.Buffer.concat([a,b]);
  }
}

/** generateProof - generates a merkle tree proof for the given hashed element 
* @param {Buffer} hashedElement - a 32 Byte Buffer of the hashed element 
* @returns {Buffer[]} 
*/
MerkleTree.prototype.generateProof = function(hashedElement){

    var result = [];
    var k =0;
    if(!(hashedElement.length ===32 && util.Buffer.isBuffer(hashedElement))){
      throw new Error("a proof can only be generated for a hashed element, please try hashing your element before sending");
    }
    //Get the index of the element first
    for(var i = 0; i < this.levels[0].length; i++){
        var v = this.levels[0][i];

        if(hashedElement.compare(v)===0){
            break;
        }
        k++;
    }

    //now go through the layers to make the proof
    for(var i=0; i < this.levels.length;i++){
        var level = this.levels[i];
        var v = this._getProofPair(k,level);
        if(v){
            result.push(v);
        }
        k = Math.floor(k/2);
    }

    return result;

}

/** Internal _getProofPair - returns the adjacent object in the level when walking the tree to generate a proof 
* @param {int} index
* @param {Buffer[]} level
* @returns {Buffer} or Null
*/
MerkleTree.prototype._getProofPair = function(index,level){
    var pairIndex = (index+1) %2 ==0 ? index -1 : index +1;
    if(pairIndex < level.length){
        return level[pairIndex];
    }
    return null;
}


MerkleTree.prototype.push = function(hashedElement){
  if(!(hashedElement.length ===32 && util.Buffer.isBuffer(hashedElement))){
      throw new Error("a proof can only be generated for a hashed element, please try hashing your element before sending");
    }
  this.elements.push(hashedElement);
  if(!this.ordered){
    this.levels[0] = this.elements.sort(Buffer.compare);
  }else{
    this.levels[0]=this.elements;
  }
  this.generateHashTree();
}

MerkleTree.prototype.remove = function(hashedElement){
  var index = this.findElement(hashedElement);
  this.elements = this.elements.splice(index,1);
  if(!this.ordered){
    this.levels[0]=this.elements.sort(Buffer.compare);
  }else{
    this.levels[0]=this.elements;
  }
  this.generateHashTree();
}

//linear search...
MerkleTree.prototype.findElement = function(hashedElement){
  var k = 0;
  do{
    var buffer = this.elements[k];
    if(buffer.equals(hashedElement)){
      return k;
    }
    k++;
  }while(k< this.elements.length);
}

/** Internal verify - returns true or false if the proof and hashedElement equate to the current merkleTree's root 
* @param {Buffer[]} proof - an array of bytes32 elements that represent the merkle proof 
* @param {Buffer} hashedElement - hashed bytes32 leaf element to prove exists in the tree 
* @returns {bool}
*/
MerkleTree.prototype.verify = function(proof,hashedElement){
  return checkMerkleProof(proof,this.getRoot(), hashedElement, this.ordered);
}

/** Deprectated 
* @memberof message
*/
function checkMerkleProofOrdered(proof, root, element, index) {
  // use the index to determine the node ordering
  // index ranges 1 to n

  var tempHash = element;

  for (var i = 0; i < proof.length; i++) {
    var remaining = proof.length - i;

    // we don't assume that the tree is padded to a power of 2
    // if the index is odd then the proof will start with a hash at a higher
    // layer, so we have to adjust the index to be the index at that layer
    while (remaining && index % 2 === 1 && index > Math.pow(2, remaining)) {
      index = Math.round(index / 2)
    }

    if (index % 2 === 0) {
      //right append for even index
      tempHash = util.sha3(concatBuffer(proof[i], tempHash,true));
    } else {
      tempHash = util.sha3(concatBuffer(tempHash, proof[i],true));
    }
    index = Math.round(index / 2)
  }
  return tempHash.equals(root)
}

/** checkMerkleProof - return true if the supplied merkle proof and element equate to the root element 
* @param {Buffer[]} proof - an array of bytes32 elements that represent the merkle proof 
* @param {Buffer} root -bytes32 of the root of the merkleTree
* @param {Buffer} element - hashed bytes32 leaf element to prove exists in the tree  
* @returns {bool} 
* @memberof merkletree
*/
function checkMerkleProof(proof,root,element){
 var buffer = proof.reduce(function(acc, currentValue){
    return util.sha3(concatBuffer(acc,currentValue));
  },element);
  return root.equals(buffer);
}
/** Internal printTree - function to pretty print each of the log(n) levels that make up the merkle tree 
* @param {MerkleTree} merkletree
* @memberof merkletree
*/
function printTree(merkletree)
{

    for(var i =0; i < merkletree.levels.length;i++){
        var level = merkletree.levels[i];
        console.log("----------------LEVEL"+i+"--------- \r\n \r\n");
        for(var j =0; j < level.length ; j++){
            console.log(util.bufferToHex(level[j]));
        }
  }

}


module.exports = {
  MerkleTree,
  checkMerkleProof,
  checkMerkleProofOrdered,
  printTree
}
