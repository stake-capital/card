import "./App.css";
import { Paper, withStyles, Grid } from "@material-ui/core";
import * as eth from "ethers";
import interval from "interval-promise";
import React from "react";
import { BrowserRouter as Router, Route, Redirect } from "react-router-dom";
import * as Connext from "connext";

// Pages
import Home from "./components/Home";
import DepositCard from "./components/depositCard";
import AppBarComponent from "./components/AppBar";
import SettingsCard from "./components/settingsCard";
import ReceiveCard from "./components/receiveCard";
import SendCard from "./components/sendCard";
import CashOutCard from "./components/cashOutCard";
import SupportCard from "./components/supportCard";
import RedeemCard from "./components/redeemCard";
import SetupCard from "./components/setupCard";
import Money2020Confirmation from "./components/Money2020Confirmation";
import Confirmations from "./components/Confirmations";
import MySnackbar from "./components/snackBar";

const humanTokenAbi = require("./abi/humanToken.json");

const { Big, minBN } = Connext.big;
const { CurrencyType, CurrencyConvertable } = Connext.types;
const { getExchangeRates, hasPendingOps } = new Connext.Utils();

let publicUrl;

const env = process.env.NODE_ENV;
const tokenAbi = humanTokenAbi;

// Optional URL overrides for custom hubs
const overrides = {
  localHub: process.env.REACT_APP_LOCAL_HUB_OVERRIDE,
  localEth: process.env.REACT_APP_LOCAL_ETH_OVERRIDE,
  rinkebyHub: process.env.REACT_APP_RINKEBY_HUB_OVERRIDE,
  rinkebyEth: process.env.REACT_APP_RINKEBY_ETH_OVERRIDE,
  mainnetHub: process.env.REACT_APP_MAINNET_HUB_OVERRIDE,
  mainnetEth: process.env.REACT_APP_MAINNET_ETH_OVERRIDE
};

// Constants for channel max/min - this is also enforced on the hub
const DEPOSIT_ESTIMATED_GAS = Big("700000"); // 700k gas
const HUB_EXCHANGE_CEILING = eth.constants.WeiPerEther.mul(Big(69)); // 69 TST
const CHANNEL_DEPOSIT_MAX = eth.constants.WeiPerEther.mul(Big(30)); // 30 TST
const MAX_GAS_PRICE = Big("20000000000"); // 20 gWei

