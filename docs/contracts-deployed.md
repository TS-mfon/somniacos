# SomniacOS Contracts: Somnia Shannon Testnet

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
