import React, { useState } from "react";
import { ethers, BrowserProvider } from "ethers";

import "./App.css";

const App = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // USDC contract address on Sepolia
  let usdcContractAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // Replace with verified Sepolia USDC address
  const storeWalletAddress = "0x34992c9A838D6143252eFC13e8efD33bA195E44F"; // Replace with store's wallet address
  const tShirtPrice = 25; // Price in USDC
  const usdcAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ];

  // Validate and fix checksum for the contract address
  try {
    usdcContractAddress = ethers.getAddress(usdcContractAddress);
    console.log("Validated USDC Contract Address:", usdcContractAddress);
  } catch (error) {
    console.error("Invalid USDC Contract Address:", error.message);
    alert("The USDC contract address is invalid. Please verify and try again.");
    return;
  }

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        fetchUsdcBalance(accounts[0], provider);
      } catch (error) {
        console.error("Error connecting wallet:", error);
        alert("Failed to connect wallet. Please try again.");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const fetchUsdcBalance = async (address, provider) => {
    try {
      console.log("Fetching USDC balance for address:", address);
      const contract = new ethers.Contract(
        usdcContractAddress,
        usdcAbi,
        provider
      );

      // Fetch raw balance (in smallest unit, e.g., 6 decimals for USDC)
      const rawBalance = await contract.balanceOf(address);
      console.log("Raw USDC balance:", rawBalance.toString());

      // Format the balance from smallest unit to human-readable format
      const formattedBalance = ethers.formatUnits(rawBalance, 6); // USDC uses 6 decimals
      console.log("Formatted USDC balance:", formattedBalance);

      setUsdcBalance(formattedBalance); // Set the balance in the state
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
    }
  };

  const makePayment = async () => {
    if (parseFloat(usdcBalance) < tShirtPrice) {
      alert("Insufficient USDC balance!");
      return;
    }

    setLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        usdcContractAddress,
        usdcAbi,
        signer
      );
      const amountInWei = ethers.parseUnits(tShirtPrice.toString(), 6);

      // Approve the store wallet to withdraw USDC
      const approvalTx = await contract.approve(
        storeWalletAddress,
        amountInWei
      );
      await approvalTx.wait();

      // Transfer USDC to the store wallet
      const transferTx = await contract.transfer(
        storeWalletAddress,
        amountInWei
      );
      await transferTx.wait();

      setTransactionDetails({
        itemName: "T-Shirt",
        purchaseAmount: `${tShirtPrice} USDC`,
        transactionHash: transferTx.hash,
        date: new Date().toLocaleString(),
      });
      alert("Payment successful!");
    } catch (error) {
      console.error("Error making payment:", error);

      // Handle user rejection explicitly
      if (error.code === 4001) {
        alert(
          "Transaction rejected by the user. Please try again if you wish to proceed."
        );
      } else if (error.message.includes("insufficient funds")) {
        alert("Insufficient funds for the transaction.");
      } else {
        alert("Payment failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>USDC Payment Integration</h1>
      </header>
      <main>
        {!walletConnected ? (
          <button className="btn connect-btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <p>Wallet Address: {walletAddress}</p>
            <p>USDC Balance: {usdcBalance} USDC</p>
          </div>
        )}
        <div className="product">
          <h2>T-SHIRT</h2>
          <img src="/shopping.jpg" alt="T-Shirt" className="product-image" />
          <h1>ZARA</h1>
          <p>Price: {tShirtPrice} USDC</p>
          <button
            className="btn buy-btn"
            onClick={makePayment}
            disabled={!walletConnected || loading}
          >
            {loading ? "Processing..." : "Buy Now"}
          </button>
        </div>
        {transactionDetails && (
          <div className="receipt">
            <h3>Order Receipt</h3>
            <p>Item Name: {transactionDetails.itemName}</p>
            <p>Purchase Amount: {transactionDetails.purchaseAmount}</p>
            <p>Transaction Hash:</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionDetails.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {transactionDetails.transactionHash}
            </a>
            <p>Date: {transactionDetails.date}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
