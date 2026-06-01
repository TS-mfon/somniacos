// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/SomniacOSKernel.sol";

contract FakeSomniaAgentPlatform is ISomniaAgentPlatformV2 {
    uint256 public nextRequestId = 1000;
    uint256 public immutable requestDeposit;

    constructor(uint256 requestDeposit_) {
        requestDeposit = requestDeposit_;
    }

    function createRequest(uint256, address, bytes4, bytes calldata) external payable returns (uint256 requestId) {
        require(msg.value >= requestDeposit, "deposit required");
        requestId = nextRequestId++;
    }

    function getRequestDeposit() external view returns (uint256) {
        return requestDeposit;
    }

    function completeString(SomniacAgentRouterV2 router, uint256 requestId, string calldata result) external {
        SomniacAgentRouterV2.Response[] memory responses = new SomniacAgentRouterV2.Response[](1);
        responses[0] = SomniacAgentRouterV2.Response(address(this), abi.encode(result), SomniacAgentRouterV2.ResponseStatus.Success, 0, block.timestamp, 0);
        SomniacAgentRouterV2.Request memory request;
        router.handleResponse(requestId, responses, SomniacAgentRouterV2.ResponseStatus.Success, request);
    }
}

contract SomniacOSKernelTest {
    receive() external payable {}

    function testProtocolFeeVaultCollectsFee() public {
        ProtocolFeeVault vault = new ProtocolFeeVault(payable(address(this)));
        uint256 fee = vault.feeAmount();
        vault.payFee{value: fee}(address(this), "process.create", 1, 0);
        require(vault.totalCollected() == fee, "fee total mismatch");
        require(address(vault).balance == fee, "vault balance mismatch");
    }

    function testPolicyAndProcessCreationChargeFees() public {
        KernelFixture memory fixture = _deployFixture();
        bytes32[] memory allowed = new bytes32[](1);
        allowed[0] = keccak256("content.write");

        uint256 fee = fixture.vault.feeAmount();
        uint256 policyId = fixture.policies.createPolicy{value: fee}(2 ether, 4, 1, true, allowed, "somniacos://domains/all");
        uint256 processId = fixture.manager.createProcess{value: fee}("Create a campaign", policyId, "somniacos://process/demo");

        (address processOwner,, uint256 storedPolicyId, ProcessManager.ProcessStatus status, uint256 spent,,,,,) = fixture.manager.processes(processId);
        require(processOwner == address(this), "owner mismatch");
        require(storedPolicyId == policyId, "policy mismatch");
        require(status == ProcessManager.ProcessStatus.Created, "status mismatch");
        require(spent == fee, "spent mismatch");
        require(fixture.vault.totalCollected() == fee * 2, "fee mismatch");
    }

    function testRouterV2CompletesProcessStep() public {
        KernelFixture memory fixture = _deployFixture();
        bytes32 capabilityId = keccak256("content.write");
        bytes32[] memory allowed = new bytes32[](1);
        allowed[0] = capabilityId;

        uint256 fee = fixture.vault.feeAmount();
        uint256 policyId = fixture.policies.createPolicy{value: fee}(5 ether, 4, 1, true, allowed, "somniacos://domains/all");
        uint256 processId = fixture.manager.createProcess{value: fee}("Write launch copy", policyId, "somniacos://process/demo");

        string[] memory urls = new string[](0);
        uint256 totalDue = fixture.router.getRequiredDeposit(SomniacAgentRouterV2.RunMode.LLM) + fee;
        uint256 requestId = fixture.router.requestProcessAgentRun{value: totalDue}(processId, capabilityId, "content-writer", "Write an X post", "concise", urls, SomniacAgentRouterV2.RunMode.LLM);
        fixture.platform.completeString(fixture.router, requestId, "Launch post ready.");

        (,,,,,, ProcessManager.StepStatus stepStatus,,, string memory result,,) = fixture.manager.steps(processId, 1);
        require(stepStatus == ProcessManager.StepStatus.Success, "step not success");
        require(keccak256(bytes(result)) == keccak256(bytes("Launch post ready.")), "result mismatch");
    }

    function testRouterV2LaunchesWorkflowWithOneFeeAndAgentDeposit() public {
        KernelFixture memory fixture = _deployFixture();
        bytes32 capabilityId = keccak256("content.write");
        bytes32[] memory allowed = new bytes32[](1);
        allowed[0] = capabilityId;
        string[] memory urls = new string[](0);

        uint256 fee = fixture.vault.feeAmount();
        uint256 totalDue = fixture.router.getRequiredDeposit(SomniacAgentRouterV2.RunMode.LLM) + fee;
        (uint256 processId, uint256 requestId) = fixture.router.launchWorkflowAgentRun{value: totalDue}(
            5 ether,
            4,
            1,
            true,
            allowed,
            "somniacos://domains/all",
            "Run a campaign",
            "somniacos://process/workflow",
            capabilityId,
            "content-writer",
            "Write an X post",
            "concise",
            urls,
            SomniacAgentRouterV2.RunMode.LLM
        );

        (address processOwner,, uint256 storedPolicyId, ProcessManager.ProcessStatus processStatus, uint256 spent,,,,,) = fixture.manager.processes(processId);
        (address policyOwner,,,,,, bool active) = fixture.policies.policies(storedPolicyId);
        require(processOwner == address(this), "process owner mismatch");
        require(policyOwner == address(this), "policy owner mismatch");
        require(active, "policy inactive");
        require(processStatus == ProcessManager.ProcessStatus.WaitingForCallback, "process not waiting");
        require(spent == totalDue, "spent mismatch");
        require(fixture.vault.totalCollected() == fee, "single fee mismatch");

        fixture.platform.completeString(fixture.router, requestId, "Workflow result ready.");
        (,,,,,, ProcessManager.StepStatus stepStatus,,, string memory result,,) = fixture.manager.steps(processId, 1);
        require(stepStatus == ProcessManager.StepStatus.Success, "step not success");
        require(keccak256(bytes(result)) == keccak256(bytes("Workflow result ready.")), "result mismatch");
    }

    struct KernelFixture {
        ProtocolFeeVault vault;
        CapabilityRegistry capabilities;
        AutonomyPolicyRegistry policies;
        MemoryLedger memoryLedger;
        ProcessManager manager;
        FakeSomniaAgentPlatform platform;
        SomniacAgentRouterV2 router;
    }

    function _deployFixture() private returns (KernelFixture memory fixture) {
        fixture.vault = new ProtocolFeeVault(payable(address(this)));
        fixture.capabilities = new CapabilityRegistry();
        fixture.policies = new AutonomyPolicyRegistry(address(fixture.vault));
        fixture.memoryLedger = new MemoryLedger();
        fixture.manager = new ProcessManager(address(fixture.vault), address(fixture.policies), address(fixture.capabilities), address(fixture.memoryLedger));
        fixture.memoryLedger.setProcessManager(address(fixture.manager));
        fixture.platform = new FakeSomniaAgentPlatform(0.03 ether);
        fixture.router = new SomniacAgentRouterV2(
            address(fixture.platform),
            address(fixture.manager),
            address(fixture.policies),
            address(fixture.vault),
            12847293847561029384,
            12875401142070969085,
            13174292974160097713,
            3,
            0.07 ether,
            0.10 ether,
            0.03 ether
        );
        fixture.manager.setRouter(address(fixture.router));
        fixture.policies.setWorkflowCreator(address(fixture.router));
        fixture.capabilities.registerCapability(keccak256("content.write"), "Content Writer", "Writes content", 0, 12847293847561029384, "somniacos://schema/content");
    }
}
