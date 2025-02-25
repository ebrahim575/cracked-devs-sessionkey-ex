async getSmartWallet(wallets: any[], strategy: Strategy) {
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
            const publicClient = this.createPublicClient();

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
