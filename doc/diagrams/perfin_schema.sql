-- -----------------------------------------------------------------------------
-- PERFIN - Personal Finance Management Mobile Application
-- Database Schema Design
-- -----------------------------------------------------------------------------

-- 1. ENUMS
CREATE TYPE transaction_type AS ENUM ('Expense', 'Income', 'Transfer', 'Investment', 'Special');
CREATE TYPE special_transaction_type AS ENUM ('Quản lý món nợ', 'Cho vay', 'Vay mượn', 'Tiết kiệm', 'Ngân sách', 'Đầu tư', 'Chuyển tiền đi đầu tư');
CREATE TYPE category_type AS ENUM ('Expense', 'Income');
CREATE TYPE wallet_type AS ENUM ('Cash', 'Bank', 'EWallet', 'Investment');
CREATE TYPE budget_period AS ENUM ('weekly', 'monthly');
CREATE TYPE budget_status AS ENUM ('active', 'deleted');
CREATE TYPE budget_type AS ENUM ('category', 'overall');
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE recurring_status AS ENUM ('active', 'paused');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'overdue');
CREATE TYPE transaction_status AS ENUM ('active', 'soft_deleted');
CREATE TYPE input_source AS ENUM ('text', 'voice', 'image');
CREATE TYPE chat_role AS ENUM ('user', 'ai', 'system');
CREATE TYPE message_type AS ENUM ('text', 'voice', 'image', 'system_notification');
CREATE TYPE export_type AS ENUM ('csv', 'pdf', 'backup');
CREATE TYPE backup_frequency AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE export_status AS ENUM ('success', 'failed');
CREATE TYPE investment_pl_type AS ENUM ('profit', 'loss');
CREATE TYPE feedback_type AS ENUM ('extraction', 'classification');

-- 2. TABLES

-- User Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    language_preference VARCHAR(20) DEFAULT 'vi',
    personalization_consent BOOLEAN DEFAULT false,
    active_personality_id INTEGER, -- FK added later
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Personality Table
CREATE TABLE ai_personalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_original VARCHAR(100),
    description TEXT,
    style_prompt TEXT,
    sample_responses TEXT,
    is_system BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Null for system
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD CONSTRAINT fk_user_active_personality FOREIGN KEY (active_personality_id) REFERENCES ai_personalities(id);

-- Category Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type category_type NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE, -- Max 1 level deep
    is_system BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, name) -- Unique category name per type per user
);

-- Wallet Table
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type wallet_type NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    initial_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Budget Table
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE, -- NULL for overall
    budget_type budget_type NOT NULL,
    period budget_period NOT NULL,
    amount_limit DECIMAL(15, 2) NOT NULL CHECK (amount_limit > 0),
    amount_spent DECIMAL(15, 2) DEFAULT 0,
    rollover_enabled BOOLEAN DEFAULT false,
    rollover_amount DECIMAL(15, 2) DEFAULT 0,
    status budget_status DEFAULT 'active',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget History
CREATE TABLE budget_history (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring Bill Table
CREATE TABLE recurring_bills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE RESTRICT,
    frequency recurring_frequency NOT NULL,
    payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 31),
    status recurring_status DEFAULT 'active',
    reminder_days_before INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type transaction_type NOT NULL,
    special_type special_transaction_type,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE RESTRICT NOT NULL,
    destination_wallet_id INTEGER REFERENCES wallets(id) ON DELETE RESTRICT,
    input_source input_source DEFAULT 'text',
    status transaction_status DEFAULT 'active',
    deleted_at TIMESTAMP,
    ai_original_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    recurring_bill_id INTEGER REFERENCES recurring_bills(id) ON DELETE SET NULL,
    investment_pl_type investment_pl_type,
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring Bill Payment History
CREATE TABLE recurring_bill_payments (
    id SERIAL PRIMARY KEY,
    recurring_bill_id INTEGER REFERENCES recurring_bills(id) ON DELETE CASCADE,
    expected_date DATE NOT NULL,
    actual_date DATE,
    amount DECIMAL(15, 2),
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    status payment_status DEFAULT 'unpaid'
);

-- Chat Message Table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role chat_role NOT NULL,
    content TEXT NOT NULL,
    msg_type message_type DEFAULT 'text',
    personality_id INTEGER REFERENCES ai_personalities(id) ON DELETE SET NULL,
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Feedback Log
CREATE TABLE ai_feedback_logs (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ai_original_result TEXT,
    user_corrected_result TEXT,
    feedback_type feedback_type NOT NULL,
    is_anonymized BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Trait Table
CREATE TABLE user_traits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    trait_type VARCHAR(100) NOT NULL,
    trait_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investment PL Record
CREATE TABLE investment_pl_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    pl_type investment_pl_type NOT NULL,
    note TEXT,
    recorded_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Export History
CREATE TABLE export_histories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    export_type export_type NOT NULL,
    file_url VARCHAR(500),
    file_size BIGINT,
    status export_status DEFAULT 'success',
    is_auto BOOLEAN DEFAULT false,
    filters_applied TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup Config
CREATE TABLE backup_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT false,
    frequency backup_frequency DEFAULT 'monthly',
    max_backups INTEGER DEFAULT 5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
