pragma solidity >=0.4.18 <0.6.0;
import "./SafeMath.sol";
import "./Ownable.sol";
contract securityToken is Ownable {
    using SafeMath for uint256;
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _frozenBalances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    // time End for regulation 4a7 or 144 to apply
    uint256 public timeEnd= now + 1 minutes;
    // This is to comply with 12g1
    uint256 public maxInvestorCount;
    address private admin;
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
        require(msg.sender == owner());
        _;
    }

    function securityToken(string name, string symbol, uint8 decimals)
        public
    {  
       
        _totalSupply = 21 * (10 ** 24);

         _name = name;
        _symbol = symbol;
        _decimals = decimals;
        _balances[msg.sender] = _totalSupply;
        admin = msg.sender;
        
    }
    modifier timeBoundCheck() {
        //require(now > timeEnd);
        _;
    }

    function addToWhitelist(address[] investors) external isAdmin {
        for (uint256 index = 0; index < investors.length; index++) {
            //require(currentInvestorCount + 1 < maxInvestorCount);
            whiteListedInvestors[investors[index]] = true;
            currentInvestorCount += 1;
        }
    }
    function removeFromWhitelist(address[] investors) external isAdmin {
        for (uint256 index = 0; index < investors.length; index++) {
            whiteListedInvestors[investors[index]] = false;
            currentInvestorCount -= 1;
        }
    }
    function approveTransfer(address _investor) external isAdmin {
        TransferRequest storage request = pendingTransfers[_investor];
        require(request.tokenCount > 0);
        require(now - request.startTime <= transferTimeOut);
        if (msg.sender == owner()) {
            require(!request.isIssuerApproved);
            require(request.isBrokerApproved);
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
        require(request.tokenCount > 0);
        _frozenBalances[_investor] = _frozenBalances[_investor].sub(request.tokenCount);
        request.isIssuerApproved = false;
        request.isBrokerApproved = false;
        request.tokenCount = 0;
        request.to = address(0);
    }
    function transfer(address _to, uint256 _value) public timeBoundCheck returns (bool) {
        require(msg.sender == admin || _verifyTransfer(msg.sender, _to, _value, true));
        // require(transferInternal(_to, _value));
        _transfer(msg.sender, _to, _value);
        return true;
    }
    function transferFrom(address _from, address _to, uint256 _value) public timeBoundCheck returns (bool) {
        require(_verifyTransfer(_from, _to, _value, true));
        // require(transferFromInternal(_from, _to, _value));
        transferFromWithData(_from,_to,_value);
        return true;
    }
    function verifyTransfer(address _from, address _to, uint256 _value) public returns (bool) {
        return _verifyTransfer(_from, _to, _value, false);
    }
    
    function transferFromWithData(address _from, address _to, uint _value)public {
        _verifyTransfer(_from,_to,_value, true);
        require(_from != address(0));
        require(_to != address(0));
        _balances[_from] = _balances[_from].sub(_value);
        _balances[_to] = _balances[_to].add(_value);
        // _allowances[_from][msg.sender] = _allowances[_from][msg.sender].sub(_value);
         Transfer(_from, _to, _value);
        
    }
    function mint(address _investor, uint256 _value) public onlyOwner returns (bool success) {
        require(_investor != address(0));
        require(_verifyTransfer(address(0), _investor, _value, false));
        _totalSupply = _totalSupply.add(_value);
        _balances[_investor] = balanceOf(_investor).add(_value);
         Minted(_investor, _value);
         Transfer(address(0), _investor, _value);
        return true;
    }
    function forceTransfer(address _from, address _to, uint256 _value, bytes _log) public onlyOwner {
        require(_to != address(0));
        require(_value <= balanceOf(_from));
        bool verified = _verifyTransfer(_from, _to, _value, true);
        _balances[_from] = balanceOf(_from).sub(_value);
        _balances[_to] = balanceOf(_to).add(_value);
         ForceTransfer(msg.sender, _from, _to, _value, verified, _log);
         Transfer(_from, _to, _value);
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
        //require(whiteListedInvestors[_to] );
        if (_from != address(0)) {
            require(whiteListedInvestors[_from]);
        }

        
        return true;
    }
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0));
        require(recipient != address(0));
        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
         Transfer(sender, recipient, amount);
    }
    function _mint(address account, uint256 amount) internal {
        require(account != address(0));
        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
         Transfer(address(0), account, amount);
    }
    function _burn(address account, uint256 value) internal {
        require(account != address(0));
        _totalSupply = _totalSupply.sub(value);
        _balances[account] = _balances[account].sub(value);
         Transfer(account, address(0), value);
    }
    function _approve(address owner, address spender, uint256 value) internal {
        require(owner != address(0));
        require(spender != address(0));
        _allowances[owner][spender] = value;
         Approval(owner, spender, value);
    }
    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(account, msg.sender, _allowances[account][msg.sender].sub(amount));
    }
}