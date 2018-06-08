

# Gonetwork Framework 

Consolidated framework with state channel engine, blockchain service, and transport layer implementation.

GoNetwork Documentations [WIP] : https://gonetwork.co/docs/Engine.html

Quick Start
===========

npm install

# Run Direct Transfer Test over Mqtt:

cd ./test/throughput

open 2 terminals.  Each node will connect to a publicly available mqtt client.

in terminal 1 run: 

node client2.js

in terminal 2 run:

node client1.js

# Run Mediated Transfer Test over Mqtt:

see above for setup

in terminal 1 run: 

node client2_mediated.js

in terminal 2 run:

node client1_mediated.js

# GoNetwork Blockchain Service

The BlockChain service is written as a standalone library that provides full offchain support for transactions and geth calls.  The service is written as a lightweight library for use in various projects.  We implement a subset of https://github.com/ethereum/wiki/wiki/JSON-RPC and include wrappers around the smart-contracts in use for state-channel implementation.  All signing is handled by the library and generates the appropriate rpc payloads that can be sent to any geth node you'd like.  There is minimal trust in the geth node servicing you request beyond the fact that it will distribute your message as your privateKey and signing is handled in the application context running the library.

When making eth_call functions however, you need to be more weary (in general) of the communication endpoint as results can be easily spoofed.

This library will work well in conjunction with standard Geth HTTP Gateway Providers/Apis; Infura, EtherScan, etc.
