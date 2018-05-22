"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let i = 0;
const requestFactory = (network, token) => (method, params) => fetch(`https://${network}.infura.io/${token}`, {
    method: 'POST',
    headers: {
        contentType: 'application/json'
    },
    body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++i,
        method,
        params: [params]
    })
})
    // .then(x => {
    //   console.log(x.status, x.statusText)
    //   return x
    // })
    .then(r => r.status === 200 ?
    r.json()
        .then(r => {
        //   console.log('RESPONSE', r, params)
        return r.result;
    })
    : r.text());
const toHex = (n) => `0x${Number(n).toString(16)}`;
exports.infuraMonitoring = (network, token, request = requestFactory(network, token)) => ({
    blockNumber: () => request('eth_blockNumber'),
    getLogs: (fromBlock, toBlock, address) => request('eth_getLogs', { fromBlock: toHex(fromBlock), toBlock: toHex(toBlock), address: address[0] }),
    getTransactionReceipt: (tx) => request('eth_getTransactionReceipt', tx)
});
//# sourceMappingURL=infura.js.map