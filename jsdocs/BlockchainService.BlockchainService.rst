.. _BlockchainService.BlockchainService:

============================
Class: ``BlockchainService``
============================

Member Of :doc:`BlockchainService`

.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   
Description
===========

BlockchainService class provides blockchain services within react-native environments






Examples
========

.. code-block:: javascript
   :caption: Create a new blockchain service 

   const util = require("ethereumjs-util");
   const bcs = require('../src/blockchain.js');
   // private key
   var pk1=util.toBuffer("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
   // constructor arguments: chainID, signatureCallback
   var bc = new bcs.BlockchainService(0,function(cb) {
   	cb(pk1);
   })

