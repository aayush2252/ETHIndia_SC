/* global artifacts, web3 */
/* eslint-disable no-underscore-dangle, no-unused-vars */
const BN = require("bn.js");
const moment = require("moment");
const increaseTime = require("./increaseTime");

const OmiseGoToken = artifacts.require("./OmiseGo.sol");
// const ManaToken = artifacts.require("./Mana.sol");
const NetworkProxy = artifacts.require("./KyberNetworkProxy.sol");
const Network = artifacts.require("./KyberNetwork.sol");
const Reserve = artifacts.require("./KyberReserve.sol");

function stdlog(input) {
  console.log(`${moment().format("YYYY-MM-DD HH:mm:ss.SSS")}] ${input}`);
}

function tx(result, call) {
  const logs = result.logs.length > 0 ? result.logs[0] : { address: null, event: null };

  console.log();
  console.log(`   ${call}`);
  console.log("   ------------------------");
  console.log(`   > transaction hash: ${result.tx}`);
  console.log(`   > contract address: ${logs.address}`);
  console.log(`   > gas used: ${result.receipt.gasUsed}`);
  console.log(`   > event: ${logs.event}`);
  console.log();
}

module.exports = async callback => {
  try {
    stdlog("- START -");
    let expectedRate;
    let slippageRate;
    const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const accounts = await web3.eth.getAccounts();
    const userWallet = accounts[4];
    const OMISEGOInstance = await OmiseGoToken.at(OmiseGoToken.address);
    const NetworkProxyInstance = await NetworkProxy.at(NetworkProxy.address);
    const NetworkInstance = await Network.at(Network.address);
    const ReserveInstance = await Reserve.at(Reserve.address);
    console.log("Reserve Address: ", Reserve.address);
    const userDaiBalance = web3.utils.fromWei(await OMISEGOInstance.balanceOf(Reserve.address));
    console.log("User OMG balance: ", userDaiBalance, " OMG");

    // Approve the KyberNetwork contract to spend user's tokens
    await OMISEGOInstance.approve(NetworkProxy.address, web3.utils.toWei(new BN(100000)), { from: userWallet });
    ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
      OmiseGoToken.address, // srcToken
      ETH_ADDRESS, // destToken
      web3.utils.toWei(new BN(100)) // srcQty
    ));
    console.log("Received expected rate : ", web3.utils.fromWei(expectedRate));

    const result = await NetworkProxyInstance.swapTokenToEther(
      OmiseGoToken.address, // srcToken
      web3.utils.toWei(new BN(100)), // srcAmount
      expectedRate, // minConversionRate
      { from: userWallet }
    );
    tx(result, "OMG <-> ETH swapTokenToEther()");

    // Approve the KyberNetwork contract to spend user's tokens
    ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
      ETH_ADDRESS, // srcToken
      OmiseGoToken.address, // destToken
      web3.utils.toWei(new BN(1)) // srcQty
    ));
    console.log("Received expected rate : ", web3.utils.fromWei(expectedRate));

    const result2 = await NetworkProxyInstance.swapEtherToToken(
      OmiseGoToken.address, // destToken
      expectedRate, // minConversionRate
      { from: userWallet, value: web3.utils.toWei(new BN(1)) }
    );
    tx(result2, "ETH <-> OMG swapEtherToToken()");

    const userDaiBalanceFinal = web3.utils.fromWei(await OMISEGOInstance.balanceOf(userWallet));
    console.log("User OMG balance: ", userDaiBalanceFinal, " OMG");

    stdlog("- END -");
    callback();
  } catch (error) {
    callback(error);
  }
};
