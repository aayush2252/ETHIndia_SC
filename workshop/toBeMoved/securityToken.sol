pragma solidity >=0.4.21 <0.6.0;
import "./SafeMath.sol";
import "./Ownable.sol";
contract SecurityToken is Ownable {
    using SafeMath for uint256;
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _frozenBalances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    // time End for regulation 4a7 or 144 to apply
    uint256 public timeEnd;
    // This is to comply with 12g1
    uint256 public maxInvestorCount;
    
    
    mapping(address => bool) public whiteListedInvestors;
    
    mapping(address => TransferRequest) public pendingTransfers;
    uint256 public currentInvestorCount;
    uint256 public transferTimeOut;
    struct TransferRequest {
        uint256 tokenCount;
        address to;
        bool isIssuerApproved;
        bool isBrokerApproved;
        uint256 startTime;
    }
    event ForceTransfer(address indexed _controller, address indexed _from, address indexed _to, uint256 _value, bool _verifyTransfer, bytes _data);
    event Minted(address indexed _to, uint256 _value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event ModifiedBrokerDealerStatus(address indexed brokerDealer, bool status);
    event CreatedTransferRequest(address indexed _from, address indexed _to, uint256 _value);
    event ResetTransferRequest(address indexed _from, address indexed _to, uint256 _value);
    modifier isAdmin() {
        require(msg.sender == owner() , "Not an admin");
        _;
    }

    constructor(string memory name, string memory symbol, uint8 decimals)
        public
    {
         _name = name;
        _symbol = symbol;
        _decimals = decimals;
    }
    modifier timeBoundCheck() {
        require(now > timeEnd, "Less than reg time. Transfer blocked");
        _;
    }

    function addToWhitelist(address[] calldata investors) external isAdmin {
        for (uint256 index = 0; index < investors.length; index++) {
            require(currentInvestorCount + 1 < maxInvestorCount, "Too many people");
            whiteListedInvestors[investors[index]] = true;
            currentInvestorCount += 1;
        }
    }
    function removeFromWhitelist(address[] calldata investors) external isAdmin {
        for (uint256 index = 0; index < investors.length; index++) {
            whiteListedInvestors[investors[index]] = false;
            currentInvestorCount -= 1;
        }
    }
    function approveTransfer(address _investor) external isAdmin {
        TransferRequest storage request = pendingTransfers[_investor];
        require(request.tokenCount > 0, "No transfer pending");
        require(now - request.startTime <= transferTimeOut, "Time out");
        if (msg.sender == owner()) {
            require(!request.isIssuerApproved, "Already approved");
            require(request.isBrokerApproved, "Broker hasn't approved yet");
            request.isIssuerApproved = true;
        }
        if (request.isIssuerApproved && request.isBrokerApproved) {
            uint256 tokenAmount = request.tokenCount;
            address toAddress = request.to;
            _frozenBalances[_investor] = _frozenBalances[_investor].sub(tokenAmount);
            request.isIssuerApproved = false;
            request.isBrokerApproved = false;
            request.tokenCount = 0;
            request.to = address(0);
            _transfer(_investor, toAddress, tokenAmount);
        }
    }
    function rejectTransfer(address _investor) external isAdmin {
        TransferRequest storage request = pendingTransfers[_investor];
        require(request.tokenCount > 0, "No transfer pending");
        _frozenBalances[_investor] = _frozenBalances[_investor].sub(request.tokenCount);
        request.isIssuerApproved = false;
        request.isBrokerApproved = false;
        request.tokenCount = 0;
        request.to = address(0);
    }
    function transfer(address _to, uint256 _value) public timeBoundCheck returns (bool) {
        require(_verifyTransfer(msg.sender, _to, _value, true), "Transfer invalid");
        // require(transferInternal(_to, _value));
        _transfer(msg.sender, _to, _value);
        return true;
    }
    function transferFrom(address _from, address _to, uint256 _value) public timeBoundCheck returns (bool) {
        require(_verifyTransfer(_from, _to, _value, true), "Transfer invalid");
        // require(transferFromInternal(_from, _to, _value));
        return true;
    }
    function verifyTransfer(address _from, address _to, uint256 _value) public returns (bool) {
        return _verifyTransfer(_from, _to, _value, false);
    }
    
    function transferFromWithData(address _from, address _to, uint _value, bytes memory data)public {
        _verifyTransfer(_from,_to,_value, true);
        require(_from != address(0), "ERC20: transfer from the zero address");
        require(_to != address(0), "ERC20: transfer to the zero address");
        _balances[_from] = _balances[_from].sub(_value);
        _balances[_to] = _balances[_to].add(_value);
        emit Transfer(_from, _to, _value);
        
    }
    function mint(address _investor, uint256 _value) public onlyOwner returns (bool success) {
        require(_investor != address(0), "Investor is 0");
        require(_verifyTransfer(address(0), _investor, _value, false), "Transfer invalid");
        _totalSupply = _totalSupply.add(_value);
        _balances[_investor] = balanceOf(_investor).add(_value);
        emit Minted(_investor, _value);
        emit Transfer(address(0), _investor, _value);
        return true;
    }
    function forceTransfer(address _from, address _to, uint256 _value, bytes memory _log) public onlyOwner {
        require(_to != address(0));
        require(_value <= balanceOf(_from), "can't transfer more");
        bool verified = _verifyTransfer(_from, _to, _value, true);
        _balances[_from] = balanceOf(_from).sub(_value);
        _balances[_to] = balanceOf(_to).add(_value);
        emit ForceTransfer(msg.sender, _from, _to, _value, verified, _log);
        emit Transfer(_from, _to, _value);
    }
    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue));
        return true;
    }
    function approve(address spender, uint256 value) public returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }
    function name() public view returns (string memory) {
        return _name;
    }
    function symbol() public view returns (string memory) {
        return _symbol;
    }
    function decimals() public view returns (uint8) {
        return _decimals;
    }
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    function frozenBalanceOf(address account) public view returns (uint256) {
        return _frozenBalances[account];
    }
    function transferableBalanceOf(address account) public view returns (uint256) {
        return _balances[account].sub(_frozenBalances[account]);
    }
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }
    function _verifyTransfer(address _from, address _to, uint256 _value, bool _isTransfer) internal returns (bool) {
        require(whiteListedInvestors[_to] , "Not whitelisted");
        if (_from != address(0)) {
            require(whiteListedInvestors[_from] , "Not whitelisted");
        }

        
        return true;
    }
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");
        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    function _burn(address account, uint256 value) internal {
        require(account != address(0), "ERC20: burn from the zero address");
        _totalSupply = _totalSupply.sub(value);
        _balances[account] = _balances[account].sub(value);
        emit Transfer(account, address(0), value);
    }
    function _approve(address owner, address spender, uint256 value) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }
    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(account, msg.sender, _allowances[account][msg.sender].sub(amount));
    }
}