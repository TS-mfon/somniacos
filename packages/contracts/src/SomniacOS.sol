// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct Agent {
        address owner;
        address wallet;
        string metadataURI;
        string skills;
        bool active;
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) public agents;

    event AgentCreated(uint256 indexed agentId, address indexed owner, address indexed wallet, string metadataURI, string skills);
    event AgentUpdated(uint256 indexed agentId, string metadataURI, string skills, bool active);

    function createAgent(address wallet, string calldata metadataURI, string calldata skills) external returns (uint256 agentId) {
        require(wallet != address(0), "wallet required");
        agentId = nextAgentId++;
        agents[agentId] = Agent(msg.sender, wallet, metadataURI, skills, true);
        emit AgentCreated(agentId, msg.sender, wallet, metadataURI, skills);
    }

    function updateAgent(uint256 agentId, string calldata metadataURI, string calldata skills, bool active) external {
        require(agents[agentId].owner == msg.sender, "not owner");
        agents[agentId].metadataURI = metadataURI;
        agents[agentId].skills = skills;
        agents[agentId].active = active;
        emit AgentUpdated(agentId, metadataURI, skills, active);
    }
}

contract OrganizationRegistry {
    struct Organization {
        address owner;
        string metadataURI;
        uint256 treasuryId;
        bool active;
    }

    uint256 public nextOrganizationId = 1;
    mapping(uint256 => Organization) public organizations;
    mapping(uint256 => mapping(uint256 => string)) public memberRoles;

    event OrganizationCreated(uint256 indexed organizationId, address indexed owner, string metadataURI);
    event OrganizationMemberSet(uint256 indexed organizationId, uint256 indexed agentId, string role);

    function createOrganization(string calldata metadataURI) external returns (uint256 organizationId) {
        organizationId = nextOrganizationId++;
        organizations[organizationId] = Organization(msg.sender, metadataURI, 0, true);
        emit OrganizationCreated(organizationId, msg.sender, metadataURI);
    }

    function setMember(uint256 organizationId, uint256 agentId, string calldata role) external {
        require(organizations[organizationId].owner == msg.sender, "not owner");
        memberRoles[organizationId][agentId] = role;
        emit OrganizationMemberSet(organizationId, agentId, role);
    }
}

contract Marketplace {
    enum TaskStatus { Open, Assigned, Completed, Cancelled }

    struct Task {
        address creator;
        uint256 budget;
        string metadataURI;
        TaskStatus status;
        uint256 providerAgentId;
    }

    uint256 public nextTaskId = 1;
    mapping(uint256 => Task) public tasks;

    event TaskPosted(uint256 indexed taskId, address indexed creator, uint256 budget, string metadataURI);
    event ProposalSubmitted(uint256 indexed taskId, uint256 indexed providerAgentId, uint256 price, string termsURI);
    event AgentHired(uint256 indexed taskId, uint256 indexed providerAgentId, uint256 price);
    event TaskCompleted(uint256 indexed taskId, uint256 indexed providerAgentId);

    function postTask(uint256 budget, string calldata metadataURI) external returns (uint256 taskId) {
        taskId = nextTaskId++;
        tasks[taskId] = Task(msg.sender, budget, metadataURI, TaskStatus.Open, 0);
        emit TaskPosted(taskId, msg.sender, budget, metadataURI);
    }

    function submitProposal(uint256 taskId, uint256 providerAgentId, uint256 price, string calldata termsURI) external {
        require(tasks[taskId].status == TaskStatus.Open, "not open");
        emit ProposalSubmitted(taskId, providerAgentId, price, termsURI);
    }

    function hire(uint256 taskId, uint256 providerAgentId, uint256 price) external {
        Task storage task = tasks[taskId];
        require(task.creator == msg.sender, "not creator");
        require(task.status == TaskStatus.Open, "not open");
        task.status = TaskStatus.Assigned;
        task.providerAgentId = providerAgentId;
        emit AgentHired(taskId, providerAgentId, price);
    }

    function complete(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.creator == msg.sender, "not creator");
        task.status = TaskStatus.Completed;
        emit TaskCompleted(taskId, task.providerAgentId);
    }
}

