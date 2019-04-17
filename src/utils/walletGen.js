import { store } from "../App";
// import * as ethers from "ethers";
const bip39 = require("bip39");
const hdkey = require("ethereumjs-wallet/hdkey");
const CryptoJS = require("crypto-js");

export function generateMnemonic() {
  const mnemonic = bip39.generateMnemonic();
  return mnemonic;
}

export async function getWalletFromEncryptedMnemonic(encryptedMnemonic, secret) {
  let wallet;
  try {
    let mnemonic;
    if(secret){
      mnemonic = decryptMnemonic(encryptedMnemonic, secret);
    }else{
      // catch for recovering from mnemonic on settings page
      mnemonic = encryptedMnemonic
    }
    const seed = bip39.mnemonicToSeed(mnemonic);
    wallet = await hdkey
      .fromMasterSeed(seed)
      .derivePath("m/44'/60'/0'/0/0")
      .getWallet();

    // set in case this is first call
    const existingAddress = localStorage.getItem("delegateSigner");
    console.log(`existing address: ${existingAddress}`)
    console.log(`new wallet string: ${wallet.getAddressString()}`)
    if(existingAddress && (existingAddress !== wallet.getAddressString())){
        throw "Address mismatch. Password likely wrong."
    }else if((!existingAddress) || (existingAddress === wallet.getAddressString())){
          // update refunding variable on import
        localStorage.removeItem("refunding");
        localStorage.removeItem("maxBalanceAfterRefund");
        localStorage.setItem("delegateSigner", wallet.getAddressString());
        return wallet;
    }   
  } catch (e) {
    console.log(`error in WalletGen`);
    console.log(e);
  }
}

export function decryptMnemonic(encryptedMnemonic, secret) {
  const bytes  = CryptoJS.AES.decrypt(encryptedMnemonic, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function encryptMnemonic(mnemonic, secret) {
  const encryptedMnemonic = CryptoJS.AES.encrypt(mnemonic, secret).toString();
  localStorage.setItem("encryptedMnemonic", encryptedMnemonic)
  return encryptedMnemonic;
}

export function getStore() {
  if (store) {
    return store;
  } else {
    console.log("no store found");
  }
}
