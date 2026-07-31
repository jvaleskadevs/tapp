"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from "viem";
import { 
  ClipboardPaste, 
  Check, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Gift,
  Sparkles,
  Wallet,
  ArrowRight
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { TokenImage } from "./TokenImage";
import { COMMON_TOKENS, BASE_CHAIN_ID } from "@/lib/constants";
import { isValidEthereumAddress, truncateAddress } from "@/lib/utils";

type TransactionStatus = "idle" | "pending" | "success" | "error";

interface TokenClaimProps {
  handleTab: (tab: "approve" | "claim") => void;
}

// Helper to format large numbers with truncation
function formatTokenAmount(amount: bigint, decimals: number, maxLength: number = 12): string {
  if (amount === BigInt(0)) return "0";
  
  const formatted = formatUnits(amount, decimals);
  
  // Check if it's max uint256 (unlimited approval)
  if (amount >= maxUint256 / BigInt(2)) {
    return "Max";
  }
  
  // Truncate if too long
  if (formatted.length > maxLength) {
    const num = parseFloat(formatted);
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(2) + "B";
    }
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(2) + "M";
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(2) + "K";
    }
    return num.toExponential(4);
  }
  
  // Remove trailing zeros
  return formatted.replace(/\.?0+$/, "");
}

export function TokenClaim({ handleTab }: TokenClaimProps) {
  const { address, isConnected, chainId } = useAccount();
  const [fromAddress, setFromAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Read token decimals
  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: isConnected && isValidEthereumAddress(tokenAddress)
    }
  });

  // Default to 18 if not loaded yet
  const decimals = tokenDecimals ?? 18;

  // Read allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: fromAddress && address 
      ? [fromAddress as `0x${string}`, address as `0x${string}`] 
      : undefined,
    query: {
      enabled: isConnected && 
               isValidEthereumAddress(tokenAddress) && 
               isValidEthereumAddress(fromAddress) && 
               !!address
    }
  });

  // Read token balance of the from address
  const { data: fromBalanceData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: fromAddress ? [fromAddress as `0x${string}`] : undefined,
    query: {
      enabled: isConnected && 
               isValidEthereumAddress(tokenAddress) && 
               isValidEthereumAddress(fromAddress)
    }
  });

  const { writeContract, isPending: isWritePending } = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        setTxHash(hash);
        setStatus("pending");
      },
      onError: (error) => {
        setStatus("error");
        setErrorMessage(error.message || "Transaction failed");
      },
    },
  });

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    query: {
      enabled: !!txHash
    },
  });
  
  useEffect(() => {
    if (receipt) {
      setStatus("success");
      refetchAllowance();
    }
  }, [receipt, refetchAllowance]);

  useEffect(() => {
    if (txHash && !isConfirming && !receipt) {
      setStatus("error");
      setErrorMessage("Transaction failed to confirm");
    }
  }, [txHash, isConfirming, receipt]);

  const handlePaste = async (setter: (value: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      setter(text.trim());
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  };

  const fillTokenAddress = (tokenKey: keyof typeof COMMON_TOKENS) => {
    const token = COMMON_TOKENS[tokenKey];
    setTokenAddress(token.address);
  };

  const handleClaim = async () => {
    if (!isConnected) {
      setErrorMessage("Please connect your wallet first");
      setStatus("error");
      return;
    }

    if (chainId !== BASE_CHAIN_ID) {
      setErrorMessage("Please switch to Base network");
      setStatus("error");
      return;
    }

    if (!isValidEthereumAddress(tokenAddress)) {
      setErrorMessage("Please enter a valid token address");
      setStatus("error");
      return;
    }

    if (!isValidEthereumAddress(fromAddress)) {
      setErrorMessage("Please enter a valid from address");
      setStatus("error");
      return;
    }

    if (!amount || amount === "") {
      setErrorMessage("Please enter an amount to claim");
      setStatus("error");
      return;
    }

    const claimAmount = parseUnits(amount, decimals);
    if (allowanceData && allowanceData < claimAmount) {
      setErrorMessage("Insufficient allowance. The from address hasn't approved enough tokens.");
      setStatus("error");
      return;
    }

    setStatus("idle");
    setErrorMessage("");
    setTxHash(null);

    try {
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "transferFrom",
        args: [
          fromAddress as `0x${string}`, 
          address as `0x${string}`, 
          claimAmount
        ],
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage("Failed to prepare transaction");
    }
  };

  const resetForm = () => {
    setStatus("idle");
    setTxHash(null);
    setErrorMessage("");
    setAmount("");
  };

  const isLoading = isWritePending || isConfirming;

  // Format values using actual decimals
  const formattedAllowance = useMemo(() => 
    formatTokenAmount(allowanceData ?? BigInt(0), decimals),
    [allowanceData, decimals]
  );

  const formattedFromBalance = useMemo(() => 
    formatTokenAmount(fromBalanceData ?? BigInt(0), decimals),
    [fromBalanceData, decimals]
  );

  const isUnlimitedAllowance = allowanceData && allowanceData >= maxUint256 / BigInt(2);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Quick Token Selectors */}
      <div className="mb-6">
        <p className="text-sm text-white/60 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Quick Select Token
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COMMON_TOKENS).map(([key, token]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => fillTokenAddress(key as keyof typeof COMMON_TOKENS)}
              className="glass hover:glass-strong transition-all duration-300 group cursor-pointer"
            >
              <TokenImage 
                src={token.image} 
                alt={token.symbol} 
                size={20}
                className="mr-2 z-30"
              />
              <span className="text-white/90 group-hover:text-white font-medium">{token.symbol}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 pointer-events-none" />
        
        <CardHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">Claim Approved Tokens</CardTitle>
              <CardDescription>Claim tokens that were approved to your address</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 relative">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-white/60 mb-4">Connect your wallet to claim tokens</p>
              <ConnectButton />
            </div>
          ) : (
            <>
              {/* Token Address Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  Token Contract Address
                  {tokenAddress && isValidEthereumAddress(tokenAddress) && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid
                    </span>
                  )}
                </label>
                <div className="relative group">
                  <Input
                    placeholder="0x..."
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="pr-12 font-mono text-sm"
                  />
                  <button
                    onClick={() => handlePaste(setTokenAddress)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* From Address Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  From Address
                  {fromAddress && isValidEthereumAddress(fromAddress) && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid
                    </span>
                  )}
                </label>
                <div className="relative group">
                  <Input
                    placeholder="0x... (the address that approved tokens to you)"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    className="pr-12 font-mono text-sm"
                  />
                  <button
                    onClick={() => handlePaste(setFromAddress)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-white/40">
                  The address that previously approved tokens to your wallet
                </p>
              </div>

              {/* Allowance Info */}
              {isValidEthereumAddress(tokenAddress) && 
               isValidEthereumAddress(fromAddress) && 
               address && (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Approved Allowance:</span>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span 
                        className={`text-sm font-mono truncate max-w-[150px] ${
                          isUnlimitedAllowance ? "text-purple-400 font-bold" : "text-green-400"
                        }`}
                        title={allowanceData ? formatUnits(allowanceData, decimals) : "0"}
                      >
                        {formattedAllowance}
                      </span>
                      {isUnlimitedAllowance && (
                        <span className="text-xs text-purple-400/80 flex-shrink-0">
                          (Unlimited)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">From Address Balance:</span>
                    <span 
                      className="text-sm font-mono text-white/80 truncate max-w-[150px]"
                      title={fromBalanceData ? formatUnits(fromBalanceData, decimals) : "0"}
                    >
                      {formattedFromBalance}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                    <span className="text-xs text-white/40">Token Decimals:</span>
                    <span className="text-xs font-mono text-white/60">{decimals}</span>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  Amount to Claim
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step={`0.${'0'.repeat(Math.max(0, decimals - 1))}1`}
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-24"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isUnlimitedAllowance && fromBalanceData) {
                        // If unlimited, max is the from address balance
                        setAmount(formatUnits(fromBalanceData, decimals));
                      } else if (allowanceData) {
                        setAmount(formatUnits(allowanceData, decimals));
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-white/40">
                  Enter the amount you want to claim (up to the approved allowance)
                </p>
              </div>

              {/* Claim Visualization */}
              {isValidEthereumAddress(fromAddress) && address && (
                <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white/60" />
                    </div>
                    <span className="text-xs text-white/40 mt-1">From</span>
                    <span className="text-xs font-mono text-white/60 truncate max-w-[80px]">
                      {truncateAddress(fromAddress)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center px-2">
                    <ArrowRight className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-400 mt-1 truncate max-w-[100px] text-center">
                      {amount || "0"} tokens
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-xs text-white/40 mt-1">To (You)</span>
                    <span className="text-xs font-mono text-white/60 truncate max-w-[80px]">
                      {truncateAddress(address)}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {status === "success" && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-300">
                        Tokens Claimed Successfully!
                      </p>
                      <p className="text-xs text-green-400/80 mt-1">
                        The tokens have been transferred to your wallet
                      </p>
                      {txHash && (
                        <a
                          href={`https://basescan.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
                        >
                          View on BaseScan <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-300">
                        Transaction Failed
                      </p>
                      <p className="text-xs text-red-400/80 mt-1 break-all">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === "pending" && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-blue-300">
                        Confirming Transaction...
                      </p>
                      <p className="text-xs text-blue-400/80">
                        Please wait for blockchain confirmation
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {status === "success" ? (
                  <Button 
                    onClick={resetForm} 
                    className="flex-1"
                    variant="default"
                  >
                    Claim More Tokens
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleClaim}
                      disabled={isLoading || !tokenAddress || !fromAddress || !amount}
                      className="flex-1"
                      variant="glow"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isWritePending ? "Confirm in Wallet..." : "Confirming..."}
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4 mr-2" />
                          Claim Tokens
                        </>
                      )}
                    </Button>
                    <ConnectButton 
                      showBalance={false}
                      accountStatus="avatar"
                      chainStatus="icon"
                    />
                  </>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => handleTab("approve")}
                  className="text-sm" 
                  variant="ghost"                 
                >
                  ← Back to Token Approval
                </Button>
              </div>

              {/* Wallet Info */}
              <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/10">
                <span>Connected: {truncateAddress(address || "")}</span>
                <span className={chainId === BASE_CHAIN_ID ? "text-green-400" : "text-red-400"}>
                  {chainId === BASE_CHAIN_ID ? "✓ Base Network" : "⚠ Switch to Base"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Info Notice */}
      <div className="mt-6 p-4 rounded-lg glass border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Gift className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-white/70">
            <p className="font-medium text-white/90 mb-1">How It Works</p>
            <p>
              This component uses <code className="text-blue-300">transferFrom</code> to claim tokens 
              that were previously approved to your address. The "from" address must have called 
              <code className="text-blue-300">approve(yourAddress, amount)</code> before you can claim.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
