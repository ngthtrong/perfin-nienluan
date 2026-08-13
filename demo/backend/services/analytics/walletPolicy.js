// Vai trò: Xác định loại ví nào được tính vào số tiền có thể chi ngay của runway.
// Luồng chính: chỉ nhận ví VND dạng cash, bank hoặc e-wallet; loại tài sản, tiết kiệm và tín dụng.

const RUNWAY_CURRENCY = 'VND';
const RUNWAY_WALLET_TYPES = Object.freeze(['cash', 'bank', 'e_wallet']);
const RUNWAY_WALLET_TYPE_SET = new Set(RUNWAY_WALLET_TYPES);

function isRunwayEligibleWallet(wallet, { currency = RUNWAY_CURRENCY } = {}) {
  if (!wallet || typeof wallet !== 'object') return false;
  return RUNWAY_WALLET_TYPE_SET.has(wallet.type) && wallet.currency === currency;
}

// Chỉ cộng số dư của các ví thanh khoản đúng reporting currency khi tính runway.
function sumRunwayBalance(wallets, options = {}) {
  return (Array.isArray(wallets) ? wallets : [])
    .filter((wallet) => isRunwayEligibleWallet(wallet, options))
    .reduce((total, wallet) => {
      const balance = Number(wallet.balance);
      return Number.isFinite(balance) ? total + balance : total;
    }, 0);
}

module.exports = {
  RUNWAY_CURRENCY,
  RUNWAY_WALLET_TYPES,
  isRunwayEligibleWallet,
  sumRunwayBalance,
};
