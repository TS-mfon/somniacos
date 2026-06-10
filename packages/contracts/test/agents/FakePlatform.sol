// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISomniaAgentsPlatform {
    struct AgentResponse {
        address agentAddress;
        bytes   result;
        uint8   status;
        uint256 requestId;
        uint256 agentId;
        uint256 fee;
    }
    function createRequest(
        address callbackContract,
        bytes4  callbackSelector,
        uint256 agentId,
        string  calldata prompt,
        uint256 deposit
    ) external payable returns (uint256 requestId);
    function getTotalDue(uint256 agentId, uint256 subcommitteeSize) external view returns (uint256);
}

/// @notice Test double for the Somnia Agents Platform. Lets tests synthesize a
///         callback delivery without a live platform.
contract FakePlatform is ISomniaAgentsPlatform {
    uint256 public nextRequestId = 1000;
    uint256 public depositRequired = 0.05 ether;

    mapping(uint256 => address) public callbackOf;
    mapping(uint256 => bytes4)  public selectorOf;

    function setDeposit(uint256 d) external {
        depositRequired = d;
    }

    function getTotalDue(uint256, uint256) external view override returns (uint256) {
        return depositRequired;
    }

    function createRequest(
        address callbackContract,
        bytes4  callbackSelector,
        uint256,
        string calldata,
        uint256 deposit
    ) external payable override returns (uint256 requestId) {
        require(msg.value >= deposit, "deposit");
        requestId = nextRequestId++;
        callbackOf[requestId] = callbackContract;
        selectorOf[requestId] = callbackSelector;
    }

    /// @notice Deliver a synthetic success result back to the registered callback.
    function deliver(uint256 requestId, string memory resultText) external {
        AgentResponse[] memory responses = new AgentResponse[](1);
        responses[0] = AgentResponse({
            agentAddress: address(this),
            result:       bytes(resultText),
            status:       2,
            requestId:    requestId,
            agentId:      0,
            fee:          0
        });
        (bool ok, ) = callbackOf[requestId].call(
            abi.encodeWithSelector(selectorOf[requestId], requestId, responses, uint8(2), bytes(""))
        );
        require(ok, "callback failed");
    }
}
