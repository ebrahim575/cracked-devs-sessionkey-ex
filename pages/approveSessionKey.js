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

            const permissionPlugin = await toPermissionValidator(publicClient, {
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                signer: emptySessionKeySigner,
                policies: [
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
