INSERT INTO categories (user_id, name, type, icon, is_default, sort_order) VALUES
('default_user', 'Ăn uống', 'expense', '🍜', true, 1),
('default_user', 'Di chuyển', 'expense', '🚗', true, 2),
('default_user', 'Mua sắm', 'expense', '🛍️', true, 3),
('default_user', 'Giải trí', 'expense', '🎮', true, 4),
('default_user', 'Sức khỏe', 'expense', '🏥', true, 5),
('default_user', 'Giáo dục', 'expense', '📚', true, 6),
('default_user', 'Nhà cửa', 'expense', '🏠', true, 7),
('default_user', 'Hóa đơn & Dịch vụ', 'expense', '📄', true, 8),
('default_user', 'Tạp hóa', 'expense', '🛒', true, 9),
('default_user', 'Điện tử', 'expense', '📱', true, 10),
('default_user', 'Thể thao', 'expense', '⚽', true, 11),
('default_user', 'Làm đẹp', 'expense', '💅', true, 12),
('default_user', 'Khác', 'expense', '📦', true, 99),
('default_user', 'Lương', 'income', '💰', true, 1),
('default_user', 'Thưởng', 'income', '🎁', true, 2),
('default_user', 'Đầu tư', 'income', '📈', true, 3),
('default_user', 'Khác', 'income', '📦', true, 99)
ON CONFLICT (user_id, type, name) DO NOTHING;

INSERT INTO wallets (user_id, name, type, balance, currency, is_default)
VALUES ('default_user', 'Tiền mặt', 'cash', 0, 'VND', true)
ON CONFLICT (user_id, name) DO NOTHING;
