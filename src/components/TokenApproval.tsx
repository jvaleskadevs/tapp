"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, erc20Abi } from "viem";
import { 
  ClipboardPaste, 
  Check, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Shield,
  Sparkles
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { TokenImage } from "./TokenImage";
import { COMMON_TOKENS, MAX_APPROVAL_AMOUNT, BASE_CHAIN_ID } from "@/lib/constants";
import { isValidEthereumAddress, truncateAddress } from "@/lib/utils";

type TransactionStatus = "idle" | "pending" | "success" | "error";

export function TokenApproval() {
  const { address, isConnected, chainId } = useAccount();
  const [tokenAddress, setTokenAddress] = useState("");
  const [spenderAddress, setSpenderAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

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
    hash: txHash as `0x${string}`, //`
    query: {
      enabled: !!txHash
    },
  });
  
  // Handle transaction status changes
  useEffect(() => {
    if (receipt) {
      setStatus("success");
    }
  }, [receipt]);

  // Handle errors with a separate effect
  useEffect(() => {
    if (txHash && !isConfirming && !receipt) {
      // Transaction failed or reverted
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

  const handleApprove = async () => {
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

    if (!isValidEthereumAddress(spenderAddress)) {
      setErrorMessage("Please enter a valid spender address");
      setStatus("error");
      return;
    }

    setStatus("idle");
    setErrorMessage("");
    setTxHash(null);

    try {
      const approvalAmount = amount && amount !== "" 
        ? parseUnits(amount, 18) 
        : MAX_APPROVAL_AMOUNT;

      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, approvalAmount],
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
  };

  const isLoading = isWritePending || isConfirming;

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
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" />
        
        <CardHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">Token Approval</CardTitle>
              <CardDescription>Approve tokens for spending or recovery</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 relative">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-white/60 mb-4">Connect your wallet to approve tokens</p>
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

              {/* Spender Address Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  Spender Address
                  {spenderAddress && isValidEthereumAddress(spenderAddress) && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid
                    </span>
                  )}
                </label>
                <div className="relative group">
                  <Input
                    placeholder="0x..."
                    value={spenderAddress}
                    onChange={(e) => setSpenderAddress(e.target.value)}
                    className="pr-12 font-mono text-sm"
                  />
                  <button
                    onClick={() => handlePaste(setSpenderAddress)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-white/40">
                  The address that will be allowed to spend your tokens
                </p>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">
                  Amount (optional)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited approval"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-24"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAmount("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                  >
                    Unlimited
                  </Button>
                </div>
                <p className="text-xs text-white/40">
                  Leave empty to approve maximum amount (unlimited)
                </p>
              </div>

              {/* Status Messages */}
              {status === "success" && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-300">
                        Approval Successful!
                      </p>
                      <p className="text-xs text-green-400/80 mt-1">
                        Tokens have been approved for spending
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
                    Approve Another Token
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={isLoading || !tokenAddress || !spenderAddress}
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
                          <Shield className="w-4 h-4 mr-2" />
                          Approve Tokens
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

      {/* Security Notice */}
      <div className="mt-6 p-4 rounded-lg glass border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-white/70">
            <p className="font-medium text-white/90 mb-1">Security Notice</p>
            <p>
              Only approve tokens to trusted addresses. Unlimited approvals carry risks. 
              Always verify the spender address before approving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
