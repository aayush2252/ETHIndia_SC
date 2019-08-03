/* global artifacts, web3 */
/* eslint-disable no-underscore-dangle, no-unused-vars */
const BN = require("bn.js");
const moment = require("moment");
const increaseTime = require("./increaseTime");

const SaltToken = artifacts.require("./mockTokens/Salt.sol");
const NetworkProxy = artifacts.require("./KyberNetworkProxy.sol");

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
    const SaltInstance = await SaltToken.at(SaltToken.address);
    const NetworkProxyInstance = await NetworkProxy.at(NetworkProxy.address);

    const userDaiBalance = web3.utils.fromWei(await SaltInstance.balanceOf(userWallet));
    console.log("User Salt balance: ", userDaiBalance, " Salt");

    // Approve the KyberNetwork contract to spend user's tokens
    await SaltInstance.approve(NetworkProxy.address, web3.utils.toWei(new BN(100000)), { from: userWallet });
    ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
      SaltToken.address, // srcToken
      ETH_ADDRESS, // destToken
      web3.utils.toWei(new BN(200)) // srcQty
    ));
    console.log("Received expected rate : ", web3.utils.fromWei(expectedRate));

    const result = await NetworkProxyInstance.swapTokenToEther(
      SaltToken.address, // srcToken
      web3.utils.toWei(new BN(200)), // srcAmount
      expectedRate, // minConversionRate
      { from: userWallet }
    );
    tx(result, "SALT <-> ETH swapTokenToEther()");

    // Approve the KyberNetwork contract to spend user's tokens
    ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
      ETH_ADDRESS, // srcToken
      SaltToken.address, // destToken
      web3.utils.toWei(new BN(1)) // srcQty
    ));
    console.log("Received expected rate : ", web3.utils.fromWei(expectedRate));

    const result2 = await NetworkProxyInstance.swapEtherToToken(
      SaltToken.address, // destToken
      expectedRate, // minConversionRate
      { from: userWallet, value: web3.utils.toWei(new BN(1)) }
    );
    tx(result2, "ETH <-> SALT swapEtherToToken()");

    const userDaiBalanceFinal = web3.utils.fromWei(await SaltInstance.balanceOf(userWallet));
    console.log("User Salt balance: ", userDaiBalanceFinal, " Salt");

    stdlog("- END -");
    callback();
  } catch (error) {
    callback(error);
  }
};
