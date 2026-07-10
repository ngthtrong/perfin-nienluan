const GOAL_TYPES = new Set(['saving', 'purchase', 'debt_payoff']);
const GOAL_STATUSES = new Set(['active', 'achieved', 'paused', 'cancelled']);
const MAX_MONEY = 9_999_999_999_999.99; // DECIMAL(15,2)
const MAX_INTEREST_RATE = 999.999; // DECIMAL(6,3)

const BASE_FIELDS = new Set([
  'name',
  'goal_type',
  'target_amount',
  'current_amount',
  'target_date',
  'monthly_contribution',
  'annual_interest_rate',
  'linked_wallet_id',
  'note',
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseMoney(value, field, { positive = false } = {}) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') {
    return { error: `${field} phải là một số${positive ? ' lớn hơn 0' : ' không âm'}` };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { error: `${field} phải là số hữu hạn` };
  if ((positive && parsed <= 0) || (!positive && parsed < 0)) {
    return { error: `${field} phải ${positive ? 'lớn hơn 0' : 'không âm'}` };
  }
  if (parsed > MAX_MONEY) return { error: `${field} vượt quá giới hạn lưu trữ` };
  return { value: parsed };
}

function parseDateOnly(value, field) {
  if (value === null || value === '') return { value: null };
  if (typeof value !== 'string') return { error: `${field} phải có định dạng YYYY-MM-DD` };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { error: `${field} phải có định dạng YYYY-MM-DD` };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return { error: `${field} không phải ngày hợp lệ` };
  }
  return { value };
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function validateGoalPayload(payload, { mode = 'create', existing = null, today = new Date() } = {}) {
  const errors = [];
  const value = {};
  const allowed = new Set(BASE_FIELDS);
  if (mode === 'update') allowed.add('status');

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { value, errors: ['Dữ liệu mục tiêu phải là một object JSON'] };
  }
  if (!['create', 'plan', 'update'].includes(mode)) {
    throw new RangeError(`Unsupported validation mode: ${mode}`);
  }

  const keys = Object.keys(payload);
  for (const key of keys) {
    if (!allowed.has(key)) errors.push(`Trường không được hỗ trợ: ${key}`);
  }

  const requireName = mode === 'create';
  if (hasOwn(payload, 'name')) {
    if (typeof payload.name !== 'string') {
      errors.push('name phải là chuỗi');
    } else {
      const name = payload.name.trim();
      if (!name) errors.push('name không được để trống');
      else if (name.length > 150) errors.push('name không được dài quá 150 ký tự');
      else value.name = name;
    }
  } else if (requireName) {
    errors.push('Thiếu name');
  }

  if (hasOwn(payload, 'goal_type')) {
    if (!GOAL_TYPES.has(payload.goal_type)) {
      errors.push(`goal_type phải là một trong: ${[...GOAL_TYPES].join(', ')}`);
    } else {
      value.goal_type = payload.goal_type;
    }
  }

  const requireTarget = mode === 'create' || mode === 'plan';
  if (hasOwn(payload, 'target_amount')) {
    const parsed = parseMoney(payload.target_amount, 'target_amount', { positive: true });
    if (parsed.error) errors.push(parsed.error);
    else value.target_amount = parsed.value;
  } else if (requireTarget) {
    errors.push('Thiếu target_amount');
  }

  for (const field of ['current_amount', 'monthly_contribution']) {
    if (!hasOwn(payload, field)) continue;
    if (field === 'monthly_contribution' && payload[field] === null) {
      value[field] = null;
      continue;
    }
    const parsed = parseMoney(payload[field], field);
    if (parsed.error) errors.push(parsed.error);
    else value[field] = parsed.value;
  }

  if (hasOwn(payload, 'annual_interest_rate')) {
    const rate = payload.annual_interest_rate;
    if (rate === null) {
      // Function-calling uses null for an omitted optional rate; normalize it to
      // the same zero-interest default used by the database.
      value.annual_interest_rate = 0;
    } else if (rate === '' || rate === undefined || typeof rate === 'boolean') {
      errors.push('annual_interest_rate phải là số không âm');
    } else {
      const parsed = Number(rate);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_INTEREST_RATE) {
        errors.push(`annual_interest_rate phải từ 0 đến ${MAX_INTEREST_RATE}`);
      } else {
        value.annual_interest_rate = parsed;
      }
    }
  }

  if (hasOwn(payload, 'target_date')) {
    const parsed = parseDateOnly(payload.target_date, 'target_date');
    if (parsed.error) {
      errors.push(parsed.error);
    } else {
      value.target_date = parsed.value;
      if (parsed.value) {
        const deadline = dateOnly(parsed.value);
        const currentDay = dateOnly(today);
        if (currentDay && deadline < currentDay) errors.push('target_date không được nằm trong quá khứ');
      }
    }
  }

  if (hasOwn(payload, 'linked_wallet_id')) {
    if (payload.linked_wallet_id === null) {
      value.linked_wallet_id = null;
    } else {
      const walletId = Number(payload.linked_wallet_id);
      if (!Number.isInteger(walletId) || walletId <= 0) errors.push('linked_wallet_id phải là số nguyên dương hoặc null');
      else value.linked_wallet_id = walletId;
    }
  }

  if (hasOwn(payload, 'note')) {
    if (payload.note === null) value.note = null;
    else if (typeof payload.note !== 'string') errors.push('note phải là chuỗi hoặc null');
    else if (payload.note.length > 5000) errors.push('note không được dài quá 5000 ký tự');
    else value.note = payload.note.trim() || null;
  }

  if (hasOwn(payload, 'status')) {
    if (!GOAL_STATUSES.has(payload.status)) {
      errors.push(`status phải là một trong: ${[...GOAL_STATUSES].join(', ')}`);
    } else {
      value.status = payload.status;
    }
  }

  const effective = { ...(existing || {}), ...value };
  const effectiveType = effective.goal_type || 'saving';
  if (effectiveType !== 'debt_payoff' && Number(effective.annual_interest_rate || 0) > 0) {
    errors.push('annual_interest_rate chỉ áp dụng cho goal_type debt_payoff');
  }

  const recognizedKeys = keys.filter((key) => allowed.has(key));
  if (mode === 'update' && recognizedKeys.length === 0) errors.push('Không có trường hợp lệ để cập nhật');

  return { value, errors };
}

function parseGoalId(value) {
  if (!/^\d+$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

module.exports = {
  validateGoalPayload,
  parseGoalId,
  GOAL_TYPES,
  GOAL_STATUSES,
  MAX_MONEY,
};