const styles = theme => ({
  paper: {
    width: "100%",
    padding: `0px ${theme.spacing.unit}px 0 ${theme.spacing.unit}px`,
    [theme.breakpoints.up("sm")]: {
      width: "450px",
      height: "650px",
      marginTop: "5%",
      borderRadius: "4px"
    },
    [theme.breakpoints.down(600)]: {
      "box-shadow": "0px 0px"
    }
  },
  app: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
    fontFamily: ["proxima-nova", "sans-serif"],
    backgroundColor: "#FFF",
    width: "100%",
    margin: "0px"
  },
  zIndex: 1000,
  grid: {}
});

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loadingConnext: true,
      hubUrl: null,
      tokenAddress: null,
      contractAddress: null,
      hubWalletAddress: null,
      ethprovider: null,
      tokenContract: null,
      connext: null,
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
        txHash: "",
        type: "",
        reset: false
      },
      browserMinimumBalance: null
    };

    this.networkHandler = this.networkHandler.bind(this);
  }

  // ************************************************* //
  //                     Hooks                         //
  // ************************************************* //

  async componentDidMount() {
    // on mount, check if you need to refund by removing maxBalance
    localStorage.removeItem("refunding");

    // set public url
    publicUrl = window.location.origin.toLowerCase();

    // Get mnemonic and rpc type
    let mnemonic = localStorage.getItem("mnemonic");
    let rpc = localStorage.getItem("rpc-prod");

    // If no rpc, get from env and save to local storage
    if (!rpc) {
      rpc = env === "development" ? "LOCALHOST" : "MAINNET";
      localStorage.setItem("rpc-prod", rpc);
    }
    // If no mnemonic, create one and save to local storage
    if (!mnemonic) {
      mnemonic = eth.Wallet.createRandom().mnemonic;
      localStorage.setItem("mnemonic", mnemonic);
    }

    await this.setConnext(rpc, mnemonic);
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
    window.location.reload();
    return;
  }

  async setConnext(rpc, mnemonic) {
    let hubUrl;
    let ethprovider;
    switch (rpc) {
      case "LOCALHOST":
        hubUrl = overrides.localHub || `${publicUrl}/api/local/hub`;
        ethprovider = new eth.providers.JsonRpcProvider("http://localhost:8545");
        break;
      case "RINKEBY":
        hubUrl = overrides.rinkebyHub || `${publicUrl}/api/rinkeby/hub`;
        ethprovider = new eth.getDefaultProvider("rinkeby");
        break;
      case "MAINNET":
        hubUrl = overrides.mainnetHub || `${publicUrl}/api/mainnet/hub`;
        ethprovider = new eth.getDefaultProvider();
        break;
      default:
        throw new Error(`Unrecognized rpc: ${rpc}`);
    }

    const opts = {
      hubUrl,
      mnemonic
    };
    const connext = await Connext.getConnextClient(opts);
    const address = await connext.wallet.getAddress();
    console.log(`Successfully set up connext! Connext config:`);
    console.log(`  - tokenAddress: ${connext.opts.tokenAddress}`);
    console.log(`  - hubAddress: ${connext.opts.hubAddress}`);
    console.log(`  - contractAddress: ${connext.opts.contractAddress}`);
    console.log(`  - ethNetworkId: ${connext.opts.ethNetworkId}`);
    console.log(`  - public address: ${address}`);

    this.setState({
      connext,
      tokenAddress: connext.opts.tokenAddress,
      channelManagerAddress: connext.opts.contractAddress,
      hubWalletAddress: connext.opts.hubAddress,
      ethNetworkId: connext.opts.ethNetworkId,
      address,
      ethprovider
    });
  }

  async setTokenContract() {
    try {
      let { tokenAddress, ethprovider } = this.state;
      const tokenContract = new eth.Contract(tokenAddress, tokenAbi, ethprovider);
      this.setState({ tokenContract });
    } catch (e) {
      console.log("Error setting token contract");
      console.log(e);
    }
  }

  // ************************************************* //
  //                    Pollers                        //
  // ************************************************* //

  async pollConnextState() {
    let connext = this.state.connext;
    // register connext listeners
    connext.on("onStateChange", state => {
      this.setState({
        channelState: state.persistent.channel,
        connextState: state,
        runtime: state.runtime,
        exchangeRate: state.runtime.exchangeRate ? state.runtime.exchangeRate.rates.USD : 0
      });
      this.checkStatus();
    });
    // start polling
    await connext.start();
    this.setState({ loadingConnext: false });
  }

  async poller() {
    await this.autoDeposit();
    await this.autoSwap();

    interval(async (iteration, stop) => {
      await this.autoDeposit();
    }, 5000);

    interval(async (iteration, stop) => {
      await this.autoSwap();
    }, 1000);
  }

  async setBrowserWalletMinimumBalance() {
    const { connextState, ethprovider } = this.state;
    // let gasEstimateJson = await eth.utils.fetchJson({ url: `https://ethgasstation.info/json/ethgasAPI.json` });
    let providerGasPrice = await ethprovider.getGasPrice();
    // let currentGasPrice = Math.round((gasEstimateJson.average / 10) * 2); // multiply gas price by two to be safe
    // dont let gas price be any higher than the max
    // currentGasPrice = eth.utils.parseUnits(minBN(Big(currentGasPrice.toString()), MAX_GAS_PRICE).toString(), "gwei");
    // unless it really needs to be: average eth gas station price w ethprovider's
    // currentGasPrice = currentGasPrice.add(providerGasPrice).div(eth.constants.Two);
    
    providerGasPrice = MAX_GAS_PRICE; // hardcode for now
    console.log(`Gas Price = ${providerGasPrice}`);

    // default connext multiple is 1.5, leave 2x for safety
    const totalDepositGasWei = DEPOSIT_ESTIMATED_GAS.mul(Big(2)).mul(providerGasPrice);

    // add dai conversion
    const minConvertable = new CurrencyConvertable(CurrencyType.WEI, totalDepositGasWei, () => getExchangeRates(connextState));
    const browserMinimumBalance = {
      wei: minConvertable.toWEI().amount,
      dai: minConvertable.toUSD().amount
    };
    this.setState({ browserMinimumBalance });
    return browserMinimumBalance;
  }

  async autoDeposit() {
    const { address, tokenContract, connextState, tokenAddress, connext, browserMinimumBalance, ethprovider } = this.state;

    if (!connext || !browserMinimumBalance) return;

    const balance = await ethprovider.getBalance(address);

    let tokenBalance = "0";
    try {
      tokenBalance = await tokenContract.balanceOf(address);
    } catch (e) {
      console.warn(
        `Error fetching token balance, are you sure the token address (addr: ${tokenAddress}) is correct for the selected network (id: ${JSON.stringify(
          await ethprovider.getNetwork()
        )}))? Error: ${e.message}`
      );
      return;
    }

    if (balance.gt(eth.constants.Zero) || tokenBalance.gt(eth.constants.Zero)) {
      const minWei = Big(browserMinimumBalance.wei);
      if (balance.lt(minWei)) {
        // don't autodeposit anything under the threshold
        // update the refunding variable before returning
        // We hit this repeatedly after first deposit & we have dust left over
        // No need to clutter logs w the below
        // console.log(`Current balance is ${balance.toString()}, less than minBalance of ${minWei.toString()}`);
        return;
      }
      // only proceed with deposit request if you can deposit
      if (!connextState) {
        return;
      }
      if (
        // something was submitted
        connextState.runtime.deposit.submitted ||
        connextState.runtime.withdrawal.submitted ||
        connextState.runtime.collateral.submitted
      ) {
        console.log(`Deposit or withdrawal transaction in progress, will not auto-deposit`);
        return;
      }

      let channelDeposit = {
        amountWei: balance.sub(minWei),
        amountToken: tokenBalance
      };

      if (channelDeposit.amountWei.eq(eth.constants.Zero) && channelDeposit.amountToken.eq(eth.constants.Zero)) {
        return;
      }

      await this.state.connext.deposit({ 
        amountWei: channelDeposit.amountWei.toString(), 
        amountToken: channelDeposit.amountToken.toString() 
      });
    }
  }

  async autoSwap() {
    const { channelState, connextState } = this.state;
    if (!connextState || hasPendingOps(channelState)) {
      return;
    }
    const weiBalance = Big(channelState.balanceWeiUser);
    const tokenBalance = Big(channelState.balanceTokenUser);
    if (channelState && weiBalance.gt(Big("0")) && tokenBalance.lte(HUB_EXCHANGE_CEILING)) {
      await this.state.connext.exchange(channelState.balanceWeiUser, "wei");
    }
  }

  async checkStatus() {
    const { runtime, status } = this.state;
    let log = () => {};
    let newStatus = {
      reset: status.reset
    };

    if (runtime) {
      log(`Hub Sync results: ${JSON.stringify(runtime.syncResultsFromHub[0], null, 2)}`);
      if (runtime.deposit.submitted) {
        if (!runtime.deposit.detected) {
          newStatus.type = "DEPOSIT_PENDING";
        } else {
          newStatus.type = "DEPOSIT_SUCCESS";
          newStatus.txHash = runtime.deposit.transactionHash;
        }
      }
      if (runtime.withdrawal.submitted) {
        if (!runtime.withdrawal.detected) {
          newStatus.type = "WITHDRAWAL_PENDING";
        } else {
          newStatus.type = "WITHDRAWAL_SUCCESS";
          newStatus.txHash = runtime.withdrawal.transactionHash;
        }
      }
    }

    if (newStatus.type !== status.type) {
      newStatus.reset = true;
      console.log(`New channel status! ${JSON.stringify(newStatus)}`);
    }

    this.setState({ status: newStatus });
  }

  closeConfirmations() {
    const { status } = this.state;
    this.setState({ status: { ...status, reset: false }})
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

  async closeModal() {
    await this.setState({ loadingConnext: false });
  }

  render() {
    const {
      address,
      channelState,
      sendScanArgs,
      exchangeRate,
      connext,
      connextState,
      runtime,
      browserMinimumBalance,
      ethprovider,
      status
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
            <Confirmations status={status} closeConfirmations={this.closeConfirmations.bind(this)} />
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
                  web3={ethprovider}
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
                <RedeemCard {...props} publicUrl={publicUrl} connext={connext} channelState={channelState} connextState={connextState} />
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
                  connext={connext}
                  connextState={connextState}
                  runtime={runtime}
                />
              )}
            />
            <Route
              path="/money2020confirmation"
              render={props => (
                <Money2020Confirmation {...props}
                />
              )}
            />
            <Route path="/support" render={props => <SupportCard {...props} channelState={channelState} />} />
          </Paper>
        </Grid>
      </Router>
    );
  }
}

export default withStyles(styles)(App);
