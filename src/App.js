import React from "react";
import "./App.css";
import { setWallet } from "./utils/actions.js";
import { createStore } from "redux";
import { BrowserRouter as Router, Route, Redirect } from "react-router-dom";
import Home from "./components/Home";
import DepositCard from "./components/depositCard";
import { getConnextClient } from "connext/dist/Connext.js";
import ProviderOptions from "./utils/ProviderOptions.ts";
import clientProvider from "./utils/web3/clientProvider.ts";
import { getWalletFromEncryptedMnemonic, generateMnemonic, encryptMnemonic, decryptMnemonic } from "./utils/walletGen";
import { Paper, withStyles, Grid } from "@material-ui/core";
import AppBarComponent from "./components/AppBar";
import SettingsCard from "./components/settingsCard";
import ReceiveCard from "./components/receiveCard";
import SendCard from "./components/sendCard";
import CashOutCard from "./components/cashOutCard";
import SupportCard from "./components/supportCard";
import RedeemCard from "./components/redeemCard";
import SetupCard from "./components/setupCard";
import Confirmations from "./components/Confirmations";
import BigNumber from "bignumber.js";
import {CurrencyType} from "connext/dist/state/ConnextState/CurrencyTypes";
import CurrencyConvertable from "connext/dist/lib/currency/CurrencyConvertable";
import getExchangeRates from "connext/dist/lib/getExchangeRates";
import MySnackbar from "./components/snackBar";
import interval from "interval-promise";
import { isNull } from "util";

export const store = createStore(setWallet, null);

let publicUrl;

const Web3 = require("web3");
const eth = require("ethers");
const humanTokenAbi = require("./abi/humanToken.json");

const env = process.env.NODE_ENV;
const tokenAbi = humanTokenAbi;

const overrides = {
  localHub: process.env.REACT_APP_LOCAL_HUB_OVERRIDE,
  localEth: process.env.REACT_APP_LOCAL_ETH_OVERRIDE,
  rinkebyHub: process.env.REACT_APP_RINKEBY_HUB_OVERRIDE,
  rinkebyEth: process.env.REACT_APP_RINKEBY_ETH_OVERRIDE,
  mainnetHub: process.env.REACT_APP_MAINNET_HUB_OVERRIDE,
  mainnetEth: process.env.REACT_APP_MAINNET_ETH_OVERRIDE
};

const DEPOSIT_ESTIMATED_GAS = new BigNumber("700000") // 700k gas
//const DEPOSIT_MINIMUM_WEI = new BigNumber(Web3.utils.toWei("0.020", "ether")); // 30 FIN
const HUB_EXCHANGE_CEILING = new BigNumber(Web3.utils.toWei("69", "ether")); // 69 TST
const CHANNEL_DEPOSIT_MAX = new BigNumber(Web3.utils.toWei("30", "ether")); // 30 TST

