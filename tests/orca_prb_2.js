"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("mz/fs");
const web3_js_1 = require("@solana/web3.js");
//import { DecimalUtil } from "@orca-so/common-sdk";
const sdk_1 = require("@orca-so/sdk");
const decimal_js_1 = __importDefault(require("decimal.js"));
const readline = __importStar(require("readline"));
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    // config telegram bot
    const telegramPath = "/home/gcordova/dev_env/test_solana/orca_prb_1/app/telegram/telegram_key.json";
    let telegram_key_data = yield (0, fs_1.readFile)(telegramPath, { encoding: "utf8", });
    const telegram_key = JSON.parse(telegram_key_data);
    const token = telegram_key.Token;
    console.log(token);
    const bot = new node_telegram_bot_api_1.default(token, { polling: true });
    const chatId = telegram_key.Chat_Id;
    /*** Setup ***/
    // 1. Read secret key file to get owner keypair
    let balanceInToken;
    let usdcAmount;
    let solAmount;
    let strikePrice;
    //Latest position in tx file
    const filePath = "/home/gcordova/dev_env/test_solana/orca_prb_1/app/tx_history/tx.json";
    const txFile = yield (0, fs_1.readFile)(filePath, { encoding: "utf8", });
    const txData = JSON.parse(txFile);
    const txObject = txData[txData.length - 1];
    bot.sendMessage(chatId, `"${JSON.stringify(txObject)}"`).then(() => { console.log('Message sent'); }).catch((error) => { console.error(error); });
    strikePrice = new decimal_js_1.default(txObject.data.strikePrice); // Strike price in USD
    let tokenType = txObject.data.type;
    console.log(tokenType);
    // Check if balance is in token or in USD
    if (tokenType === "USDC to SOL") {
        balanceInToken = true;
        usdcAmount = new decimal_js_1.default(0);
        solAmount = new decimal_js_1.default(txObject.data.solAmount);
    }
    else {
        balanceInToken = false;
        usdcAmount = new decimal_js_1.default(txObject.data.usdcAmount);
        solAmount = new decimal_js_1.default(0);
    }
    console.log(`USDC : ${usdcAmount} | SOL : ${solAmount} | Strike Price : ${strikePrice}`);
    // Read wallet secret key file
    const secretKeyString = yield (0, fs_1.readFile)("/home/gcordova/dev_env/test_solana/orca_prb_1/app/account/ACC_1.json", { encoding: "utf8", });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const owner = web3_js_1.Keypair.fromSecretKey(secretKey);
    console.log("Owner Public Key ---> ", owner.publicKey);
    // Convert secret key to hex string
    //   const secretKeyArray: number[] = owner.secretKey.toString().split(',').map((item) => parseInt(item));
    //   let hexString: string = '';
    //   for (let i = 0; i < secretKeyArray.length; i++) {
    //     const hex = secretKeyArray[i].toString(16).padStart(2, '0');
    //     hexString += hex;
    // }
    //   console.log("Owner Secret Key ---> ", hexString);
    // Initialzie Orca object with mainnet connection
    const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com", "singleGossip");
    const orca = (0, sdk_1.getOrca)(connection);
    const Pool = orca.getPool(sdk_1.OrcaPoolConfig.SOL_USDC);
    const solToken = Pool.getTokenA();
    const usdcToken = Pool.getTokenB();
    const swapTxId = 1;
    const token_defs = {
        "9hT8EyVsEuKLEoezQR522kcDbQcrxZpnvieaVf5dG7H": { name: "USDT", decimals: 6 },
        "2oB6dDy6Eq9bsCx8LTvVSQBbpu8zJT1i1nAkE1KFrs9u": { name: "USDC", decimals: 6 },
    };
    // initialize other variables
    let condition = true;
    let counter = 0;
    const spread = 0.025; // 2% spread to increase strike price
    // Setup keypress listener
    process.stdin.removeAllListeners('keypress');
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    do {
        try {
            // 3. Get the current price of SOL/USDC
            let solQuote;
            let usdcQuote;
            yield sleep(1000);
            if (usdcAmount.eq(0)) {
                solQuote = yield Pool.getQuote(usdcToken, new decimal_js_1.default(1));
            }
            else {
                solQuote = yield Pool.getQuote(usdcToken, usdcAmount);
            }
            yield sleep(1000);
            if (solAmount.eq(0)) {
                usdcQuote = yield Pool.getQuote(solToken, new decimal_js_1.default(1));
            }
            else {
                usdcQuote = yield Pool.getQuote(solToken, solAmount);
            }
            let solQuoteAmount = new decimal_js_1.default(solQuote.getMinOutputAmount().toNumber());
            let usdcQuoteAmount = new decimal_js_1.default(usdcQuote.getMinOutputAmount().toNumber());
            let solQuotePrice = new decimal_js_1.default(1).dividedBy(solQuote.getRate().toNumber());
            let usdcQuotePrice = new decimal_js_1.default(usdcQuote.getRate().toNumber());
            //console.log(`SOL/USDC: ${solQuotePrice} | USDC/SOL: ${usdcQuotePrice}`);
            counter = counter + 1;
            if (balanceInToken === false) {
                // let newStrikePrice = new Decimal(solQuotePrice.add(usdcQuotePrice).dividedBy(2));
                // if(newStrikePrice.mul(new Decimal(1).add(spread)).lessThan(strikePrice)){
                //      strikePrice = newStrikePrice;
                //      bot.sendMessage(chatId, `*** New Strike Price Down ***\n-> ${new Decimal(strikePrice).toFixed(3)} | Spread @ ${new Decimal(spread).mul(100).toFixed(1)}%`).then(() => {console.log('Message sent');}).catch((error) => {console.error(error);});
                //  }
                console.log(`${counter}) Quote: ${usdcAmount} USDC -> ${solQuoteAmount} SOL @ SOL_Quote: ${solQuotePrice.toFixed(3)} | USDC_Quote: ${usdcQuotePrice.toFixed(3)} | Strike Price: ${strikePrice.toFixed(3)}`);
                if (strikePrice.lt(solQuotePrice) && (strikePrice.lt(usdcQuotePrice))) {
                    // Obatain initial balance
                    let solAccBalanceIni = new decimal_js_1.default(yield connection.getBalance(owner.publicKey));
                    const swapPayload = yield Pool.swap(owner, usdcToken, usdcAmount, solQuoteAmount);
                    const swapTxId = yield swapPayload.execute();
                    // Obtain final balance
                    let solAccBalanceEnd = new decimal_js_1.default(yield connection.getBalance(owner.publicKey));
                    solAmount = (solAccBalanceEnd.minus(solAccBalanceIni)).dividedBy(Math.pow(10, 9)); // Convert lamports to SOL
                    console.log(`-> SWAP ${usdcAmount} USDC to ${solAmount} SOL \n TX Id: ${swapTxId}`);
                    console.log(`Strike Price: ${strikePrice}`);
                    const newLine = {
                        "timestamp": Date.now(),
                        "data": {
                            "type": "USDC to SOL",
                            "tx": swapTxId,
                            "solAmount": solAmount,
                            "usdcAmount": usdcAmount,
                            "price": solQuotePrice,
                            "strikePrice": strikePrice
                        }
                    };
                    txData.push(newLine);
                    const updatedJson = JSON.stringify(txData, null, 2);
                    (0, fs_1.writeFile)(filePath, updatedJson, 'utf8', (writeErr) => {
                        if (writeErr) {
                            console.error("Error writing file:", writeErr);
                        }
                        else {
                            console.log("File updated successfully.");
                        }
                    });
                    bot.sendMessage(chatId, `"${JSON.stringify(newLine)}"`).then(() => { console.log('Message sent'); }).catch((error) => { console.error(error); });
                    usdcAmount = new decimal_js_1.default(0);
                    balanceInToken = true;
                }
            }
            else {
                let newStrikePrice = new decimal_js_1.default(solQuotePrice.add(usdcQuotePrice).div(2));
                if (newStrikePrice.mul(new decimal_js_1.default(1).minus(spread)).greaterThan(strikePrice)) {
                    strikePrice = newStrikePrice;
                    bot.sendMessage(chatId, `*** New Strike Price Up ***\n-> ${new decimal_js_1.default(strikePrice).toFixed(3)} | Spread @ ${new decimal_js_1.default(spread).mul(100).toFixed(1)}%`).then(() => { console.log('Message sent'); }).catch((error) => { console.error(error); });
                }
                console.log(`${counter}) Quote: ${solAmount} SOL -> ${usdcQuoteAmount} USDC @ SOL_Quote: ${solQuotePrice.toFixed(3)} | USDC_Quote: ${usdcQuotePrice.toFixed(3)} | Strike Price: ${strikePrice.toFixed(3)}`);
                if (strikePrice.gt(usdcQuotePrice) && (strikePrice.gt(solQuotePrice))) {
                    // Obatain initial balance usdc
                    const usdc_MintAddress = new web3_js_1.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
                    let usdc_Account = yield connection.getParsedTokenAccountsByOwner(owner.publicKey, { mint: usdc_MintAddress });
                    let usdc_Mint = usdc_Account.value[0].account.data.parsed.info.tokenAmount;
                    const usdc_AccBalanceIni = new decimal_js_1.default(usdc_Mint.uiAmount);
                    //const token_def = token_defs[usdc_Account.value[0].pubkey.toBase58()];
                    //console.log(`${token_def.name} balance -> ${usdc_Mint.uiAmount}`);
                    const swapPayload = yield Pool.swap(owner, solToken, solAmount, usdcQuoteAmount);
                    const swapTxId = yield swapPayload.execute();
                    // Obtain final balance
                    usdc_Account = yield connection.getParsedTokenAccountsByOwner(owner.publicKey, { mint: usdc_MintAddress });
                    usdc_Mint = usdc_Account.value[0].account.data.parsed.info.tokenAmount;
                    const usdc_AccBalanceEnd = new decimal_js_1.default(usdc_Mint.uiAmount);
                    //usdcAmount = new Decimal(usdcQuoteAmount);
                    usdcAmount = usdc_AccBalanceEnd.minus(usdc_AccBalanceIni);
                    console.log(`-> SWAP ${solAmount} SOL to ${usdcAmount} USDC \n TX Id: ${swapTxId}`);
                    //strikePrice = new Decimal(solQuotePrice.add(usdcQuotePrice).dividedBy(2));
                    const newLine = {
                        "timestamp": Date.now(),
                        "data": {
                            "type": "SOL to USDC",
                            "tx": swapTxId,
                            "solAmount": solAmount,
                            "usdcAmount": usdcAmount,
                            "price": solQuotePrice,
                            "strikePrice": strikePrice
                        }
                    };
                    txData.push(newLine);
                    const updatedJson = JSON.stringify(txData, null, 2);
                    (0, fs_1.writeFile)(filePath, updatedJson, 'utf8', (writeErr) => {
                        if (writeErr) {
                            console.error("Error writing file:", writeErr);
                        }
                        else {
                            console.log("File updated successfully.");
                        }
                    });
                    bot.sendMessage(chatId, `"${JSON.stringify(newLine)}"`).then(() => { console.log('Message sent'); }).catch((error) => { console.error(error); });
                    solAmount = new decimal_js_1.default(0);
                    balanceInToken = false;
                }
            }
        }
        catch (err) {
            console.warn(err);
        }
        // Check for keypress
        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                console.log('Proceso Finalizado');
                condition = false;
                process.exit();
            }
        });
    } while (condition);
});
main()
    .then(() => {
    console.log("Done");
})
    .catch((e) => {
    console.error(e);
});
