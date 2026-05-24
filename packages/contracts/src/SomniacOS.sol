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
