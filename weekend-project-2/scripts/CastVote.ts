import { createPublicClient, createWalletClient, hexToString, http } from 'viem';
import { sepolia } from 'viem/chains';
import { abi } from '../artifacts/contracts/Ballot.sol/Ballot.json';
import * as dotenv from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';

dotenv.config();

// env variables
const providerApiKey = process.env.ALCHEMY_API_KEY || '';
const deployerPrivateKey = process.env.PRIVATE_KEY || '';

async function main() {
  // Get arguments from the command
  const parameters = process.argv.slice(2);

  // validate the parameters
  if (!parameters || parameters.length < 2)
    throw new Error('Parameters not provided');

  // validate the contract address
  const contractAddress = parameters[0] as `0x${string}`;
  if (!contractAddress) throw new Error('Contract address not provided');

  // validate that the address respect evm address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error('Invalid contract address');

  // validate the proposal index to cast a vote in its favor
  const proposalIndex = parameters[1];
  if (isNaN(Number(proposalIndex))) throw new Error('Invalid proposal index');

  // create a wallet client to be able to send transactions to the chain
  const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
  const voter = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  // initiate a public to read data from the chain
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

  // Read the data of the selected proposal
  console.log('Proposal selected: ');
  const proposal = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'proposals',
    args: [BigInt(proposalIndex)],
  })) as any[];

  // output the data of the selected proposal
  const name = hexToString(proposal[0], { size: 32 });
  console.log('Voting to proposal', name);
  console.log('Confirm? (Y/n)');

  process.stdin.on('data', async function (d) {
    if (d.toString().trim().toLowerCase() != 'n') {
      const hash = await voter.writeContract({
        address: contractAddress,
        abi,
        functionName: 'vote',
        args: [BigInt(proposalIndex)],
      });
      console.log('Transaction hash:', hash);
      console.log('Waiting for confirmations...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed');
    } else {
      console.log('Operation cancelled');
    }
    process.exit();
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
