/* global artifacts, web3 */
/* eslint-disable no-underscore-dangle, no-unused-vars */
const BN = require("bn.js");
const moment = require("moment");
const increaseTime = require("./increaseTime");

const Network = artifacts.require("./KyberNetwork.sol");
const NetworkProxy = artifacts.require("./KyberNetworkProxy.sol");
const PollFactory = artifacts.require("./PollFactory.sol");
const CrowdSale = artifacts.require("./CrowdSale.sol");
const DAI = artifacts.require("./Dai.sol");

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
    const accounts = await web3.eth.getAccounts();
    const userWallet = accounts[4];
    const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    let expectedRate;
    let slippageRate;
    let result;

    // const crowdSale = await CrowdSale.at(CrowdSale.address);

    // await increaseTime(10, web3);

    // await crowdSale.startNewRound();

    // await crowdSale.sendTransaction({
    //   value: await web3.utils.toWei("1", "ether").toString(),
    //   from: accounts[7]
    // });
    // await crowdSale.sendTransaction({
    //   value: await web3.utils.toWei("2", "ether").toString(),
    //   from: accounts[8]
    // });
    // await crowdSale.sendTransaction({
    //   value: await web3.utils.toWei("2", "ether").toString(),
    //   from: accounts[9]
    // });
    // await crowdSale.sendTransaction({
    //   value: await web3.utils.toWei("1", "ether").toString(),
    //   from: accounts[10]
    // });
    // await crowdSale.sendTransaction({
    //   value: await web3.utils.toWei("2", "ether").toString(),
    //   from: accounts[10]
    // });
    // await crowdSale.sendTransaction({
    //   value: await web3.utils.toWei("2", "ether").toString(),
    //   from: accounts[10]
    // });

    // Set the instances
    const NetworkProxyInstance = await NetworkProxy.at(NetworkProxy.address);
    const DAIInstance = await DAI.at(DAI.address);

    stdlog("- START -");
    stdlog(`KyberNetworkProxy (${NetworkProxy.address})`);

    stdlog(`DAI balance of ${userWallet} = ${web3.utils.fromWei(await DAIInstance.balanceOf(userWallet))}`);
    stdlog(`ETH balance of ${userWallet} = ${web3.utils.fromWei(await web3.eth.getBalance(userWallet))}`);

    stdlog(`ETH balance of Treasury = ${web3.utils.fromWei(await web3.eth.getBalance(PollFactory.address))}`);
    stdlog(`DAI balance of Treasury = ${web3.utils.fromWei(await DAIInstance.balanceOf(PollFactory.address))}`);

    // Approve the KyberNetwork contract to spend user's tokens
    // await DAIInstance.approve(NetworkProxy.address, web3.utils.toWei(new BN(1000000)), { from: userWallet });
    // ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
    //   DAI.address, // srcToken
    //   ETH_ADDRESS, // destToken
    //   web3.utils.toWei(new BN(100)) // srcQty
    // ));
    // console.log("got expected rate", expectedRate, slippageRate);

    // result = await NetworkProxyInstance.swapTokenToEther(
    //   DAI.address, // srcToken
    //   web3.utils.toWei(new BN(100)), // srcAmount
    //   expectedRate, // minConversionRate
    //   { from: userWallet }
    // );
    // tx(result, "DAI <-> ETH swapTokenToEther()");

    ({ expectedRate, slippageRate } = await NetworkProxyInstance.getExpectedRate(
      ETH_ADDRESS, // srcToken
      DAI.address, // destToken
      web3.utils.toWei(new BN(2)) // srcQty
    ));
    console.log("got expected rate", web3.utils.fromWei(expectedRate), slippageRate);

    result = await NetworkProxyInstance.swapEtherToToken(
      DAI.address, // destToken
      expectedRate, // minConversionRate
      { from: userWallet, value: web3.utils.toWei(new BN(2)) }
    );

    tx(result, "ETH <-> DAI swapTokenToEther()");
    stdlog(`DAI balance of ${userWallet} = ${web3.utils.fromWei(await DAIInstance.balanceOf(userWallet))}`);
    stdlog(`ETH balance of ${userWallet} = ${web3.utils.fromWei(await web3.eth.getBalance(userWallet))}`);

    stdlog(`ETH balance of Treasury = ${web3.utils.fromWei(await web3.eth.getBalance(PollFactory.address))}`);
    stdlog(`DAI balance of Treasury = ${web3.utils.fromWei(await DAIInstance.balanceOf(PollFactory.address))}`);

    stdlog("- END -");
    callback();
  } catch (error) {
    callback(error);
  }
};
