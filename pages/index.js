import { useState, useEffect } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import Head from "next/head";
import toast from "react-hot-toast"; // Ensure you have this installed
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { addressToEmptyAccount, createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { ENTRYPOINT_ADDRESS_V07, providerToSmartAccountSigner } from "permissionless";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { toECDSASigner } from "@zerodev/permissions";
import { CallPolicyVersion, toCallPolicy, toSudoPolicy } from "@zerodev/permissions/policies";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";

function LoginButton() {
  const { login, authenticated } = usePrivy();

  return (
    <button
      type="button"
      onClick={authenticated ? undefined : login}
      className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
    >
      {authenticated ? "Connected" : "Login"}
    </button>
  );
}

function MainApp() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [smartWallet, setSmartWallet] = useState(null);
  const [sessionApproved, setSessionApproved] = useState(false);

  

  // Async function to create a smart wallet
  async function getSmartWallet(wallets, strategy) {
    try {
      const embeddedWallet = wallets.find(
          (wallet) => wallet.walletClientType === "privy"
      );
      if (!embeddedWallet) {
          toast.error("No Privy embedded wallet found");
          throw new Error("No Privy embedded wallet found");
      }
      

      const provider = await embeddedWallet.getEthereumProvider();
      const smartAccountSigner = await providerToSmartAccountSigner(provider);

      // Create Public Client
      const publicClient = createPublicClient({
        chain: mainnet, // Change this to the desired chain
        transport: http(),
      });
      // const publicClient = this.createPublicClient();

      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
          signer: smartAccountSigner,
          entryPoint: ENTRYPOINT_ADDRESS_V07,
          kernelVersion: KERNEL_V3_1,
      });

      const account = await createKernelAccount(publicClient, {
          kernelVersion: KERNEL_V3_1,
          plugins: {
              sudo: ecdsaValidator,
          },
          entryPoint: ENTRYPOINT_ADDRESS_V07,
          index: BigInt(strategy.key),
      });

      return createKernelAccountClient({
          account,
          chain: this.chainConfig.chain,
          entryPoint: ENTRYPOINT_ADDRESS_V07,
          bundlerTransport: http(this.chainConfig.bundlerRpc),
      });
  } catch (error) {
      toast.error("Error creating smart wallet");
      console.error("Error creating smart wallet:", error);
      throw error;
  }
  }

  // Approve session key function
  async function approveSessionKey(sessionKeySigner) {
    if (!sessionKeySigner) {
      toast.error("Session key signer is required");
      throw new Error("Session key signer is required");
    }

    try {
      const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");

      if (!embeddedWallet) {
        toast.error("No Privy embedded wallet found");
        throw new Error("No Privy embedded wallet found");
      }

      const provider = await embeddedWallet.getEthereumProvider();
      const smartAccountSigner = await providerToSmartAccountSigner(provider);

      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: smartAccountSigner,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        kernelVersion: KERNEL_V3_1,
      });

      const emptySessionKeySigner = await toECDSASigner(sessionKeySigner); // Fixed incorrect usage

      const sudoPolicy = toSudoPolicy();

      const permissionPlugin = await toPermissionValidator(publicClient, {
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        signer: emptySessionKeySigner,
        policies: [sudoPolicy],
        kernelVersion: KERNEL_V3_1,
      });

      await createKernelAccount(publicClient, {
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        plugins: {
          sudo: ecdsaValidator,
          regular: permissionPlugin,
        },
        kernelVersion: KERNEL_V3_1,
        index: BigInt(1),
      });

      setSessionApproved(true);
      toast.success("Session key approved");
    } catch (error) {
      toast.error("Failed to approve session key");
      console.error("Error approving session key:", error);
    }
  }

  useEffect(() => {
    if (wallets && wallets.length > 0) {
      getSmartWallet(wallets, { key: 1 });
    }
  }, [wallets]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold">Privy Login Demo</h1>
        <LoginButton />
        {authenticated && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">Connected User</h2>
            <p>User ID: {user?.id}</p>
            <p>Email: {user?.email?.address || "Not provided"}</p>
            <p>Wallet: {wallets?.[0]?.address || "No wallet"}</p>
            {smartWallet && <p className="text-green-600">Smart Wallet Initialized</p>}
            {/* <button
              onClick={() => approveSessionKey("0xYourSessionKeySigner")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Approve Session Key
            </button> */}
            {sessionApproved && <p className="text-green-500 mt-2">Session Key Approved!</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// Root Component with Provider
export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Privy Login Demo</title>
        <meta name="description" content="A proof of concept for Privy authentication" />
      </Head>
      
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
        config={{
          embedded: { 
            ethereum: { 
              createOnLogin: "users-without-wallets",
            }, 
          },
        }}
      >
        <MainApp />
      </PrivyProvider>
    </>
  );
}