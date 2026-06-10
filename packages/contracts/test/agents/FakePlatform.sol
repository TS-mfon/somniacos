// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test double mirroring the REAL Somnia Agents Platform interface used by the live
///         SomniacAgentRouterV2: createRequest(agentId, callback, selector, payload) and a
///         handleResponse(uint256, Response[], ResponseStatus, Request) callback whose
///         result bytes are an abi-encoded string.
contract FakePlatform {
    enum ResponseStatus { Success, Failed, TimedOut }
    enum ConsensusType { Majority, Threshold }

    struct Response {
        address validator;
        bytes result;
        ResponseStatus status;
        uint256 receipt;
        uint256 timestamp;
        uint256 executionCost;
    }

    struct Request {
        uint256 id;
        address requester;
        address callbackAddress;
        bytes4 callbackSelector;
        address[] subcommittee;
        Response[] responses;
        uint256 responseCount;
        uint256 failureCount;
        uint256 threshold;
        uint256 createdAt;
        uint256 deadline;
        ResponseStatus status;
        ConsensusType consensusType;
        uint256 remainingBudget;
    }

    uint256 public nextRequestId = 1000;
    uint256 public requestDeposit = 0.03 ether;

    mapping(uint256 => address) public callbackOf;
    mapping(uint256 => bytes4)  public selectorOf;

    function setRequestDeposit(uint256 d) external { requestDeposit = d; }

    function getRequestDeposit() external view returns (uint256) {
        return requestDeposit;
    }

    function createRequest(
        uint256,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata
    ) external payable returns (uint256 requestId) {
        require(msg.value >= requestDeposit, "deposit");
        requestId = nextRequestId++;
        callbackOf[requestId] = callbackAddress;
        selectorOf[requestId] = callbackSelector;
    }

    /// @notice Deliver a synthetic success result (abi-encoded string) back to the callback.
    function deliver(uint256 requestId, string memory resultText) external {
        Response[] memory responses = new Response[](1);
        responses[0] = Response({
            validator:     address(this),
            result:        abi.encode(resultText),
            status:        ResponseStatus.Success,
            receipt:       0,
            timestamp:     block.timestamp,
            executionCost: 0
        });

        Request memory req;
        req.id = requestId;
        req.callbackAddress = callbackOf[requestId];
        req.callbackSelector = selectorOf[requestId];
        req.status = ResponseStatus.Success;

        (bool ok, ) = callbackOf[requestId].call(
            abi.encodeWithSelector(
                selectorOf[requestId],
                requestId,
                responses,
                ResponseStatus.Success,
                req
            )
        );
        require(ok, "callback failed");
    }
}