const styles = theme => ({
  paper: {
    width: "100%",
    padding: `0px ${theme.spacing.unit}px 0 ${theme.spacing.unit}px`,
    [theme.breakpoints.up('sm')]: {
      width: "450px",
      height: "650px",
      marginTop: "5%",
      borderRadius: "4px"
    },
    [theme.breakpoints.down(600)]: {
      "box-shadow": "0px 0px"
    },
  },
  app: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
    fontFamily: ["proxima-nova", "sans-serif"],
    backgroundColor: "#FFF",
    width: "100%",
    margin: "0px",
  },
  zIndex: 1000,
  grid: {}
});

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loadingConnext: true,
      rpcUrl: null,
      hubUrl: null,
      tokenAddress: null,
      channelManagerAddress: null,
      hubWalletAddress: null,
      web3: null,
      customWeb3: null,
      tokenContract: null,
      connext: null,
      delegateSigner: null,
      modals: {
        settings: false,
        keyGen: false,
        receive: false,
        send: false,
        cashOut: false,
        scan: false,
        deposit: false
      },
      authorized: "false",
      approvalWeiUser: "10000",
      channelState: null,
      exchangeRate: "0.00",
      interval: null,
      connextState: null,
      runtime: null,
      sendScanArgs: {
        amount: null,
        recipient: null
      },
      address: "",
      status: {
        deposit: "",
        withdraw: "",
        payment: "",
        hasRefund: ""
      },
      browserMinimumBalance: null,
      setupType: null,
    };

    this.networkHandler = this.networkHandler.bind(this);
  }

  // ************************************************* //
  //                     Hooks                         //
  // ************************************************* //

  async componentWillMount() {
    // set public url
    publicUrl = window.location.origin.toLowerCase();

    // Set up state
    const encryptedMnemonic = localStorage.getItem("encryptedMnemonic");
    // on mount, check if you need to refund by removing maxBalance
    localStorage.removeItem("refunding");
    // If mnemonic already exists

    if (encryptedMnemonic) {
      // set pin prompt state true
      this.setState({setupType: "inputPin"})
    } else if (!encryptedMnemonic && localStorage.getItem("mnemonic")) {
      this.setState({setupType: "createPin"})
    } else {
      this.setState({setupType: "onboard"})
    }
  }

  // ************************************************* //
  //                     Wallet Gen                    //
  // ************************************************* //

  async walletGen(pin) {
    const mnemonic = localStorage.getItem("mnemonic");
    console.log(mnemonic)
    const encryptedMnemonic = encryptMnemonic(mnemonic, pin)
    console.log(encryptedMnemonic)
    const delegateSigner = await getWalletFromEncryptedMnemonic(encryptedMnemonic, pin);
    const address = await delegateSigner.getAddressString();
    console.log(address)

    // In case these exist, remove them
    localStorage.removeItem("mnemonic")
    localStorage.removeItem("privateKey")

    this.setState({ delegateSigner, address });
    store.dispatch({
      type: "SET_WALLET",
      text: delegateSigner
    });

    await this.setWeb3();
    await this.setConnext();
    await this.setTokenContract();

    await this.pollConnextState();
    await this.setBrowserWalletMinimumBalance();
    await this.poller();
  }

  // ************************************************* //
  //                State setters                      //
  // ************************************************* //

  async networkHandler(rpc) {
    // called from settingsCard when a new RPC URL is connected
    // will refresh the page after
    localStorage.setItem("rpc-prod", rpc);
    // update refunding variable on rpc switch
    localStorage.removeItem("maxBalanceAfterRefund");
    localStorage.removeItem("refunding");
    // await this.setWeb3(rpc);
    // await this.setConnext();
    // await this.setTokenContract();
    window.location.reload();
    return;
  }

  async setWeb3() {
    let rpc = localStorage.getItem("rpc-prod");
    // TODO: better way to set default provider
    // if it doesnt exist in storage
    if (!rpc) {
      rpc = env === "development" ? "LOCALHOST" : "MAINNET";
      localStorage.setItem("rpc-prod", rpc);
    }

    let rpcUrl, hubUrl;
    switch (rpc) {
      case "LOCALHOST":
        rpcUrl = overrides.localEth || `${publicUrl}/api/local/eth`;
        hubUrl = overrides.localHub || `${publicUrl}/api/local/hub`;
        break;
      case "RINKEBY":
        rpcUrl = overrides.rinkebyEth || `${publicUrl}/api/rinkeby/eth`;
        hubUrl = overrides.rinkebyHub || `${publicUrl}/api/rinkeby/hub`;
        break;
      case "MAINNET":
        rpcUrl = overrides.mainnetEth || `${publicUrl}/api/mainnet/eth`;
        hubUrl = overrides.mainnetHub || `${publicUrl}/api/mainnet/hub`;
        break;
      default:
        throw new Error(`Unrecognized rpc: ${rpc}`);
    }

    // Ask permission to view accounts
    let windowId;
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      windowId = await window.web3.eth.net.getId();
    }

    const providerOpts = new ProviderOptions(store, rpcUrl, hubUrl).approving();
    const provider = clientProvider(providerOpts);
    const customWeb3 = new Web3(provider);
    const customId = await customWeb3.eth.net.getId();
    // NOTE: token/contract/hubWallet ddresses are set to state while initializing connext
    this.setState({ customWeb3, hubUrl, rpcUrl });
    if (windowId && windowId !== customId) {
      alert(
        `Your card is set to ${JSON.stringify(
          rpc
        )}. To avoid losing funds, please make sure your metamask and card are using the same network.`
      );
    }
    return;
  }

  async setTokenContract() {
    try {
      let { customWeb3, tokenAddress } = this.state;
      const tokenContract = new customWeb3.eth.Contract(tokenAbi, tokenAddress);
      this.setState({ tokenContract });
    } catch (e) {
      console.log("Error setting token contract");
      console.log(e);
    }
  }

  async setConnext() {
    const { address, customWeb3, hubUrl } = this.state;

    const opts = {
      web3: customWeb3,
      hubUrl, // in dev-mode: http://localhost:8080,
      user: address,
      origin: "localhost" // TODO: what should this be
    };

    // *** Instantiate the connext client ***
    const connext = await getConnextClient(opts);
    console.log(`Successfully set up connext! Connext config:`);
    console.log(`  - tokenAddress: ${connext.opts.tokenAddress}`);
    console.log(`  - hubAddress: ${connext.opts.hubAddress}`);
    console.log(`  - contractAddress: ${connext.opts.contractAddress}`);
    console.log(`  - ethNetworkId: ${connext.opts.ethNetworkId}`);
    this.setState({
      connext,
      tokenAddress: connext.opts.tokenAddress,
      channelManagerAddress: connext.opts.contractAddress,
      hubWalletAddress: connext.opts.hubAddress,
      ethNetworkId: connext.opts.ethNetworkId
    });
  }

  // ************************************************* //
  //                    Pollers                        //
  // ************************************************* //

  async pollConnextState() {
    let connext = this.state.connext;
    // register listeners
    connext.on("onStateChange", state => {
      console.log("Connext state changed:", state);
      this.setState({
        channelState: state.persistent.channel,
        connextState: state,
        runtime: state.runtime,
        exchangeRate: state.runtime.exchangeRate
          ? state.runtime.exchangeRate.rates.USD
          : 0
      });
      this.checkStatus();
    });
    // start polling
    await connext.start();
    this.setState({ loadingConnext: false })
  }

  async poller() {
    await this.autoDeposit();
    await this.autoSwap();

    interval(
      async (iteration, stop) => {
        await this.autoDeposit();
      },
      5000
    )

    interval(
      async (iteration, stop) => {
        await this.autoSwap();
      },
      1000
    )

  }

  async setBrowserWalletMinimumBalance() {
    const { customWeb3, connextState } = this.state
    if (!customWeb3 || !connextState) {
      return
    }
    const defaultGas = new BigNumber(await customWeb3.eth.getGasPrice())
    // default connext multiple is 1.5, leave 2x for safety
    const depositGasPrice = DEPOSIT_ESTIMATED_GAS
      .multipliedBy(new BigNumber(2))
      .multipliedBy(defaultGas)
    // add dai conversion
    const minConvertable = new CurrencyConvertable(
      CurrencyType.WEI, 
      depositGasPrice, 
      () => getExchangeRates(connextState)
    )
    const browserMinimumBalance = { 
      wei: minConvertable.toWEI().amount, 
      dai: minConvertable.toUSD().amount 
    }
    this.setState({ browserMinimumBalance })
    return browserMinimumBalance
  }

  async autoDeposit() {
    const {
      address,
      tokenContract,
      connextState,
      tokenAddress,
      exchangeRate,
      channelState,
      rpcUrl,
      browserMinimumBalance,
    } = this.state;
    if (!rpcUrl) {
      return;
    }

    if (!browserMinimumBalance) {
      return
    }

    const web3 = new Web3(rpcUrl);
    const balance = await web3.eth.getBalance(address);

    const refunding = localStorage.getItem("refunding");
    if (refunding) {
      return;
    }

    const maxBalanceAfterRefund = localStorage.getItem("maxBalanceAfterRefund");
    if (
      maxBalanceAfterRefund &&
      new BigNumber(balance).gte(new BigNumber(maxBalanceAfterRefund))
    ) {
      // wallet balance hasnt changed since submitting tx, returning
      return;
    } else {
      // tx has been submitted, delete the maxWalletBalance from storage
      localStorage.removeItem("refunding");
      localStorage.removeItem("maxBalanceAfterRefund");
    }

    let tokenBalance = "0";
    try {
      tokenBalance = await tokenContract.methods.balanceOf(address).call();
    } catch (e) {
      console.warn(
        `Error fetching token balance, are you sure the token address (addr: ${tokenAddress}) is correct for the selected network (id: ${await web3.eth.net.getId()}))? Error: ${
          e.message
        }`
      );
    }

    if (balance !== "0" || tokenBalance !== "0") {
      const minWei = new BigNumber(browserMinimumBalance.wei)
      if (new BigNumber(balance).lt(minWei)) {
        // don't autodeposit anything under the threshold
        // update the refunding variable before returning
        return;
      }
      // only proceed with deposit request if you can deposit
      if (
        !connextState ||
        !connextState.runtime.canDeposit ||
        exchangeRate === "0.00"
      ) {
        return;
      }

      // if you already have the maximum balance tokens hub will exchange
      // do not deposit any more eth to be swapped
      // TODO: figure out rounding error
      if (
        eth.utils
          .bigNumberify(channelState.balanceTokenUser)
          .gte(eth.utils.parseEther("29.8"))
      ) {
        // refund any wei that is in the browser wallet
        // above the minimum
        const refundWei = BigNumber.max(
          new BigNumber(balance).minus(minWei),
          0
        );
        await this.returnWei(refundWei.toFixed(0));
        return;
      }

      let channelDeposit = {
        amountWei: new BigNumber(balance)
          .minus(minWei)
          .toFixed(0),
        amountToken: tokenBalance
      };

      if (
        channelDeposit.amountWei === "0" &&
        channelDeposit.amountToken === "0"
      ) {
        return;
      }

      // if amount to deposit into channel is over the channel max
      // then return excess deposit to the sending account
      const weiToReturn = this.calculateWeiToRefund(
        channelDeposit.amountWei,
        connextState
      );

      // return wei to sender
      if (weiToReturn !== "0") {
        await this.returnWei(weiToReturn);
        return;
      }
      // update channel deposit
      const weiDeposit = new BigNumber(channelDeposit.amountWei).minus(
        new BigNumber(weiToReturn)
      );
      channelDeposit.amountWei = weiDeposit.toFixed(0);

      await this.state.connext.deposit(channelDeposit);
    }
  }

  async returnWei(wei) {
    const { address, customWeb3 } = this.state;
    localStorage.setItem("refunding", Web3.utils.fromWei(wei, "finney"));

    if (!customWeb3) {
      return;
    }

    // if wei is 0, save gas and return
    if (wei === "0") {
      return;
    }

    // get address of latest sender of most recent transaction
    // first, get the last 10 blocks
    const currentBlock = await customWeb3.eth.getBlockNumber();
    let txs = [];
    const start = currentBlock - 100 < 0 ? 0 : currentBlock - 100;
    for (let i = start; i <= currentBlock; i++) {
      // add any transactions found in the blocks to the txs array
      const block = await customWeb3.eth.getBlock(i, true);
      txs = txs.concat(block.transactions);
    }
    // sort by nonce and take latest senders address and
    // return wei to the senders address
    const filteredTxs = txs.filter(
      t => t.to && t.to.toLowerCase() === address.toLowerCase()
    );
    const mostRecent = filteredTxs.sort((a, b) => b.nonce - a.nonce)[0];
    if (!mostRecent) {
      // Browser wallet overfunded, but couldnt find most recent tx in last 100 blocks
      return;
    }
    localStorage.setItem(
      "refunding",
      Web3.utils.fromWei(wei, "finney") + "," + mostRecent.from
    );
    console.log(`Refunding ${wei} to ${mostRecent.from} from ${address}`);
    const origBalance = new BigNumber(await customWeb3.eth.getBalance(address));
    const newMax = origBalance.minus(new BigNumber(wei));

    try {
      const res = await customWeb3.eth.sendTransaction({
        from: address,
        to: mostRecent.from,
        value: wei
      });
      const tx = await customWeb3.eth.getTransaction(res.transactionHash);
      console.log(`Returned deposit tx: ${JSON.stringify(tx, null, 2)}`)
      // calculate expected balance after transaction and set in local
      // storage. once the tx is submitted, the wallet balance should
      // always be lower than the expected balance, because of added
      // gas costs
      localStorage.setItem("maxBalanceAfterRefund", newMax.toFixed(0));
    } catch (e) {
      console.log("Error with refund transaction:", e.message);
      localStorage.removeItem("maxBalanceAfterRefund");
    }
    localStorage.removeItem("refunding");
    // await this.setWeb3(localStorage.getItem("rpc-prod"));
  }

  // returns a BigNumber
  calculateWeiToRefund(wei, connextState) {
    // channel max tokens is minimum of the ceiling that
    // the hub would exchange, or a set deposit max
    const ceilingWei = new CurrencyConvertable(
      CurrencyType.BEI,
      BigNumber.min(HUB_EXCHANGE_CEILING, CHANNEL_DEPOSIT_MAX),
      () => getExchangeRates(connextState)
    ).toWEI().amountBigNumber

    const weiToRefund = BigNumber.max(
      new BigNumber(wei).minus(ceilingWei),
      new BigNumber(0)
    );

    return weiToRefund.toFixed(0);
  }

  async autoSwap() {
    const { channelState, connextState } = this.state;
    if (!connextState || !connextState.runtime.canExchange) {
      return;
    }
    const weiBalance = new BigNumber(channelState.balanceWeiUser);
    const tokenBalance = new BigNumber(channelState.balanceTokenUser);
    if (
      channelState &&
      weiBalance.gt(new BigNumber("0")) &&
      tokenBalance.lte(HUB_EXCHANGE_CEILING)
    ) {
      await this.state.connext.exchange(channelState.balanceWeiUser, "wei");
    }
  }

  async checkStatus() {
    const { runtime, status } = this.state;
    const refundStr = localStorage.getItem("refunding");
    status.hasRefund = !!refundStr ? refundStr.split(",") : null;
    if (runtime.syncResultsFromHub[0]) {
      console.log(`Hub Sync results: ${JSON.stringify(runtime.syncResultsFromHub[0],null,2)}`)
      switch (runtime.syncResultsFromHub[0].update.reason) {
        case "ProposePendingDeposit":
          if(runtime.syncResultsFromHub[0].update.args.depositTokenUser !== "0" ||
            runtime.syncResultsFromHub[0].update.args.depositWeiUser !== "0" ) {
            this.closeConfirmations()
            status.deposit = "PENDING";
            status.depositHistory = "PENDING";
            console.log(`ProposePendingDeposit! New status: ${JSON.stringify(status)}`)
          } else {
            console.log(`ProposePendingDeposit! Nothing to do`)
          }
          break;
        case "ProposePendingWithdrawal":
          if(runtime.syncResultsFromHub[0].update.args.withdrawalTokenUser !== "0" ||
            runtime.syncResultsFromHub[0].update.args.withdrawalWeiUser !== "0" ) {
            this.closeConfirmations()
            status.withdraw = "PENDING";
            status.withdrawHistory = "PENDING";
            console.log(`ProposePendingWithdrawal! New status: ${JSON.stringify(status)}`)
          } else {
            console.log(`ProposePendingWithdrawal! Nothing to do`)
          }
          break;
        case "ConfirmPending":
          if(this.state.status.depositHistory === "PENDING") {
            this.closeConfirmations("deposit")
            status.deposit = "SUCCESS";
            console.log(`New status: ${JSON.stringify(status)}`)
          } else if(this.state.status.withdrawHistory === "PENDING") {
            this.closeConfirmations("withdraw")
            status.withdraw = "SUCCESS";
            console.log(`ConfirmPending! New status: ${JSON.stringify(status)}`)
          } else {
            console.log(`ConfirmPending! Nothing to do`)
          }
          break;
        default:
          console.log(`Nothing to do for update of type: ${runtime.syncResultsFromHub[0].update.reason}`)
      }
    }
    this.setState({ status });
  }

  // ************************************************* //
  //                    Handlers                       //
  // ************************************************* //

  updateApprovalHandler(evt) {
    this.setState({
      approvalWeiUser: evt.target.value
    });
  }

  async scanURL(path, args) {
    switch (path) {
      case "/send":
        this.setState({
          sendScanArgs: { ...args }
        });
        break;
      case "/redeem":
        this.setState({
          redeemScanArgs: { ...args }
        });
        break;
      default:
        return;
    }
  }

  async closeConfirmations(type) {
    const { status } = this.state
    if(!type) {
      status.deposit = '';
      status.depositHistory = '';
      status.withdraw = '';
      status.withdrawHistory = '';
    }
    // Hack to keep deposit/withdraw context for confirm pending notifications
    if(type === "deposit") {
      status.depositHistory = status.deposit
    }
    if(type === "withdraw") {
      status.withdrawHistory = status.withdraw
    }
    console.log(`New status: ${JSON.stringify(status)}`)
    this.setState({ status });
  }

  async closeModal() {
    await this.setState({ loadingConnext: false });
  };

  render() {
    const {
      address,
      channelState,
      sendScanArgs,
      exchangeRate,
      customWeb3,
      connext,
      connextState,
      runtime,
      browserMinimumBalance
    } = this.state;
    const { classes } = this.props;
    return (
      <Router>
        <Grid className={classes.app}>
          <Paper elevation={1} className={classes.paper}>
            <MySnackbar
              variant="warning"
              openWhen={this.state.loadingConnext}
              onClose={() => this.closeModal()}
              message="Starting Channel Controllers.."
              duration={30000}
            />
            <Confirmations
              status={this.state.status}
              closeConfirmations={this.closeConfirmations.bind(this)}
            />
            <AppBarComponent address={address} />
            <Route
              exact
              path="/"
              render={props =>
                runtime && runtime.channelStatus !== "CS_OPEN" ? (
                  <Redirect to="/support" />
                ) : (
                  <Grid>
                    <Home
                      {...props}
                      address={address}
                      connextState={connextState}
                      channelState={channelState}
                      publicUrl={publicUrl}
                      scanURL={this.scanURL.bind(this)}
                    />

                    <SetupCard
                      {...props}
                      generateMnemonic={generateMnemonic}
                      encryptMnemonic={encryptMnemonic}
                      walletGen={this.walletGen.bind(this)}
                      setupType={this.state.setupType}
                      browserMinimumBalance={browserMinimumBalance}
                      maxTokenDeposit={CHANNEL_DEPOSIT_MAX.toString()}
                      connextState={connextState}
                    />
                  </Grid>
                )
              }
            />
            <Route
              path="/deposit"
              render={props => (
                <DepositCard
                  {...props}
                  address={address}
                  browserMinimumBalance={browserMinimumBalance}
                  exchangeRate={exchangeRate}
                  maxTokenDeposit={CHANNEL_DEPOSIT_MAX.toString()}
                  connextState={connextState}
                />
              )}
            />
            <Route
              path="/settings"
              render={props => (
                <SettingsCard
                  {...props}
                  networkHandler={this.networkHandler}
                  connext={connext}
                  address={address}
                  exchangeRate={exchangeRate}
                  runtime={this.state.runtime}
                />
              )}
            />
            <Route
              path="/receive"
              render={props => (
                <ReceiveCard
                  {...props}
                  address={address}
                  connextState={connextState}
                  maxTokenDeposit={CHANNEL_DEPOSIT_MAX.toString()}
                  channelState={channelState}
                  publicUrl={publicUrl}
                />
              )}
            />
            <Route
              path="/send"
              render={props => (
                <SendCard
                  {...props}
                  web3={customWeb3}
                  connext={connext}
                  address={address}
                  channelState={channelState}
                  publicUrl={publicUrl}
                  scanArgs={sendScanArgs}
                  connextState={connextState}
                />
              )}
            />
            <Route
              path="/redeem"
              render={props => (
                <RedeemCard
                  {...props}
                  publicUrl={publicUrl}
                  connext={connext}
                  channelState={channelState}
                  connextState={connextState}
                />
              )}
            />
            <Route
              path="/cashout"
              render={props => (
                <CashOutCard
                  {...props}
                  address={address}
                  channelState={channelState}
                  publicUrl={publicUrl}
                  exchangeRate={exchangeRate}
                  web3={customWeb3}
                  connext={connext}
                  connextState={connextState}
                  runtime={runtime}
                />
              )}
            />
            <Route
              path="/support"
              render={props => (
                <SupportCard {...props} channelState={channelState} />
              )}
            />
          </Paper>
        </Grid>
      </Router>
    );
  }
}

export default withStyles(styles)(App);
