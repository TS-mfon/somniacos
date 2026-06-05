// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SomniacFixedSupplyToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public immutable totalSupply;
    address public immutable owner;
    string public metadataURI;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed tokenOwner, address indexed spender, uint256 value);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address owner_,
        string memory metadataURI_
    ) {
        require(bytes(name_).length > 0, "name required");
        require(bytes(symbol_).length > 0, "symbol required");
        require(decimals_ <= 18, "decimals too high");
        require(initialSupply_ > 0, "supply required");
        require(owner_ != address(0), "owner required");

        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        owner = owner_;
        metadataURI = metadataURI_;
        totalSupply = initialSupply_;
        balanceOf[owner_] = initialSupply_;
        emit Transfer(address(0), owner_, initialSupply_);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) private {
        require(to != address(0), "zero recipient");
        require(balanceOf[from] >= value, "balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}

contract SomniacTokenFactory {
    event TokenCreated(
        address indexed token,
        address indexed owner,
        address indexed deployer,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        string metadataURI
    );

    address[] public allTokens;
    mapping(address => address[]) public tokensByOwner;
    mapping(address => bool) public isSomniacToken;

    function createToken(
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint256 initialSupply,
        address owner,
        string calldata metadataURI
    ) external returns (address token) {
        SomniacFixedSupplyToken created = new SomniacFixedSupplyToken(name, symbol, decimals, initialSupply, owner, metadataURI);
        token = address(created);
        allTokens.push(token);
        tokensByOwner[owner].push(token);
        isSomniacToken[token] = true;
        emit TokenCreated(token, owner, msg.sender, name, symbol, decimals, initialSupply, metadataURI);
    }

    function allTokensLength() external view returns (uint256) {
        return allTokens.length;
    }

    function tokensByOwnerLength(address owner) external view returns (uint256) {
        return tokensByOwner[owner].length;
    }
}
