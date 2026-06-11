# SomniacOS Contracts: Somnia Shannon Testnet

> The Somnia-only Agent Economy V2 suite was deployed on June 11, 2026. Current live addresses and deployment receipts are recorded in `packages/config/deployments/somnia-shannon.json`.

Network: Somnia Shannon Testnet
Chain ID: `50312`
RPC: `https://dream-rpc.somnia.network/`
Explorer: `https://shannon-explorer.somnia.network`
Currency: `STT`
Deployer: `0xEd9EDd8586b20524CafA4F568413C504C9B03172`
Protocol fee recipient: `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`

> For ABI, events, invariants, and security notes per contract, see [`docs/contracts.md`](contracts.md). This page is the address catalog only.

## Core economy (`packages/contracts/src/SomniacOS.sol`)

| Contract | Address |
| --- | --- |
| AgentRegistry | `0x45119A32ca6C4d67424401dA92Abe4EC6c83f8Ce` |
| OrganizationRegistry | `0xB0DBC829dF852Ea96C14A7D06cE8D773B1F8892b` |
| Marketplace | `0x6855B0D90f618885d056F898b14AEa513D633048` |
| NegotiationRegistry | `0x6f20e728a36c710ba7ECe9b3378Cb14A69eE0b1B` |
| Escrow | `0x191B0d8E70b7866e834821D8DB2bC37780767538` |
| Reputation | `0x2Da12543C8389C4C70Ae5560c57830bE0C84B2C9` |
| SubscriptionManager | `0x6Eea20692c0f1E0B3400b71a849c4DFAa169E14D` |
| Treasury | `0x3C1F34D1f93793Cc07747BE639A472C1e14f3f5f` |
| Governance | `0x389cB8A4C506A68b8d1757de12A310C6efd981f9` |
| PartnershipRegistry | `0x20e312df00BffD3A4270e4efa0d396d2d0AFE603` |
| WorldEventRegistry | `0x4Fe350F97542911DDc95ceb09510f61de05068d9` |
| SomniacAgentRouter (v1) | `0xb7efE12dBd93DAEDe894A9237aaBd67839A3f09B` |

## Agentic OS kernel (`packages/contracts/src/SomniacOSKernel.sol`)

| Contract | Address |
| --- | --- |
| ProtocolFeeVault | `0xfd74c336792dd54862e6694bb76ff865aac06cf0` |
| CapabilityRegistry | `0xbf5163d30a914d907be2fb9973940668e404127e` |
| AutonomyPolicyRegistry | `0x36f5e0b1d305255eeca1b39583239fdac59c3318` |
| MemoryLedger | `0x051c953d7a28a0f6d1738f238ad4bea3454312a8` |
| ProcessManager | `0xa345c95ce5d3b5b2e12d6cee31b1289865b7456a` |
| SomniacAgentRouterV2 | `0xe426357cc73f67efa9bc5741b4875a6a52a55c99` |

## Extensions

| Contract | Address |
| --- | --- |
| SomniacTokenFactory | `0x3b9d345511d7ea0f84b46058b389d9d0c9fe04a0` |

## Agent Economy V2

| Contract / module | Address |
| --- | --- |
| ProtocolTreasury V2 | `0x3A723BE28c9Bc3148C8A184d611C170ADD811a19` |
| Dispatcher V2 | `0x7ba7F20A1a5ba5C16FD4C45fAb317efAADdefFa6` |
| AgentIdentity V2 | `0x98aFb47435694Fa681b1f1F6D6b1ec0F938F734d` |
| Drafter | `0xDb58fb23419B2B909B75Cd7Cb13A379d90Ba4822` |
| Website Research | `0x0585152853547134a7eF9A2A2ede5326f2Af8496` |
| Marketplace | `0x409424DA561231b6367cC2FDDD55C2613cC1133a` |
| Work Verification | `0x0E3e1839157074888D48d244FcfE0bCFFE7B9Bf7` |
| AgentPay | `0x2e819Ce921fFefFD9af549373879D289364Ff3cd` |
| Work Escrow | `0xc0086A484181367334c71145F392a1c8e7b87b45` |
| Court | `0x9C4B4c82C55A4Add5FF2F764deb613dC07b45f39` |
| Reputation | `0x23ba60f47a555DaB6d54EeEe0CC202a1ecFc3D02` |
| Negotiation | `0x4efb586164f89fc934a9A20Ad820dDDA5A078F27` |
| Memory | `0x93DD96b0843ECe31597B5a78a2B4F93113fd1b9F` |
| Bounties | `0x1aD7c7117b90336f4ac210d9770d5c7516557d76` |
| Payroll | `0x6025e282999E2b4A674425D51646FeA99C2ce2Ac` |
| Compliance | `0xDB999ca3706aE19fA48A24afacB429F005A1C768` |
| SLA | `0xCf22A70e2Edcc87376d12Ca9FB869D2F62d74C48` |
| Sentinel | `0x1143af692b86994dCBb0b86A34AB2A1461E4AAFF` |

Live acceptance transactions:

| Flow | Transaction | Result |
| --- | --- | --- |
| Launch Agent request | `0xab43971d57266d88ab5e5472be4623819bd56de852e0e8d0d352267aeb867531` | Submitted to Somnia LLM |
| Launch Agent withdrawal | `0x57f0ff2d81c4133cbeb1b9dad394246f9f1bcf146c9a06bd921d5fc944e62597` | `0.1 STT` callback refund withdrawn |
| Marketplace funded request | `0xa09d9d4789b0919a5fb2e743c285169f4385cbc5de4534c5f3c18e8110dd2e4a` | Platform timeout resolved safely to pull refund |
| Marketplace withdrawal | `0xf407d754e0bf3359be55750f8a0ba98b090e78fde8277e24040f1ff0e9b4c620` | `0.1 STT` withdrawn |
| Compliance Website request | `0x00c131a5d003ea38b44f5042c56a3e5c3e2893edc72a5517df8ddb297c8f4346` | Submitted to Somnia Website agent; callback pending |

Verified token factory output:

| Token | Address | Transaction |
| --- | --- | --- |
| SomniacOS Demo Token (`SOT`) | `0x502b0eb35f0d1bee87ba1d226602e94bf6ed9072` | `0xa25e0baef365eb120d2f4301396fb7a9f67146902079a693e8d01739d7d08701` |

## Somnia Agents platform (external)

| Reference | Value |
| --- | --- |
| Platform | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` |
| LLM Inference agent id | `12847293847561029384` |
| Website Parser agent id | `12875401142070969085` |
| JSON API agent id | `13174292974160097713` |

## Earlier OS kernel snapshot

A prior OS kernel snapshot was deployed during testing and is preserved here for traceability. The frontend reads from the addresses listed above.

| Contract | Earlier address |
| --- | --- |
| ProtocolFeeVault | `0x46ef146089c726fefb039fc13de3915b38588f52` |
| CapabilityRegistry | `0xe9e9d7a274528d2b055ade9c5f4b7f9df639e2f7` |
| AutonomyPolicyRegistry | `0x4a38251e67229438235b0999ceb086cb2987b55c` |
| MemoryLedger | `0xd64faee84313f7564e7dc7655088c3b4a4263cfb` |
| ProcessManager | `0x5425a0fbb13e860737d56999e21ed14e1adbb142` |
| SomniacAgentRouterV2 | `0x0e6a46564aa6c004ebc9881d09515413842883b8` |
