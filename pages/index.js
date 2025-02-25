// pages/index.js
import { useState, useEffect } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import Head from "next/head";
import toast from "react-hot-toast"; // Ensure you have this installed
import { addressToEmptyAccount, createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { ENTRYPOINT_ADDRESS_V07, providerToSmartAccountSigner } from "permissionless";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { toECDSASigner } from "@zerodev/permissions";
import { CallPolicyVersion, toCallPolicy } from "@zerodev/permissions/policies";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toSudoPolicy } from "@zerodev/permissions/policies"
 



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
      const publicClient = createPublicClient(); // Ensure this is properly defined

      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: smartAccountSigner,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        kernelVersion: KERNEL_V3_1,
      });

      // Use strategy.key as an index to ensure the same wallet is retrieved
      const account = await createKernelAccount(publicClient, {
        kernelVersion: KERNEL_V3_1,
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        index: BigInt(strategy.key), // Using the same index for the same wallet
      });

      const smartWalletClient = createKernelAccountClient({
        account,
        chain: "your-chain-config", // Ensure this is defined properly
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        bundlerTransport: http("your-bundler-rpc"),
      });

      setSmartWallet(smartWalletClient); // Store it in state
      toast.success("Smart wallet initialized");
    } catch (error) {
      toast.error("Error creating smart wallet");
      console.error("Error creating smart wallet:", error);
    }
  }

  async approveSessionKey(params: {
    sessionKeyAddress: `0x${string}`,
    wallets: any[],
    strategy: Strategy
}) {
    if (!params.sessionKeyAddress) {
        toast.error("session key address is required");
        throw new Error("Session key address is required");
    }
    try {
        const publicClient = this.createPublicClient();
        const embeddedWallet = params.wallets.find(
            (wallet) => wallet.walletClientType === "privy"
        );

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

        const emptyAccount = addressToEmptyAccount(params.sessionKeyAddress);
        const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount });

        // In the approveSessionKey method, modify the permissionPlugin creation:
        const sudoPolicy = toSudoPolicy({})

        const permissionPlugin = await toPermissionValidator(publicClient, {
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            signer: emptySessionKeySigner,
            policies: [
              sudoPolicy
                // toCallPolicy({
                //     policyVersion: CallPolicyVersion.V0_0_3,
                //     permissions: [
                //         {
                //             target: ONE_INCH_AGGREGATOR_ADDRESS,
                //             valueLimit: BigInt(maxInt256),
                //             abi: ONE_INCH_ABI,
                //             functionName: "swap",
                //             args: [
                //                 null, // executor: IAggregationExecutor
                //                 null, // desc: SwapDescription struct
                //                 null  // data: bytes                            
                //             ]
                //         }
                //     ]
                // })
            ],
            kernelVersion: KERNEL_V3_1,
        });


        const sessionKeyAccount = await createKernelAccount(publicClient, {
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            plugins: {
                sudo: ecdsaValidator,
                regular: permissionPlugin,
            },
            kernelVersion: KERNEL_V3_1,
            index: BigInt(params.strategy.key),
        });

        return serializePermissionAccount(sessionKeyAccount);
    } catch (error) {
        toast.error("Failed to approve session key");
        console.error("Error approving session key:", error);
        throw error;
    }
}


  // Call getSmartWallet when wallets are ready
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      console.log("hello world");
      getSmartWallet(wallets, { key: 1 }); // Set a fixed index for now
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