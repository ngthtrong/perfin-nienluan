import AppIcon from './AppIcon';

const ICON_BY_EMOJI = {
  '🍜': 'restaurant',
  '🚗': 'directions-car',
  '🛍️': 'shopping-bag',
  '🛍': 'shopping-bag',
  '🎮': 'sports-esports',
  '🏥': 'local-hospital',
  '📚': 'school',
  '🏠': 'home',
  '📄': 'receipt',
  '🛒': 'local-grocery-store',
  '📱': 'phone-android',
  '⚽': 'sports-soccer',
  '💅': 'spa',
  '📦': 'inventory-2',
  '💰': 'payments',
  '🎁': 'card-giftcard',
  '📈': 'trending-up',
  '📁': 'category',
};

const ICON_BY_NAME = {
  'an uong': 'restaurant',
  'di chuyen': 'directions-car',
  'mua sam': 'shopping-bag',
  'giai tri': 'sports-esports',
  'suc khoe': 'local-hospital',
  'giao duc': 'school',
  'nha cua': 'home',
  'hoa don & dich vu': 'receipt',
  'hoa don dich vu': 'receipt',
  'tap hoa': 'local-grocery-store',
  'dien tu': 'phone-android',
  'the thao': 'sports-soccer',
  'lam dep': 'spa',
  'luong': 'payments',
  'thuong': 'card-giftcard',
  'dau tu': 'trending-up',
  'khac': 'inventory-2',
};

function normalizeName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function getCategoryIconName({ icon, name, type } = {}) {
  return ICON_BY_EMOJI[icon] || ICON_BY_NAME[normalizeName(name)] || (type === 'income' ? 'payments' : 'category');
}

export default function CategoryIcon({ icon, name, type, size = 20, color, style }) {
  return <AppIcon name={getCategoryIconName({ icon, name, type })} size={size} color={color} style={style} />;
}
