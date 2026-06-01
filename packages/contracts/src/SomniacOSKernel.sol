// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISomniaAgentPlatformV2 {
    function createRequest(uint256 agentId, address callbackAddress, bytes4 callbackSelector, bytes calldata payload) external payable returns (uint256 requestId);
    function getRequestDeposit() external view returns (uint256);
}

interface ILLMInferenceAgentV2 {
    function inferString(string calldata prompt, string calldata system, bool chainOfThought, string[] calldata allowedValues) external returns (string memory response);
}

interface IWebsiteParserAgentV2 {
    function ExtractString(
        string calldata key,
        string calldata description,
        string[] calldata options,
        string calldata prompt,
        string calldata url,
        bool resolveUrl,
        uint8 numPages,
        uint8 confidenceThreshold
    ) external returns (string memory output);
}

interface IJsonApiAgentV2 {
    function fetchString(string calldata url, string calldata selector, uint8 confidenceThreshold) external returns (string memory output);
}

contract Owned {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        require(nextOwner != address(0), "owner required");
        owner = nextOwner;
    }
}

contract ProtocolFeeVault is Owned {
    address payable public feeRecipient;
    uint256 public feeAmount = 0.1 ether;
    uint256 public totalCollected;

    event ProtocolFeePaid(address indexed payer, string actionType, uint256 indexed processId, uint256 indexed stepId, uint256 amount);
    event FeeRecipientUpdated(address indexed recipient);
    event FeeAmountUpdated(uint256 amount);
    event ProtocolFeesWithdrawn(address indexed recipient, uint256 amount);

    constructor(address payable feeRecipient_) {
        require(feeRecipient_ != address(0), "recipient required");
        feeRecipient = feeRecipient_;
    }

    function setFeeRecipient(address payable recipient) external onlyOwner {
        require(recipient != address(0), "recipient required");
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setFeeAmount(uint256 amount) external onlyOwner {
        feeAmount = amount;
        emit FeeAmountUpdated(amount);
    }

    function payFee(address payer, string calldata actionType, uint256 processId, uint256 stepId) external payable {
        require(msg.value == feeAmount, "fee required");
        totalCollected += msg.value;
        emit ProtocolFeePaid(payer, actionType, processId, stepId, msg.value);
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "insufficient");
        (bool ok,) = feeRecipient.call{value: amount}("");
        require(ok, "withdraw failed");
        emit ProtocolFeesWithdrawn(feeRecipient, amount);
    }
}

contract CapabilityRegistry is Owned {
    struct Capability {
        bytes32 id;
        string label;
        string description;
        uint8 mode;
        bool active;
        uint256 somniaAgentId;
        string schemaURI;
    }

    bytes32[] public capabilityIds;
    mapping(bytes32 => Capability) public capabilities;

    event CapabilityRegistered(bytes32 indexed capabilityId, string label, uint8 mode, uint256 somniaAgentId, string schemaURI);
    event CapabilityUpdated(bytes32 indexed capabilityId, string label, uint8 mode, uint256 somniaAgentId, string schemaURI);
    event CapabilityStatusChanged(bytes32 indexed capabilityId, bool active);

    function registerCapability(bytes32 capabilityId, string calldata label, string calldata description, uint8 mode, uint256 somniaAgentId, string calldata schemaURI) external onlyOwner {
        require(capabilityId != bytes32(0), "capability required");
        require(bytes(label).length > 0, "label required");
        if (capabilities[capabilityId].id == bytes32(0)) capabilityIds.push(capabilityId);
        capabilities[capabilityId] = Capability(capabilityId, label, description, mode, true, somniaAgentId, schemaURI);
        emit CapabilityRegistered(capabilityId, label, mode, somniaAgentId, schemaURI);
    }

    function updateCapability(bytes32 capabilityId, string calldata label, string calldata description, uint8 mode, uint256 somniaAgentId, string calldata schemaURI) external onlyOwner {
        require(capabilities[capabilityId].id != bytes32(0), "unknown capability");
        capabilities[capabilityId] = Capability(capabilityId, label, description, mode, capabilities[capabilityId].active, somniaAgentId, schemaURI);
        emit CapabilityUpdated(capabilityId, label, mode, somniaAgentId, schemaURI);
    }

    function setCapabilityStatus(bytes32 capabilityId, bool active) external onlyOwner {
        require(capabilities[capabilityId].id != bytes32(0), "unknown capability");
        capabilities[capabilityId].active = active;
        emit CapabilityStatusChanged(capabilityId, active);
    }

    function getCapabilityCount() external view returns (uint256) {
        return capabilityIds.length;
    }

    function isActive(bytes32 capabilityId) external view returns (bool) {
        return capabilities[capabilityId].active;
    }
}

