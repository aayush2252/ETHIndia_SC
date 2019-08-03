/* global artifacts, web3 */
/* eslint-disable no-unused-vars, no-eval, no-underscore-dangle */
const BN = require('bn.js');
const fs = require('fs');

const LiquidityConversionRates = artifacts.require('./LiquidityConversionRatesST.sol');
const AutomatedReserve = artifacts.require('./KyberSTReserve.sol');

const ST = artifacts.require('./mockTokens/securityToken.sol');

const tokenConfig = JSON.parse(fs.readFileSync('../config/tokens.json', 'utf8'));

function tx(result, call) {
  const logs = (result.logs.length > 0) ? result.logs[0] : { address: null, event: null };

  console.log();
  console.log(`   Calling ${call}`);
  console.log('   ------------------------');
  console.log(`   > transaction hash: ${result.tx}`);
  console.log(`   > contract address: ${logs.address}`);
  console.log(`   > gas used: ${result.receipt.gasUsed}`);
  console.log(`   > event: ${logs.event}`);
  console.log();

  return result.receipt.blockNumber;
}

module.exports = async (deployer, network, accounts) => {
  const admin = accounts[0];

  // Set the instances
  const LiquidityConversionRatesInstance = await LiquidityConversionRates.at(
    LiquidityConversionRates.address,
  );
  const AutomatedReserveInstance = await AutomatedReserve.at(AutomatedReserve.address);
  const MANAInstance = await ST.at(ST.address);

  // Set the automated reserve address
  tx(await LiquidityConversionRatesInstance.setReserveAddress(AutomatedReserve.address), 'setReserveAddress()');

  // Transfer the required ETH/Token inventory to the automated reserve
  const STAmount = (
    new BN(tokenConfig.AutomatedPriceReserve.ST.Tokens)
      .mul(new BN(10).pow(await MANAInstance.decimals()))
  ).toString();
  tx(await MANAInstance.transfer(AutomatedReserve.address, MANAAmount), 'transfer()');
  tx(
    await AutomatedReserveInstance.sendTransaction(
      { from: admin, value: web3.utils.toWei(new BN(tokenConfig.AutomatedPriceReserve.ST.Ether)) },
    ),
    'sendTransaction()',
  );

  // Set the liquidity parameters
  tx(await LiquidityConversionRatesInstance.setLiquidityParams(
    tokenConfig.AutomatedPriceReserve.ST._rInFp,
    tokenConfig.AutomatedPriceReserve.ST._pMinInFp,
    tokenConfig.AutomatedPriceReserve.ST._numFpBits,
    tokenConfig.AutomatedPriceReserve.ST._maxCapBuyInWei,
    tokenConfig.AutomatedPriceReserve.ST._maxCapSellInWei,
    tokenConfig.AutomatedPriceReserve.ST._feeInBps,
    tokenConfig.AutomatedPriceReserve.ST._maxTokenToEthRateInPrecision,
    tokenConfig.AutomatedPriceReserve.ST._minTokenToEthRateInPrecision,
  ),
  'setLiquidityParams()');
};
