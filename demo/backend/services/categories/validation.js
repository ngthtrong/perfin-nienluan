// Vai trò: Xác thực payload tạo hoặc cập nhật danh mục ở lớp service dùng chung.
// Luồng chính: từ chối field lạ, chuẩn hóa tên/icon và trả object an toàn cho model.

function bad(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function validateName(value) {
  if (typeof value !== 'string') throw bad('Tên danh mục không hợp lệ');
  const name = value.trim();
  if (!name || name.length > 50) throw bad('Tên danh mục phải có từ 1 đến 50 ký tự');
  return name;
}

function validateIcon(value) {
  if (typeof value !== 'string') throw bad('Biểu tượng danh mục không hợp lệ');
  const icon = value.trim();
  if (!icon || icon.length > 16) throw bad('Biểu tượng danh mục không hợp lệ');
  return icon;
}

function assertObject(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw bad('Dữ liệu danh mục không hợp lệ');
  }
}

function rejectUnknown(data, allowed) {
  const unknown = Object.keys(data).find((key) => !allowed.has(key));
  if (unknown) throw bad(`Không thể cập nhật trường ${unknown}`);
}

// Trả payload category đã chuẩn hóa và không chứa field ngoài allowlist.
function validateCategoryCreatePayload(data) {
  assertObject(data);
  const allowed = new Set(['name', 'type', 'icon', 'parent_id']);
  rejectUnknown(data, allowed);
  const name = validateName(data.name);
  if (!['income', 'expense'].includes(data.type)) throw bad('Loại danh mục không hợp lệ');
  const result = { ...data, name, type: data.type };
  if (data.icon !== undefined) result.icon = validateIcon(data.icon);
  if (data.parent_id !== undefined && data.parent_id !== null) {
    const parentId = Number(data.parent_id);
    if (!Number.isInteger(parentId) || parentId <= 0) throw bad('Danh mục cha không hợp lệ');
    result.parent_id = parentId;
  }
  return result;
}

function validateCategoryUpdatePayload(data) {
  assertObject(data);
  const allowed = new Set(['name', 'icon']);
  rejectUnknown(data, allowed);
  if (!Object.keys(data).length) throw bad('Không có trường danh mục để cập nhật');
  const result = {};
  if (Object.prototype.hasOwnProperty.call(data, 'name')) result.name = validateName(data.name);
  if (Object.prototype.hasOwnProperty.call(data, 'icon')) result.icon = validateIcon(data.icon);
  return result;
}

module.exports = {
  validateCategoryCreatePayload,
  validateCategoryUpdatePayload,
};
