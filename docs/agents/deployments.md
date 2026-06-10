# Agent Economy — Deployed Addresses

## Somnia Shannon Testnet (chain 50312)

Deployed 2026-06-10. Deployer: `0xEd9EDd8586b20524CafA4F568413C504C9B03172`
Somnia Agents Platform: `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`

| Contract | Address |
| --- | --- |
| ProtocolTreasury | `0xcfE1321cC58eFc64b1a0Af0568082e7A9a3dCA62` |
| AgentEconomyDispatcher | `0xe10e8d223f97c9bAA6450aeD2B78c91B45c4CEd7` |
| ContentCodeSkills | `0xf6BB8410b2A93fe0aEC5774E37e1352F746Dde29` |
| AgentIdentity | `0xC7C6EDb47a7264f0B337C695736Fea02877ca272` |

Protocol fee on ContentCodeSkills and AgentIdentity: 0.1 STT.

### Deployment note
`forge script ... --broadcast` failed with out-of-gas on this chain (estimator
under-provisioned). `forge create` per-contract WITHOUT a manual `--gas-limit`
(letting forge estimate per tx) deployed cleanly. Do not pass `--gas-limit` here.
