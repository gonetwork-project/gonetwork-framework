import * as util from 'ethereumjs-util'
import * as assert from 'assert'

export { assert }

export function assertChannelState (
  engine, channelAddress, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount,
  peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock) {
  let state1 = engine.channels[channelAddress.toString('hex')].myState
  assertStateBN(state1, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock)
  let state2 = engine.channels[channelAddress.toString('hex')].peerState
  assertStateBN(state2, peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock)
}

export function assertProof (transfer, nonce, channelAddress, transferredAmount, locksRoot, from) {
  assert.equal(transfer.nonce.eq(nonce), true, 'correct nonce in transfer')
  assert.equal(transfer.transferredAmount.eq(new util.BN(transferredAmount)), true, 'correct transferredAmount in transfer')
  assert.equal(transfer.channelAddress.compare(util.toBuffer(channelAddress)), 0, 'correct channelAddress in transfer')
  assert.equal(transfer.locksRoot.compare(util.toBuffer(locksRoot)), 0, 'correct locksRoot in transfer')
  if (from) {
    assert.equal(transfer.from.compare(from), 0, 'correct from recovery in transfer')
  }
}

function assertStateBN (state, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock) {
  assert.equal(state.nonce.eq(new util.BN(nonce)), true, 'correect nonce in state')
  assert.equal(state.proof.transferredAmount.eq(new util.BN(transferredAmount)), true, 'correct transferredAmount in state')
  if (!currentBlock) {
    currentBlock = new util.BN(0)
  }
  assert.equal(state.lockedAmount(currentBlock).eq(new util.BN(lockedAmount)), true, 'correct lockedAmount calculated in state')
  assert.equal(state.unlockedAmount().eq(new util.BN(unlockedAmount)), true, 'correct unlockedAmount calculated in state')
  assert.equal(state.depositBalance.eq(new util.BN(depositBalance)), true, 'correct depositBalance in state')
}
