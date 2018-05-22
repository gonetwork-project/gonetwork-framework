"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generic_log_decoder_1 = require("../utils/generic-log-decoder");
const ChannelManagerContract = require('../../smart-contracts/build/contracts/ChannelManagerContract.json');
const NettingChannelContract = require('../../smart-contracts/build/contracts/NettingChannelContract.json');
const HumanStandardTokenContract = require('../../smart-contracts/build/contracts/HumanStandardToken.json');
const decoder = new generic_log_decoder_1.default([ChannelManagerContract, NettingChannelContract, HumanStandardTokenContract]);
exports.decode = (log) => decoder.decode(log);
exports.decodeChannelManager = exports.decode;
exports.decodeNettingChannel = exports.decode;
exports.decodeToken = exports.decode;
//# sourceMappingURL=log-decoder.js.map