# dTok Dai Card

<p align="center">
  <img src="https://github.com/stake-capital/dTok-dai-card/blob/master/src/assets/dTok/dtok-logo.jpg" />
</p>


dTok is a decentralized pay-as-you-go live streaming platform 📹. Decentralized transcoding is handled via [Livepeer](https://livepeer.org/) and micro-payments via the [Connext Network](https://connext.network/).

This dTok stream viewing dApp is built on top of Dai Card. Inspired by the SpankCard and Austin Griffith's burner wallet, Dai Card is a simple offchain wallet, hosted in the browser, which utilizes Connext's Indra payment channels.

For additional Dai Card-specific documentation please see the [Dai Card repo](https://github.com/ConnextProject/card).

See it live at: https://dtok.stake.capital

## Contents
- [Development](#development)
    - [Local Development](#local-development)
    - [Testing Locally](#testing-locally)

## Development

Prerequisites
 - Node 9+
 - Docker
 - Make

### Local development

1. **(skip to step #2 below if running Indra on Rinkeby)** Make sure you have indra running locally. Check out the instructions in the [indra repo](https://github.com/ConnextProject/indra).

TL;DR run:

```
git clone https://github.com/ConnextProject/indra.git
cd indra
npm start
```

2. Deploy

From the card's project root (e.g. `git clone https://github.com/ConnextProject/card.git && cd card`), run one of the following:

Using a containerized webpack dev server (recommended):
```
make start
```

Using a local webpack dev server:
```
npm install
npm start
```

The above step will take a while to completely finish because the webpack dev server takes a long time to wake up. Monitor it with:

```
bash ops/logs.sh server
```

3. Check it out

 - If you started with `npm start`, browse to `http://localhost:3000`
 - If you started with `make start`, browse to `http://localhost`

4. **(for Rinkeby development)** If you running with Indra on Rinkeby, ensure that `Rinkeby` is selected from the settings dialog (located in the upper right corner of the application).

### Testing locally

To run the tests during local development, start the test watcher with:

```
npm run start-test
```

This will start an ongoing e2e tester that will re-run any time the tests are changed. Works well with webpack dev server but you'll have to manually re-trigger the tests after changing the card's source code.

You can also run the more heavy-duty e2e tests that will be run as part of CI integration with:

```
npm run test
```
