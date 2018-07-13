import * as util from 'ethereumjs-util'
import { Nonce, Wei, Address } from 'eth-types'
import { ChannelIO } from '../../__GEN__/NettingChannelContract'

export const assert = {
  // test were moved to jest from tape
  // since jest does not support custom messages we force the message to be included in the assertion itself
  equal: (v1: any, v2: any, msg = 'ASSERT FAILED') => {
    expect({ msg, value: v1 }).toEqual({ msg, value: v2 })
  }
}

type Transfer = [{to: Address, from?: Address}, ChannelIO['close'][0]]

export function assertChannelState (
  engine, channelAddress, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount,
  peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock) {
  let state1 = engine.channels[channelAddress.toString('hex')].myState
  assertStateBN(state1, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock)
  let state2 = engine.channels[channelAddress.toString('hex')].peerState
  assertStateBN(state2, peerNonce, peerDepositBalance, peerTransferredAmount, peerLockedAmount, peerUnlockedAmount, currentBlock)
}

export function assertProof (transfer: Transfer, nonce: Nonce, channelAddress: Address, transferredAmount: Wei,
   locksRoot, from: Address) {
  assert.equal(transfer[0].to.compare(util.toBuffer(channelAddress)), 0, 'correct channelAddress in transfer')

  assert.equal(transfer[1].nonce.eq(nonce), true, 'correct nonce in transfer')
  assert.equal(transfer[1].transferred_amount.eq(transferredAmount), true, 'correct transferredAmount in transfer')
  assert.equal(transfer[1].locksroot.compare(util.toBuffer(locksRoot)), 0, 'correct locksRoot in transfer')

  // TODO: revisit
  // if (from) {
  //   assert.equal(transfer[0].from!.compare(from), 0, 'correct from recovery in transfer')
  // }
}

function assertStateBN (state, nonce, depositBalance, transferredAmount, lockedAmount, unlockedAmount, currentBlock) {
  assert.equal(state.nonce.eq(new util.BN(nonce)), true, 'correct nonce in state')
  assert.equal(state.proof.transferredAmount.eq(new util.BN(transferredAmount)), true, 'correct transferredAmount in state')
  if (!currentBlock) {
    currentBlock = new util.BN(0)
  }
  assert.equal(state.lockedAmount(currentBlock).eq(new util.BN(lockedAmount)), true, 'correct lockedAmount calculated in state')
  assert.equal(state.unlockedAmount().eq(new util.BN(unlockedAmount)), true, 'correct unlockedAmount calculated in state')
  assert.equal(state.depositBalance.eq(new util.BN(depositBalance)), true, 'correct depositBalance in state')
}
