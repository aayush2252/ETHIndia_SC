/* global artifacts, web3 */
/* eslint-disable no-underscore-dangle, no-unused-vars */
const BN = require("bn.js");
const moment = require("moment");
const increaseTime = require("./increaseTime");

const DaicoToken = artifacts.require("./DaicoToken.sol");

module.exports = async callback => {
  try {
    const accounts = await web3.eth.getAccounts();

    const daicoToken = await DaicoToken.at(DaicoToken.address);
    console.log(await daicoToken.balanceOf(accounts[7]));
    await daicoToken.transfer(accounts[8], 10000000, { from: accounts[9] });
    await daicoToken.transfer(accounts[9], 100000, { from: accounts[10] });
    await daicoToken.transfer(accounts[10], 100000, { from: accounts[10] });
    console.log(await daicoToken.balanceOf(accounts[2]));
    callback();
  } catch (error) {
    console.log(error);
    callback(error);
  }
};
