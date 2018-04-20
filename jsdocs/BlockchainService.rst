============================
Class: ``BlockchainService``
============================


.. contents:: Local Navigation
   :local:

Children
========

.. toctree::
   :maxdepth: 1
   
   BlockchainService.BlockchainService
   
Description
===========




.. _BlockchainService.newChannel:


Function: ``newChannel``
========================

Creates a transaction to open a new channel

.. js:function:: newChannel(nonce, gasPrice, channelAddress, partnerAddress, timeout)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param string channelAddress: channel address
    :param string partnerAddress: partner address
    :param int timeout: in milliseconds
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    
.. _BlockchainService.approve:


Function: ``approve``
=====================

Creates a transaction to approve a withdrawl

.. js:function:: approve(nonce, gasPrice, tokenAddress, spender, amount)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param string tokenAddress: token address
    :param string spender: spender
    :param Number amount: amount
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    
.. _BlockchainService.deposit:


Function: ``deposit``
=====================

Creates a transaction to deposit into a channel

.. js:function:: deposit(nonce, gasPrice, nettingChannelAddress, amount)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param string nettingChannelAddress: netting channel address
    :param Number amount: amount
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    
.. _BlockchainService.close:


Function: ``close``
===================

Creates a transaction to close a channel

.. js:function:: close(nonce, gasPrice, nettingChannelAddress, proof)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param string nettingChannelAddress: netting channel address
    :param object proof: proof
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    
.. _BlockchainService.updateTransfer:


Function: ``updateTransfer``
============================

Creates a transaction to update transfer

.. js:function:: updateTransfer(nonce, gasPrice, nettingChannelAddress, proof)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param string nettingChannelAddress: netting channel address
    :param object proof: proof
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    
.. _BlockchainService.withdrawLock:


Function: ``withdrawLock``
==========================

Creates a transaction to withdraw lock

.. js:function:: withdrawLock(nonce, gasPrice, nettingChannelAddress, encodedOpenLock, merkleProof, secret)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param string nettingChannelAddress: netting channel address
    :param object encodedOpenLock: encoded open lock
    :param object merkleProof: merkle proof
    :param object secret: secret
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    
.. _BlockchainService.settle:


Function: ``settle``
====================

Creates a transaction to settle the channel

.. js:function:: settle(nonce, gasPrice, nettingChannelAddress)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param string nettingChannelAddress: netting channel address
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    
.. _BlockchainService.solidityPackSignature:


Function: ``solidityPackSignature``
===================================

Packs the signature

.. js:function:: solidityPackSignature(signature)

    
    :param object signature: needs: signature.r, signature.s, signature.v
    :return Buffer: - see https://github.com/ethereumjs/ethereumjs-abi/blob/master/lib/index.js
    
.. _BlockchainService.createAndSignTransaction:


Function: ``createAndSignTransaction``
======================================

Creates a signed transaction

.. js:function:: createAndSignTransaction(nonce, gasPrice, gasLimit, to, value, data)

    
    :param Number nonce: called each time with a higher value
    :param Number gasPrice: gas price
    :param Number gasLimit: gas limit
    :param string to: to address
    :param Number value: value
    :param object data: data
    :return EthereumTx: - see https://github.com/ethereumjs/ethereumjs-tx
    

.. _BlockchainService.chainID:

Member: ``chainID``: 

.. _BlockchainService.signatureCallback:

Member: ``signatureCallback``: 




