import { parseUnits } from "viem";

export const BASE_CHAIN_ID = 8453;

export const COMMON_TOKENS = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    image: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
    color: "#627EEA",
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    image: "https://coin-images.coingecko.com/coins/images/2518/large/weth.png?1696503332",
    color: "#627EEA",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    image: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png?1769615602",
    color: "#2775CA",
  },
  JESSE: {
    symbol: "JESSE",
    name: "jesse",
    address: "0x5FdA5C9b1edE7b40d9bF9a1F7A8dC4A5e5d4e4d4",
    decimals: 18,
    image: "https://coin-images.coingecko.com/coins/images/70790/large/jesse.png?1763769339",
    color: "#FF6B6B",
  },
  DEGEN: {
    symbol: "DEGEN",
    name: "Degen",
    address: "0x4ed4E862860beD51a9770B96d8eA7f30ab6Bb88a",
    decimals: 18,
    image: "https://coin-images.coingecko.com/coins/images/34515/large/android-chrome-512x512.png?1706198225",
    color: "#A855F7",
  },
} as const;


export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const MAX_APPROVAL_AMOUNT = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
