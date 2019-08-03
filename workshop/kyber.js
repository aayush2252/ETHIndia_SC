let Web3 = require('web3')
const Tx = require("ethereumjs-tx").Transaction;
const BN = require("bignumber.js");
let kyberProxyAbi = require('./kyberProxyAbi.js')

async function main(){
	let from = "0x47a793D7D0AA5727095c3Fe132a6c1A46804c8D2"
let to = "0xd3add19ee7e5287148a5866784aE3C55bd4E375A"

let web3 = new Web3(Web3.providers.HttpProvider('http://127.0.0.1:8545'))

let kyberProxyContract = new web3.eth.Contract(kyberProxyAbi.abi,0xd3add19ee7e5287148a5866784aE3C55bd4E375A)

 let txCount = await web3.eth.getTransactionCount(from);
  //Method 1: Use a constant
  let gasPrice = new BN(5).times(10 ** 9); //5 Gwei
  //Method 2: Use web3 gasPrice
  //let gasPrice = await web3.eth.gasPrice;
  //Method 3: Use KNP Proxy maxGasPrice
  //let gasPrice = await KYBER_NETWORK_PROXY_CONTRACT.maxGasPrice().call();

  let maxGasPrice = await kyberProxyContract.methods
    .maxGasPrice()
    .call();
  //If gasPrice exceeds maxGasPrice, set it to max.
  if (gasPrice >= maxGasPrice) gasPrice = maxGasPrice;
let txData = kyberProxyContract.methods
    .trade(
      0x3750bE154260872270EbA56eEf89E78E6E21C1D9,//srcTokenAddress,
      1000000,
      0x7ADc6456776Ed1e9661B3CEdF028f41BD319Ea52,
      0x8f423720584B0eFF220C8Ff0B62700917089bE22,//dstAddress,
      100000000,
      1000,
      3
    )
    .encodeABI();
  let rawTx = {
    from: from,
    to: to,
    data: txData,
    //value: web3.utils.toHex(value),
    gasLimit: web3.utils.toHex(gasLimit),
    gasPrice: web3.utils.toHex(gasPrice),
    nonce: txCount
  };

  let tx = new Tx(rawTx);

  tx.sign(Buffer.from('979D8B20000DA5832FC99C547393FDFA5EEF980C77BFB1DECB17C59738D99471','hex'));
  const serializedTx = tx.serialize();
  let txReceipt = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
  .catch(error => console.log(error));

  // Log the tx receipt
  console.log(txReceipt);
  return;


}
main()