contract NegotiationRegistry {
    enum Status { Open, Countered, Accepted, Rejected, Escrowed, Completed }

    struct Negotiation {
        uint256 taskId;
        uint256 buyerAgentId;
        uint256 sellerAgentId;
        uint256 price;
        uint256 deadline;
        string termsURI;
        Status status;
    }

    uint256 public nextNegotiationId = 1;
    mapping(uint256 => Negotiation) public negotiations;

    event NegotiationOpened(uint256 indexed negotiationId, uint256 indexed taskId, uint256 buyerAgentId, uint256 sellerAgentId);
    event NegotiationUpdated(uint256 indexed negotiationId, uint256 price, uint256 deadline, string termsURI, Status status);

    function open(uint256 taskId, uint256 buyerAgentId, uint256 sellerAgentId, uint256 price, uint256 deadline, string calldata termsURI) external returns (uint256 negotiationId) {
        negotiationId = nextNegotiationId++;
        negotiations[negotiationId] = Negotiation(taskId, buyerAgentId, sellerAgentId, price, deadline, termsURI, Status.Open);
        emit NegotiationOpened(negotiationId, taskId, buyerAgentId, sellerAgentId);
    }

    function update(uint256 negotiationId, uint256 price, uint256 deadline, string calldata termsURI, Status status) external {
        Negotiation storage item = negotiations[negotiationId];
        item.price = price;
        item.deadline = deadline;
        item.termsURI = termsURI;
        item.status = status;
        emit NegotiationUpdated(negotiationId, price, deadline, termsURI, status);
    }
}

contract Escrow {
    enum Status { Funded, Released, Cancelled, Disputed }

    struct Deal {
        address payer;
        address payable payee;
        uint256 taskId;
        uint256 amount;
        Status status;
    }

    uint256 public nextDealId = 1;
    mapping(uint256 => Deal) public deals;

    event PaymentEscrowed(uint256 indexed dealId, uint256 indexed taskId, address indexed payer, address payee, uint256 amount);
    event PaymentReleased(uint256 indexed dealId, uint256 amount);
    event DisputeOpened(uint256 indexed dealId, string reasonURI);

    function fund(uint256 taskId, address payable payee) external payable returns (uint256 dealId) {
        require(msg.value > 0, "value required");
        dealId = nextDealId++;
        deals[dealId] = Deal(msg.sender, payee, taskId, msg.value, Status.Funded);
        emit PaymentEscrowed(dealId, taskId, msg.sender, payee, msg.value);
    }

    function release(uint256 dealId) external {
        Deal storage deal = deals[dealId];
        require(deal.payer == msg.sender, "not payer");
        require(deal.status == Status.Funded, "not funded");
        deal.status = Status.Released;
        deal.payee.transfer(deal.amount);
        emit PaymentReleased(dealId, deal.amount);
    }

    function dispute(uint256 dealId, string calldata reasonURI) external {
        Deal storage deal = deals[dealId];
        require(deal.payer == msg.sender || deal.payee == msg.sender, "not party");
        deal.status = Status.Disputed;
        emit DisputeOpened(dealId, reasonURI);
    }
}

contract Reputation {
    struct Score {
        int256 reliability;
        int256 quality;
        int256 speed;
        int256 honesty;
        int256 profitability;
        int256 collaboration;
        int256 security;
    }

    mapping(uint256 => Score) public scores;
    event ReputationUpdated(uint256 indexed agentId, int256 reliability, int256 quality, int256 speed, int256 honesty, int256 profitability, int256 collaboration, int256 security, string reasonURI);

    function update(uint256 agentId, Score calldata delta, string calldata reasonURI) external {
        Score storage score = scores[agentId];
        score.reliability += delta.reliability;
        score.quality += delta.quality;
        score.speed += delta.speed;
        score.honesty += delta.honesty;
        score.profitability += delta.profitability;
        score.collaboration += delta.collaboration;
        score.security += delta.security;
        emit ReputationUpdated(agentId, delta.reliability, delta.quality, delta.speed, delta.honesty, delta.profitability, delta.collaboration, delta.security, reasonURI);
    }
}