contract AutonomyPolicyRegistry {
    struct Policy {
        address owner;
        uint256 maxSpend;
        uint256 maxSteps;
        uint256 maxRetries;
        bool allowChainedSteps;
        string allowedDomainsURI;
        bool active;
    }

    ProtocolFeeVault public immutable feeVault;
    uint256 public nextPolicyId = 1;
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => mapping(bytes32 => bool)) public allowedCapabilities;

    event PolicyCreated(uint256 indexed policyId, address indexed owner, uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, string allowedDomainsURI);
    event PolicyUpdated(uint256 indexed policyId, uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, string allowedDomainsURI);

    constructor(address feeVault_) {
        require(feeVault_ != address(0), "vault required");
        feeVault = ProtocolFeeVault(feeVault_);
    }

    function createPolicy(uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, bytes32[] calldata capabilities_, string calldata allowedDomainsURI) external payable returns (uint256 policyId) {
        require(maxSteps > 0, "steps required");
        _collectFee(msg.sender, "policy.create", 0, 0);
        policyId = nextPolicyId++;
        policies[policyId] = Policy(msg.sender, maxSpend, maxSteps, maxRetries, allowChainedSteps, allowedDomainsURI, true);
        for (uint256 i = 0; i < capabilities_.length; i++) allowedCapabilities[policyId][capabilities_[i]] = true;
        emit PolicyCreated(policyId, msg.sender, maxSpend, maxSteps, maxRetries, allowChainedSteps, allowedDomainsURI);
    }

    function updatePolicy(uint256 policyId, uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, bytes32[] calldata capabilities_, string calldata allowedDomainsURI) external {
        Policy storage policy = policies[policyId];
        require(policy.owner == msg.sender, "not policy owner");
        require(maxSteps > 0, "steps required");
        policy.maxSpend = maxSpend;
        policy.maxSteps = maxSteps;
        policy.maxRetries = maxRetries;
        policy.allowChainedSteps = allowChainedSteps;
        policy.allowedDomainsURI = allowedDomainsURI;
        for (uint256 i = 0; i < capabilities_.length; i++) allowedCapabilities[policyId][capabilities_[i]] = true;
        emit PolicyUpdated(policyId, maxSpend, maxSteps, maxRetries, allowChainedSteps, allowedDomainsURI);
    }

    function isCapabilityAllowed(uint256 policyId, bytes32 capabilityId) external view returns (bool) {
        return allowedCapabilities[policyId][capabilityId];
    }

    function _collectFee(address payer, string memory actionType, uint256 processId, uint256 stepId) private {
        uint256 fee = feeVault.feeAmount();
        require(msg.value == fee, "fee required");
        feeVault.payFee{value: fee}(payer, actionType, processId, stepId);
    }
}

