import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import * as tokenJson from './assets/MyToken.json';
import { getAddress } from 'viem';

@Injectable()
export class MyTokenService {
  publicClient;
  walletClient;

  constructor(private configService: ConfigService) {
    const account = privateKeyToAccount(
      `0x${this.configService.get<string>('PRIVATE_KEY')}`,
    );
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(this.configService.get<string>('RPC_ENDPOINT_URL')),
    });
    this.walletClient = createWalletClient({
      transport: http(this.configService.get<string>('RPC_ENDPOINT_URL')),
      chain: sepolia,
      account: account,
    });
  }

  async getServerWalletAddress(): Promise<string> {
    return await this.walletClient.account.address;
  }

  getContractAddress(): string {
    return this.configService.get<string>('TOKEN_ADDRESS');
  }

  async checkMinterRole(address: string): Promise<boolean> {
    const MINTER_ROLE = await this.publicClient.readContract({
      address: await this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: 'MINTER_ROLE',
    });
    const hasRole = await this.publicClient.readContract({
      address: await this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: 'hasRole',
      args: [MINTER_ROLE, getAddress(address)],
    });
    return hasRole;
  }

  async getTotalSupply() {
    return await this.publicClient.readContract({
      address: await this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: 'totalSupply',
    });
  }

  async mintTokens(address: string, amount: number) {
    return await this.walletClient.writeContract({
      address: await this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: 'mint',
      args: [getAddress(address), amount],
    });
  }

  async getTransactionReceipt(hash: string) {
    return await this.publicClient.getTransactionReceipt(hash);
  }

  async getTokenBalance(address: string) {
    return await this.publicClient.readContract({
      address: await this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: 'balanceOf',
      args: [getAddress(address)],
    });
  }
}