contract SubscriptionManager {
    struct Subscription {
        address payer;
        address provider;
        uint256 amount;
        uint256 cadence;
        string termsURI;
        bool active;
    }

    uint256 public nextSubscriptionId = 1;
    mapping(uint256 => Subscription) public subscriptions;

    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed payer, address indexed provider, uint256 amount, uint256 cadence, string termsURI);
    event SubscriptionCancelled(uint256 indexed subscriptionId);

    function create(address provider, uint256 amount, uint256 cadence, string calldata termsURI) external returns (uint256 subscriptionId) {
        subscriptionId = nextSubscriptionId++;
        subscriptions[subscriptionId] = Subscription(msg.sender, provider, amount, cadence, termsURI, true);
        emit SubscriptionCreated(subscriptionId, msg.sender, provider, amount, cadence, termsURI);
    }

    function cancel(uint256 subscriptionId) external {
        require(subscriptions[subscriptionId].payer == msg.sender, "not payer");
        subscriptions[subscriptionId].active = false;
        emit SubscriptionCancelled(subscriptionId);
    }
}

contract Treasury {
    mapping(uint256 => uint256) public balances;
    mapping(uint256 => mapping(uint256 => uint256)) public agentBudgets;

    event TreasuryFunded(uint256 indexed organizationId, address indexed funder, uint256 amount);
    event BudgetSet(uint256 indexed organizationId, uint256 indexed agentId, uint256 amount);
    event TreasurySpent(uint256 indexed organizationId, address indexed recipient, uint256 amount, string reasonURI);

    function fund(uint256 organizationId) external payable {
        balances[organizationId] += msg.value;
        emit TreasuryFunded(organizationId, msg.sender, msg.value);
    }

    function setBudget(uint256 organizationId, uint256 agentId, uint256 amount) external {
        agentBudgets[organizationId][agentId] = amount;
        emit BudgetSet(organizationId, agentId, amount);
    }

    function spend(uint256 organizationId, address payable recipient, uint256 amount, string calldata reasonURI) external {
        require(balances[organizationId] >= amount, "insufficient");
        balances[organizationId] -= amount;
        recipient.transfer(amount);
        emit TreasurySpent(organizationId, recipient, amount, reasonURI);
    }
}

contract Governance {
    enum ProposalStatus { Open, Executed, Rejected }

    struct Proposal {
        uint256 organizationId;
        string metadataURI;
        uint256 yesVotes;
        uint256 noVotes;
        ProposalStatus status;
    }

    uint256 public nextProposalId = 1;
    mapping(uint256 => Proposal) public proposals;

    event GovernanceProposalCreated(uint256 indexed proposalId, uint256 indexed organizationId, string metadataURI);
    event GovernanceVoteCast(uint256 indexed proposalId, uint256 indexed agentId, bool support);
    event GovernanceProposalExecuted(uint256 indexed proposalId);

    function propose(uint256 organizationId, string calldata metadataURI) external returns (uint256 proposalId) {
        proposalId = nextProposalId++;
        proposals[proposalId] = Proposal(organizationId, metadataURI, 0, 0, ProposalStatus.Open);
        emit GovernanceProposalCreated(proposalId, organizationId, metadataURI);
    }

    function vote(uint256 proposalId, uint256 agentId, bool support) external {
        if (support) proposals[proposalId].yesVotes++; else proposals[proposalId].noVotes++;
        emit GovernanceVoteCast(proposalId, agentId, support);
    }

    function execute(uint256 proposalId) external {
        require(proposals[proposalId].yesVotes > proposals[proposalId].noVotes, "not passed");
        proposals[proposalId].status = ProposalStatus.Executed;
        emit GovernanceProposalExecuted(proposalId);
    }
}