contract MemoryLedger {
    address public processManager;
    address public owner;

    event MemoryWritten(uint256 indexed processId, uint256 indexed stepId, string kind, string contentURI, string summary, address indexed writer);
    event AgentHandoff(uint256 indexed processId, bytes32 indexed fromCapability, bytes32 indexed toCapability, string reasonURI);
    event ProcessEvaluation(uint256 indexed processId, uint256 score, string riskLevel, string evaluationURI);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyProcessManager() {
        require(msg.sender == processManager, "not process manager");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setProcessManager(address processManager_) external onlyOwner {
        require(processManager_ != address(0), "manager required");
        processManager = processManager_;
    }

    function writeMemory(uint256 processId, uint256 stepId, string calldata kind, string calldata contentURI, string calldata summary, address writer) external onlyProcessManager {
        emit MemoryWritten(processId, stepId, kind, contentURI, summary, writer);
    }

    function recordHandoff(uint256 processId, bytes32 fromCapability, bytes32 toCapability, string calldata reasonURI) external onlyProcessManager {
        emit AgentHandoff(processId, fromCapability, toCapability, reasonURI);
    }

    function recordEvaluation(uint256 processId, uint256 score, string calldata riskLevel, string calldata evaluationURI) external onlyProcessManager {
        emit ProcessEvaluation(processId, score, riskLevel, evaluationURI);
    }
}

contract ProcessManager is Owned {
    enum ProcessStatus { None, Created, Running, WaitingForCallback, Completed, Failed, Cancelled }
    enum StepStatus { None, Pending, Success, Failed, TimedOut }

    struct Process {
        address owner;
        string goal;
        uint256 policyId;
        ProcessStatus status;
        uint256 spent;
        uint256 stepCount;
        uint256 createdAt;
        uint256 updatedAt;
        string resultURI;
        string finalSummary;
    }

    struct Step {
        uint256 processId;
        bytes32 capabilityId;
        string appAgentId;
        uint256 somniaAgentId;
        uint256 requestId;
        uint8 mode;
        StepStatus status;
        string prompt;
        string url;
        string result;
        uint256 createdAt;
        uint256 completedAt;
    }

    ProtocolFeeVault public immutable feeVault;
    AutonomyPolicyRegistry public immutable policies;
    CapabilityRegistry public immutable capabilities;
    MemoryLedger public immutable memoryLedger;
    address public router;
    uint256 public nextProcessId = 1;
    mapping(uint256 => Process) public processes;
    mapping(uint256 => mapping(uint256 => Step)) public steps;
    mapping(uint256 => uint256) public requestToProcess;
    mapping(uint256 => uint256) public requestToStep;

    event ProcessCreated(uint256 indexed processId, address indexed owner, uint256 indexed policyId, string goal, string metadataURI);
    event ProcessStarted(uint256 indexed processId);
    event ProcessStepRequested(uint256 indexed processId, uint256 indexed stepId, bytes32 indexed capabilityId, string appAgentId, uint256 somniaAgentId, uint8 mode, uint256 requestId, string prompt, string url, uint256 totalCost);
    event ProcessStepCompleted(uint256 indexed processId, uint256 indexed stepId, uint256 indexed requestId, StepStatus status, string result);
    event ProcessCompleted(uint256 indexed processId, string finalSummary, string resultURI);
    event ProcessFailed(uint256 indexed processId, string reason);
    event ProcessCancelled(uint256 indexed processId);

    modifier onlyRouter() {
        require(msg.sender == router, "not router");
        _;
    }

    constructor(address feeVault_, address policies_, address capabilities_, address memoryLedger_) {
        require(feeVault_ != address(0) && policies_ != address(0) && capabilities_ != address(0) && memoryLedger_ != address(0), "dependency required");
        feeVault = ProtocolFeeVault(feeVault_);
        policies = AutonomyPolicyRegistry(policies_);
        capabilities = CapabilityRegistry(capabilities_);
        memoryLedger = MemoryLedger(memoryLedger_);
    }

    function setRouter(address router_) external onlyOwner {
        require(router_ != address(0), "router required");
        router = router_;
    }

    function createProcess(string calldata goal, uint256 policyId, string calldata metadataURI) external payable returns (uint256 processId) {
        require(bytes(goal).length > 0, "goal required");
        (address policyOwner,,,,,, bool active) = policies.policies(policyId);
        require(active, "policy inactive");
        require(policyOwner == msg.sender, "not policy owner");
        _collectFee(msg.sender, "process.create", 0, 0);

        processId = nextProcessId++;
        processes[processId] = Process(msg.sender, goal, policyId, ProcessStatus.Created, feeVault.feeAmount(), 0, block.timestamp, block.timestamp, "", "");
        emit ProcessCreated(processId, msg.sender, policyId, goal, metadataURI);
    }

    function registerStep(
        address caller,
        uint256 processId,
        bytes32 capabilityId,
        string calldata appAgentId,
        uint256 somniaAgentId,
        uint8 mode,
        uint256 requestId,
        string calldata prompt,
        string calldata url,
        uint256 totalCost
    ) external onlyRouter returns (uint256 stepId) {
        Process storage process = processes[processId];
        require(process.owner == caller, "not process owner");
        require(process.status == ProcessStatus.Created || process.status == ProcessStatus.Running || process.status == ProcessStatus.WaitingForCallback, "process closed");
        require(capabilities.isActive(capabilityId), "capability inactive");
        require(policies.isCapabilityAllowed(process.policyId, capabilityId), "capability blocked");

        (, uint256 maxSpend, uint256 maxSteps,,,,) = policies.policies(process.policyId);
        require(process.stepCount < maxSteps, "max steps");
        require(process.spent + totalCost <= maxSpend, "max spend");

        process.stepCount++;
        stepId = process.stepCount;
        process.spent += totalCost;
        process.status = ProcessStatus.WaitingForCallback;
        process.updatedAt = block.timestamp;

        steps[processId][stepId] = Step(processId, capabilityId, appAgentId, somniaAgentId, requestId, mode, StepStatus.Pending, prompt, url, "", block.timestamp, 0);
        requestToProcess[requestId] = processId;
        requestToStep[requestId] = stepId;

        emit ProcessStarted(processId);
        emit ProcessStepRequested(processId, stepId, capabilityId, appAgentId, somniaAgentId, mode, requestId, prompt, url, totalCost);
    }

    function completeStepFromRouter(uint256 requestId, StepStatus status, string calldata result) external onlyRouter {
        uint256 processId = requestToProcess[requestId];
        uint256 stepId = requestToStep[requestId];
        require(processId != 0 && stepId != 0, "unknown request");

        Process storage process = processes[processId];
        Step storage step = steps[processId][stepId];
        require(step.status == StepStatus.Pending, "step closed");

        step.status = status;
        step.result = result;
        step.completedAt = block.timestamp;
        process.updatedAt = block.timestamp;

        if (status == StepStatus.Success) {
            process.status = ProcessStatus.Running;
            memoryLedger.writeMemory(processId, stepId, "result", "", result, address(this));
        } else {
            process.status = ProcessStatus.Failed;
            memoryLedger.writeMemory(processId, stepId, "error", "", result, address(this));
            emit ProcessFailed(processId, result);
        }

        emit ProcessStepCompleted(processId, stepId, requestId, status, result);
    }

    function completeProcess(uint256 processId, string calldata finalSummary, string calldata resultURI) external {
        Process storage process = processes[processId];
        require(process.owner == msg.sender, "not process owner");
        require(process.status == ProcessStatus.Running || process.status == ProcessStatus.WaitingForCallback, "not active");
        process.status = ProcessStatus.Completed;
        process.finalSummary = finalSummary;
        process.resultURI = resultURI;
        process.updatedAt = block.timestamp;
        memoryLedger.writeMemory(processId, 0, "final", resultURI, finalSummary, msg.sender);
        emit ProcessCompleted(processId, finalSummary, resultURI);
    }

    function cancelProcess(uint256 processId) external {
        Process storage process = processes[processId];
        require(process.owner == msg.sender, "not process owner");
        require(process.status != ProcessStatus.Completed && process.status != ProcessStatus.Cancelled, "closed");
        process.status = ProcessStatus.Cancelled;
        process.updatedAt = block.timestamp;
        emit ProcessCancelled(processId);
    }

    function _collectFee(address payer, string memory actionType, uint256 processId, uint256 stepId) private {
        uint256 fee = feeVault.feeAmount();
        require(msg.value == fee, "fee required");
        feeVault.payFee{value: fee}(payer, actionType, processId, stepId);
    }
}

contract SomniacAgentRouterV2 is Owned {
    enum RunStatus { None, Pending, Success, Failed, TimedOut }
    enum RunMode { LLM, Website, JSON }
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

    struct RouterRun {
        uint256 processId;
        uint256 stepId;
        address user;
        bytes32 capabilityId;
        string appAgentId;
        string task;
        string url;
        uint256 somniaAgentId;
        RunMode mode;
        RunStatus status;
        string result;
    }

    ISomniaAgentPlatformV2 public immutable platform;
    ProcessManager public immutable processManager;
    ProtocolFeeVault public immutable feeVault;
    uint256 public immutable llmAgentId;
    uint256 public immutable websiteAgentId;
    uint256 public immutable jsonAgentId;
    uint256 public immutable subcommitteeSize;
    uint256 public immutable llmPricePerAgent;
    uint256 public immutable websitePricePerAgent;
    uint256 public immutable jsonPricePerAgent;

    mapping(uint256 => RouterRun) public runs;
    mapping(uint256 => bool) public pendingRequests;

    event OSAgentRunRequested(uint256 indexed processId, uint256 indexed stepId, uint256 indexed requestId, address user, bytes32 capabilityId, string appAgentId, uint256 somniaAgentId, RunMode mode, string task, string url, uint256 deposit, uint256 protocolFee);
    event OSAgentRunCompleted(uint256 indexed processId, uint256 indexed stepId, uint256 indexed requestId, RunStatus status, string result);

    constructor(
        address platform_,
        address processManager_,
        address feeVault_,
        uint256 llmAgentId_,
        uint256 websiteAgentId_,
        uint256 jsonAgentId_,
        uint256 subcommitteeSize_,
        uint256 llmPricePerAgent_,
        uint256 websitePricePerAgent_,
        uint256 jsonPricePerAgent_
    ) {
        require(platform_ != address(0) && processManager_ != address(0) && feeVault_ != address(0), "dependency required");
        require(subcommitteeSize_ > 0, "subcommittee required");
        platform = ISomniaAgentPlatformV2(platform_);
        processManager = ProcessManager(processManager_);
        feeVault = ProtocolFeeVault(feeVault_);
        llmAgentId = llmAgentId_;
        websiteAgentId = websiteAgentId_;
        jsonAgentId = jsonAgentId_;
        subcommitteeSize = subcommitteeSize_;
        llmPricePerAgent = llmPricePerAgent_;
        websitePricePerAgent = websitePricePerAgent_;
        jsonPricePerAgent = jsonPricePerAgent_;
    }

    function getRequiredDeposit(RunMode mode) public view returns (uint256) {
        uint256 price = llmPricePerAgent;
        if (mode == RunMode.Website) price = websitePricePerAgent;
        if (mode == RunMode.JSON) price = jsonPricePerAgent;
        return platform.getRequestDeposit() + price * subcommitteeSize;
    }

    function getTotalDue(RunMode mode) external view returns (uint256) {
        return getRequiredDeposit(mode) + feeVault.feeAmount();
    }

    function requestProcessAgentRun(
        uint256 processId,
        bytes32 capabilityId,
        string calldata appAgentId,
        string calldata task,
        string calldata constraints,
        string[] calldata urls,
        RunMode mode
    ) external payable returns (uint256 requestId) {
        require(bytes(appAgentId).length > 0, "agent required");
        require(bytes(task).length > 0, "task required");
        require(bytes(task).length <= 2800, "task too large");
        require(bytes(constraints).length <= 1600, "constraints too large");
        require(urls.length <= 3, "too many urls");

        uint256 deposit = getRequiredDeposit(mode);
        uint256 fee = feeVault.feeAmount();
        require(msg.value >= deposit + fee, "underfunded");
        feeVault.payFee{value: fee}(msg.sender, "process.step", processId, 0);

        uint256 somniaAgentId = _agentIdForMode(mode);
        string memory sourceUrl = urls.length > 0 ? urls[0] : "";
        bytes memory payload = _payloadForMode(mode, appAgentId, task, constraints, sourceUrl);
        requestId = platform.createRequest{value: deposit}(somniaAgentId, address(this), this.handleResponse.selector, payload);

        uint256 stepId = processManager.registerStep(msg.sender, processId, capabilityId, appAgentId, somniaAgentId, uint8(mode), requestId, task, sourceUrl, deposit + fee);
        pendingRequests[requestId] = true;
        runs[requestId] = RouterRun(processId, stepId, msg.sender, capabilityId, appAgentId, task, sourceUrl, somniaAgentId, mode, RunStatus.Pending, "");

        emit OSAgentRunRequested(processId, stepId, requestId, msg.sender, capabilityId, appAgentId, somniaAgentId, mode, task, sourceUrl, deposit, fee);

        if (msg.value > deposit + fee) {
            (bool ok,) = payable(msg.sender).call{value: msg.value - deposit - fee}("");
            require(ok, "refund failed");
        }
    }

    function handleResponse(uint256 requestId, Response[] memory responses, ResponseStatus status, Request memory) external {
        require(msg.sender == address(platform), "only platform");
        require(pendingRequests[requestId], "unknown request");
        delete pendingRequests[requestId];

        RouterRun storage run = runs[requestId];
        ProcessManager.StepStatus stepStatus;
        if (responses.length > 0 && responses[0].result.length > 0) {
            run.status = RunStatus.Success;
            run.result = abi.decode(responses[0].result, (string));
            stepStatus = ProcessManager.StepStatus.Success;
        } else if (status == ResponseStatus.TimedOut) {
            run.status = RunStatus.TimedOut;
            run.result = "Somnia Agent request timed out before validators reached a result.";
            stepStatus = ProcessManager.StepStatus.TimedOut;
        } else {
            run.status = RunStatus.Failed;
            run.result = "Somnia Agent request failed before producing a usable result.";
            stepStatus = ProcessManager.StepStatus.Failed;
        }

        processManager.completeStepFromRouter(requestId, stepStatus, run.result);
        emit OSAgentRunCompleted(run.processId, run.stepId, requestId, run.status, run.result);
    }

    function _agentIdForMode(RunMode mode) private view returns (uint256) {
        if (mode == RunMode.Website) return websiteAgentId;
        if (mode == RunMode.JSON) return jsonAgentId;
        return llmAgentId;
    }

    function _payloadForMode(RunMode mode, string calldata appAgentId, string calldata task, string calldata constraints, string memory url) private pure returns (bytes memory) {
        if (mode == RunMode.Website) {
            string[] memory options = new string[](0);
            return abi.encodeWithSelector(
                IWebsiteParserAgentV2.ExtractString.selector,
                "somniacos_result",
                string.concat("Extract and synthesize the useful answer for SomniacOS OS agent ", appAgentId, "."),
                options,
                string.concat("Task: ", task, "\nConstraints: ", constraints, "\nReturn the final visitor-facing answer."),
                url,
                false,
                uint8(3),
                uint8(60)
            );
        }
        if (mode == RunMode.JSON) {
            return abi.encodeWithSelector(IJsonApiAgentV2.fetchString.selector, url, constraints, uint8(60));
        }
        string[] memory allowedValues = new string[](0);
        string memory system = string.concat(
            "You are SomniacOS OS specialist ",
            appAgentId,
            ". Produce a direct final answer. No placeholder text. Include practical next steps when useful."
        );
        return abi.encodeWithSelector(ILLMInferenceAgentV2.inferString.selector, string.concat("Task: ", task, "\nConstraints: ", constraints), system, false, allowedValues);
    }

    receive() external payable {}
}
