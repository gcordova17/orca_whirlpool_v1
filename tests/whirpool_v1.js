"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const whirlpools_sdk_1 = require("@orca-so/whirlpools-sdk");
const common_sdk_1 = require("@orca-so/common-sdk");
// Environment variables must be defined before script execution
// ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// ANCHOR_WALLET=wallet.json
// WHIRLPOOL_POSITION=address_of_position
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Create WhirlpoolClient
        const provider = anchor_1.AnchorProvider.env();
        const ctx = whirlpools_sdk_1.WhirlpoolContext.withProvider(provider, whirlpools_sdk_1.ORCA_WHIRLPOOL_PROGRAM_ID);
        const client = (0, whirlpools_sdk_1.buildWhirlpoolClient)(ctx);
        console.log("endpoint:", ctx.connection.rpcEndpoint);
        console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());
        // Retrieve the position address from the WHIRLPOOL_POSITION environment variable
        const position_address = process.env.WHIRLPOOL_POSITION;
        const position_pubkey = new web3_js_1.PublicKey(position_address);
        console.log("position address:", position_pubkey.toBase58());
        // Get the position and the pool to which the position belongs
        const position = yield client.getPosition(position_pubkey);
        const whirlpool = yield client.getPool(position.getData().whirlpool);
        // Set the percentage of liquidity to be withdrawn (30%)
        const liquidity = position.getData().liquidity;
        const delta_liquidity = liquidity.mul(new anchor_1.BN(30)).div(new anchor_1.BN(100));
        console.log("liquidity:", liquidity.toString());
        console.log("delta_liquidity:", delta_liquidity.toString());
        // Set acceptable slippage
        const slippage = common_sdk_1.Percentage.fromFraction(10, 1000); // 1%
        // Obtain withdraw estimation
        const whirlpool_data = whirlpool.getData();
        const token_a = whirlpool.getTokenAInfo();
        const token_b = whirlpool.getTokenBInfo();
        const quote = (0, whirlpools_sdk_1.decreaseLiquidityQuoteByLiquidityWithParams)({
            // Pass the pool state as is
            sqrtPrice: whirlpool_data.sqrtPrice,
            tickCurrentIndex: whirlpool_data.tickCurrentIndex,
            // Pass the price range of the position as is
            tickLowerIndex: position.getData().tickLowerIndex,
            tickUpperIndex: position.getData().tickUpperIndex,
            // Liquidity to be withdrawn
            liquidity: delta_liquidity,
            // Acceptable slippage
            slippageTolerance: slippage,
        });
        // Output the estimation
        console.log("devSAMO min output:", common_sdk_1.DecimalUtil.fromBN(quote.tokenMinA, token_a.decimals).toFixed(token_a.decimals));
        console.log("devUSDC min output:", common_sdk_1.DecimalUtil.fromBN(quote.tokenMinB, token_b.decimals).toFixed(token_b.decimals));
        // Output the liquidity before transaction execution
        console.log("liquidity(before):", position.getData().liquidity.toString());
        // Create a transaction
        const decrease_liquidity_tx = yield position.decreaseLiquidity(quote);
        // // Send the transaction
        // const signature = await decrease_liquidity_tx.buildAndExecute();
        // console.log("signature:", signature);
        // // Wait for the transaction to complete
        // const latest_blockhash = await ctx.connection.getLatestBlockhash();
        // await ctx.connection.confirmTransaction({signature, ...latest_blockhash}, "confirmed");
        // // Output the liquidity after transaction execution
        // console.log("liquidity(after):", (await position.refreshData()).liquidity.toString());
    });
}
main();
