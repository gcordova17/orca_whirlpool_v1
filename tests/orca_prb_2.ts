import { readFile, writeFile } from "mz/fs";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
//import { DecimalUtil } from "@orca-so/common-sdk";
import { getOrca, OrcaFarmConfig, OrcaPoolConfig } from "@orca-so/sdk";
import Decimal from "decimal.js";
import * as readline from "readline";
import * as fs from "fs";
import BN from "bn.js";
import TelegramBot from "node-telegram-bot-api";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";



function sleep(ms) {  
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 




const main = async () => {

  // config telegram bot
  const telegramPath ="/home/gcordova/dev_env/test_solana/orca_prb_1/app/telegram/telegram_key.json";
  let telegram_key_data = await readFile(telegramPath, {encoding: "utf8",});
  const telegram_key = JSON.parse(telegram_key_data);
  const token = telegram_key.Token
  console.log(token);
  const bot = new TelegramBot(token, {polling: true});
  const chatId = telegram_key.Chat_Id;
  
  /*** Setup ***/
  // 1. Read secret key file to get owner keypair
  let balanceInToken;
  let usdcAmount;
  let solAmount;
  let strikePrice;

  //Latest position in tx file
  const filePath ="/home/gcordova/dev_env/test_solana/orca_prb_1/app/tx_history/tx.json";
  const txFile = await readFile(filePath, {encoding: "utf8",});
  const txData = JSON.parse(txFile);
  const txObject = txData[txData.length - 1];
  bot.sendMessage(chatId, `"${JSON.stringify(txObject)}"`).then(() => {console.log('Message sent');}).catch((error) => {console.error(error);});
 
  strikePrice= new Decimal(txObject.data.strikePrice); // Strike price in USD
  
  let tokenType = txObject.data.type;
  console.log(tokenType);

  // Check if balance is in token or in USD
  if (tokenType === "USDC to SOL") {
    balanceInToken = true;
    usdcAmount = new Decimal(0);
    solAmount = new Decimal(txObject.data.solAmount);
  }else{
    balanceInToken = false;
    usdcAmount = new Decimal(txObject.data.usdcAmount);
    solAmount = new Decimal(0);
  }

  console.log (`USDC : ${usdcAmount} | SOL : ${solAmount} | Strike Price : ${strikePrice}`)
  
  // Read wallet secret key file
  const secretKeyString = await readFile("/home/gcordova/dev_env/test_solana/orca_prb_1/app/account/ACC_1.json", {encoding: "utf8",});
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const owner = Keypair.fromSecretKey(secretKey);
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
  const connection = new Connection("https://api.mainnet-beta.solana.com", "singleGossip");
  const orca = getOrca(connection);
  const Pool = orca.getPool(OrcaPoolConfig.SOL_USDC);
  const solToken = Pool.getTokenA();
  const usdcToken = Pool.getTokenB();
  
  const swapTxId  = 1

  const token_defs = {
    "9hT8EyVsEuKLEoezQR522kcDbQcrxZpnvieaVf5dG7H": {name: "USDT", decimals: 6},
    "2oB6dDy6Eq9bsCx8LTvVSQBbpu8zJT1i1nAkE1KFrs9u": {name: "USDC", decimals: 6},
  };

  // initialize other variables
  let condition = true;
  let counter = 0;
  const spread = 0.025; // 2% spread to increase strike price
  
  // Setup keypress listener
  process.stdin.removeAllListeners('keypress');
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  do{

    try {
      // 3. Get the current price of SOL/USDC
      
      let solQuote;
      let usdcQuote;
      await sleep(1000);
      if (usdcAmount.eq(0)) {
        solQuote = await Pool.getQuote(usdcToken, new Decimal(1));
      } else {
        solQuote = await Pool.getQuote(usdcToken, usdcAmount);
      }
      await sleep(1000);
      if (solAmount.eq(0)) {
        usdcQuote = await Pool.getQuote(solToken, new Decimal(1));
      }else{
        usdcQuote = await Pool.getQuote(solToken, solAmount);
      }

      let solQuoteAmount = new Decimal(solQuote.getMinOutputAmount().toNumber());
      let usdcQuoteAmount = new Decimal(usdcQuote.getMinOutputAmount().toNumber());

      let solQuotePrice = new Decimal(1).dividedBy(solQuote.getRate().toNumber());
      let usdcQuotePrice = new Decimal(usdcQuote.getRate().toNumber());
      //console.log(`SOL/USDC: ${solQuotePrice} | USDC/SOL: ${usdcQuotePrice}`);

     
     
    
      counter = counter + 1;
      if(balanceInToken === false) {

        // let newStrikePrice = new Decimal(solQuotePrice.add(usdcQuotePrice).dividedBy(2));
        // if(newStrikePrice.mul(new Decimal(1).add(spread)).lessThan(strikePrice)){
        //      strikePrice = newStrikePrice;
        //      bot.sendMessage(chatId, `*** New Strike Price Down ***\n-> ${new Decimal(strikePrice).toFixed(3)} | Spread @ ${new Decimal(spread).mul(100).toFixed(1)}%`).then(() => {console.log('Message sent');}).catch((error) => {console.error(error);});
        
        //  }

        console.log(`${counter}) Quote: ${usdcAmount} USDC -> ${solQuoteAmount} SOL @ SOL_Quote: ${solQuotePrice.toFixed(3)} | USDC_Quote: ${usdcQuotePrice.toFixed(3)} | Strike Price: ${strikePrice.toFixed(3)}`);
        
        

        if (strikePrice.lt(solQuotePrice)&&(strikePrice.lt(usdcQuotePrice))) {
            
          // Obatain initial balance
          let solAccBalanceIni = new Decimal(await connection.getBalance(owner.publicKey));

          const swapPayload = await Pool.swap(owner, usdcToken, usdcAmount, solQuoteAmount);
          const swapTxId = await swapPayload.execute();

          // Obtain final balance
          let solAccBalanceEnd = new Decimal(await connection.getBalance(owner.publicKey));

          solAmount = (solAccBalanceEnd.minus(solAccBalanceIni)).dividedBy(10**9); // Convert lamports to SOL
          console.log (`-> SWAP ${usdcAmount} USDC to ${solAmount} SOL \n TX Id: ${swapTxId}`);

          
          console.log(`Strike Price: ${strikePrice}`);
          const newLine = {
            "timestamp" : Date.now(),
            "data" : {
              "type": "USDC to SOL",
              "tx" : swapTxId,
              "solAmount": solAmount,
              "usdcAmount" : usdcAmount,
              "price" : solQuotePrice,
              "strikePrice": strikePrice
            }
          };
          txData.push(newLine);
          const updatedJson = JSON.stringify(txData, null, 2);
          writeFile(filePath, updatedJson, 'utf8', (writeErr) => {
            if (writeErr) {
              console.error("Error writing file:", writeErr);
            } else {
              console.log("File updated successfully.");
            }
          });

          bot.sendMessage(chatId, `"${JSON.stringify(newLine)}"`).then(() => {console.log('Message sent');}).catch((error) => {console.error(error);});

          usdcAmount = new Decimal(0); 
          balanceInToken = true;
          
        } 
      } else {
        
        
        let newStrikePrice = new Decimal(solQuotePrice.add(usdcQuotePrice).div(2));
        if(newStrikePrice.mul(new Decimal(1).minus(spread)).greaterThan(strikePrice)){
          strikePrice = newStrikePrice;
          bot.sendMessage(chatId, `*** New Strike Price Up ***\n-> ${new Decimal(strikePrice).toFixed(3)} | Spread @ ${new Decimal(spread).mul(100).toFixed(1)}%`).then(() => {console.log('Message sent');}).catch((error) => {console.error(error);});

        }

        console.log(`${counter}) Quote: ${solAmount} SOL -> ${usdcQuoteAmount} USDC @ SOL_Quote: ${solQuotePrice.toFixed(3)} | USDC_Quote: ${usdcQuotePrice.toFixed(3)} | Strike Price: ${strikePrice.toFixed(3)}`);

        if (strikePrice.gt(usdcQuotePrice)&&(strikePrice.gt(solQuotePrice))) {

            // Obatain initial balance usdc
          const usdc_MintAddress = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
     
          let usdc_Account = await connection.getParsedTokenAccountsByOwner(owner.publicKey, {mint: usdc_MintAddress});
          let usdc_Mint = usdc_Account.value[0].account.data.parsed.info.tokenAmount;
          const usdc_AccBalanceIni = new Decimal(usdc_Mint.uiAmount);
          //const token_def = token_defs[usdc_Account.value[0].pubkey.toBase58()];
          //console.log(`${token_def.name} balance -> ${usdc_Mint.uiAmount}`);
            
          const swapPayload = await Pool.swap(owner, solToken, solAmount, usdcQuoteAmount);
          const swapTxId = await swapPayload.execute();

            // Obtain final balance
          usdc_Account = await connection.getParsedTokenAccountsByOwner(owner.publicKey, {mint: usdc_MintAddress});
          usdc_Mint = usdc_Account.value[0].account.data.parsed.info.tokenAmount;
          const usdc_AccBalanceEnd = new Decimal(usdc_Mint.uiAmount);

          //usdcAmount = new Decimal(usdcQuoteAmount);
          usdcAmount = usdc_AccBalanceEnd.minus(usdc_AccBalanceIni);
          console.log (`-> SWAP ${solAmount} SOL to ${usdcAmount} USDC \n TX Id: ${swapTxId}`);
   
          //strikePrice = new Decimal(solQuotePrice.add(usdcQuotePrice).dividedBy(2));
          const newLine = {
            "timestamp" : Date.now(),
            "data" : {
              "type": "SOL to USDC",
              "tx" : swapTxId,
              "solAmount": solAmount,
              "usdcAmount" : usdcAmount,
              "price" : solQuotePrice,
              "strikePrice": strikePrice
            }
          };
          txData.push(newLine);
          const updatedJson = JSON.stringify(txData, null, 2);
          writeFile(filePath, updatedJson, 'utf8', (writeErr) => {
            if (writeErr) {
              console.error("Error writing file:", writeErr);
            } else {
              console.log("File updated successfully.");
            }
          });
          
          bot.sendMessage(chatId, `"${JSON.stringify(newLine)}"`).then(() => {console.log('Message sent');}).catch((error) => {console.error(error);});
         
          solAmount = new Decimal(0);
          balanceInToken = false;
         
       
       }
      }

 

    } catch (err) {
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

  }while(condition);
};

main()
  .then(() => {
    console.log("Done");
  })
  .catch((e) => {
    console.error(e);
  });