contract PartnershipRegistry {
    event PartnershipCreated(uint256 indexed partnershipId, uint256 indexed agentA, uint256 indexed agentB, string termsURI);
    uint256 public nextPartnershipId = 1;

    function create(uint256 agentA, uint256 agentB, string calldata termsURI) external returns (uint256 partnershipId) {
        partnershipId = nextPartnershipId++;
        emit PartnershipCreated(partnershipId, agentA, agentB, termsURI);
    }
}

contract WorldEventRegistry {
    event WorldEventRecorded(bytes32 indexed eventId, string kind, string metadataURI);

    function record(bytes32 eventId, string calldata kind, string calldata metadataURI) external {
        emit WorldEventRecorded(eventId, kind, metadataURI);
    }
}

interface ISomniaAgentPlatform {
    function createRequest(uint256 agentId, address callbackAddress, bytes4 callbackSelector, bytes calldata payload) external payable returns (uint256 requestId);
    function getRequestDeposit() external view returns (uint256);
}

interface ILLMInferenceAgent {
    function inferString(string calldata prompt, string calldata system, bool chainOfThought, string[] calldata allowedValues) external returns (string memory response);
    function inferChat(string[] calldata roles, string[] calldata messages, bool chainOfThought) external returns (string memory response);
}

interface IWebsiteParserAgent {
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

contract SomniacAgentRouter {
    enum RunStatus { None, Pending, Success, Failed, TimedOut }
    enum RunMode { LLM, Website }
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

    struct AgentRun {
        address user;
        string appAgentId;
        string task;
        string constraints;
        string url;
        uint256 somniaAgentId;
        RunMode mode;
        RunStatus status;
        string result;
        uint256 createdAt;
        uint256 completedAt;
    }

    ISomniaAgentPlatform public immutable platform;
    uint256 public immutable llmAgentId;
    uint256 public immutable websiteAgentId;
    uint256 public immutable subcommitteeSize;
    uint256 public immutable llmPricePerAgent;
    uint256 public immutable websitePricePerAgent;

    mapping(uint256 => AgentRun) private runs;
    mapping(uint256 => bool) public pendingRequests;
    uint256[] public requestIds;

    event AgentRunRequested(
        uint256 indexed requestId,
        address indexed user,
        string appAgentId,
        uint256 indexed somniaAgentId,
        RunMode mode,
        string task,
        string url,
        uint256 deposit
    );
    event AgentRunCompleted(uint256 indexed requestId, address indexed user, string appAgentId, RunStatus status, string result);

    constructor(
        address platform_,
        uint256 llmAgentId_,
        uint256 websiteAgentId_,
        uint256 subcommitteeSize_,
        uint256 llmPricePerAgent_,
        uint256 websitePricePerAgent_
    ) {
        require(platform_ != address(0), "platform required");
        require(subcommitteeSize_ > 0, "subcommittee required");
        platform = ISomniaAgentPlatform(platform_);
        llmAgentId = llmAgentId_;
        websiteAgentId = websiteAgentId_;
        subcommitteeSize = subcommitteeSize_;
        llmPricePerAgent = llmPricePerAgent_;
        websitePricePerAgent = websitePricePerAgent_;
    }

    function getRequiredDeposit(RunMode mode) public view returns (uint256) {
        uint256 price = mode == RunMode.Website ? websitePricePerAgent : llmPricePerAgent;
        return platform.getRequestDeposit() + price * subcommitteeSize;
    }

    function getRequestCount() external view returns (uint256) {
        return requestIds.length;
    }

    function getRun(uint256 requestId) external view returns (
        address user,
        string memory appAgentId,
        string memory task,
        string memory constraints,
        string memory url,
        uint256 somniaAgentId,
        RunMode mode,
        RunStatus status,
        string memory result,
        uint256 createdAt,
        uint256 completedAt
    ) {
        AgentRun storage run = runs[requestId];
        return (run.user, run.appAgentId, run.task, run.constraints, run.url, run.somniaAgentId, run.mode, run.status, run.result, run.createdAt, run.completedAt);
    }

    function requestAgentRun(
        string calldata appAgentId,
        string calldata task,
        string calldata constraints,
        string[] calldata urls
    ) external payable returns (uint256 requestId) {
        require(bytes(appAgentId).length > 0, "agent required");
        require(bytes(task).length > 0, "task required");
        require(bytes(task).length <= 2800, "task too large");
        require(bytes(constraints).length <= 1600, "constraints too large");
        require(urls.length <= 3, "too many urls");

        RunMode mode = urls.length > 0 && bytes(urls[0]).length > 0 ? RunMode.Website : RunMode.LLM;
        uint256 deposit = getRequiredDeposit(mode);
        require(msg.value >= deposit, "underfunded");

        uint256 somniaAgentId = mode == RunMode.Website ? websiteAgentId : llmAgentId;
        bytes memory payload = mode == RunMode.Website
            ? _websitePayload(appAgentId, task, constraints, urls[0])
            : _llmPayload(appAgentId, task, constraints);

        string memory sourceUrl = mode == RunMode.Website ? urls[0] : "";
        requestId = platform.createRequest{value: deposit}(somniaAgentId, address(this), this.handleResponse.selector, payload);
        pendingRequests[requestId] = true;
        requestIds.push(requestId);

        AgentRun storage run = runs[requestId];
        run.user = msg.sender;
        run.appAgentId = appAgentId;
        run.task = task;
        run.constraints = constraints;
        run.url = sourceUrl;
        run.somniaAgentId = somniaAgentId;
        run.mode = mode;
        run.status = RunStatus.Pending;
        run.createdAt = block.timestamp;

        emit AgentRunRequested(requestId, msg.sender, appAgentId, somniaAgentId, mode, task, sourceUrl, deposit);

        if (msg.value > deposit) {
            (bool ok,) = payable(msg.sender).call{value: msg.value - deposit}("");
            require(ok, "refund failed");
        }
    }

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        require(msg.sender == address(platform), "only platform");
        require(pendingRequests[requestId], "unknown request");
        delete pendingRequests[requestId];

        AgentRun storage run = runs[requestId];
        run.completedAt = block.timestamp;

        if (responses.length > 0 && responses[0].result.length > 0) {
            run.status = RunStatus.Success;
            run.result = abi.decode(responses[0].result, (string));
        } else if (status == ResponseStatus.TimedOut) {
            run.status = RunStatus.TimedOut;
            run.result = "Somnia Agent request timed out before validators reached a result.";
        } else {
            run.status = RunStatus.Failed;
            run.result = "Somnia Agent request failed before producing a usable result.";
        }

        emit AgentRunCompleted(requestId, run.user, run.appAgentId, run.status, run.result);
    }

    function _llmPayload(string calldata appAgentId, string calldata task, string calldata constraints) private pure returns (bytes memory) {
        string[] memory allowedValues = new string[](0);
        string memory system = string.concat(
            "You are SomniacOS specialist agent ",
            appAgentId,
            ". Produce a direct, useful final answer for the visitor. No markdown tables. No placeholder text. If writing social content, make it publish-ready."
        );
        string memory prompt = string.concat("Task: ", task, "\nConstraints: ", constraints);

        return abi.encodeWithSelector(ILLMInferenceAgent.inferString.selector, prompt, system, false, allowedValues);
    }

    function _websitePayload(string calldata appAgentId, string calldata task, string calldata constraints, string calldata url) private pure returns (bytes memory) {
        string[] memory options = new string[](0);
        return abi.encodeWithSelector(
            IWebsiteParserAgent.ExtractString.selector,
            "somniacos_result",
            string.concat("Extract and synthesize the useful answer for SomniacOS agent ", appAgentId, "."),
            options,
            string.concat("Task: ", task, "\nConstraints: ", constraints, "\nReturn the final visitor-facing answer."),
            url,
            false,
            uint8(3),
            uint8(60)
        );
    }

    receive() external payable {}
}
