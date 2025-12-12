-- Marine Retrofit Management System - Database Schema


-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'project_manager', 'engineer', 'technician')) DEFAULT 'technician',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Projects table
-- Note: vessel_owner is the owner of the vessel (ship owner)
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    vessel_name VARCHAR(100),
    vessel_type VARCHAR(50),
    vessel_owner VARCHAR(100),  
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')) DEFAULT 'planning',
    budget DECIMAL(15, 2),
    spending DECIMAL(15, 2),
    description TEXT,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,  -- Project creator (shown as owner_name in API)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Project Assignments table (links users to projects)
CREATE TABLE IF NOT EXISTS project_assignments (
    assignment_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Create indexes on project_assignments
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    task_name VARCHAR(100) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
    is_maintenance BOOLEAN DEFAULT FALSE,
    start_date DATE,
    due_date DATE,
    completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(20),
    unit_price DECIMAL(10, 2),
    reorder_level INTEGER DEFAULT 10,
    supplier_name VARCHAR(100),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on inventory
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);

-- Stock Transactions table
CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES inventory(item_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('in', 'out', 'adjustment')) NOT NULL,
    quantity INTEGER NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT
);

-- Create indexes on stock_transactions
CREATE INDEX IF NOT EXISTS idx_stock_transactions_item ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_project ON stock_transactions(project_id);

-- Blueprints table (documents/files)
CREATE TABLE IF NOT EXISTS blueprints (
    blueprint_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    version VARCHAR(20) DEFAULT '1.0',
    description TEXT,
    uploaded_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes on blueprints
CREATE INDEX IF NOT EXISTS idx_blueprints_project ON blueprints(project_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_uploaded_by ON blueprints(uploaded_by);

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
    setting_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    theme VARCHAR(10) CHECK (theme IN ('light', 'dark', 'auto')) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    dashboard_layout JSONB,
    items_per_page INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Report Templates table
CREATE TABLE IF NOT EXISTS report_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(20) CHECK (report_type IN ('project', 'task', 'inventory', 'financial', 'custom')) NOT NULL,
    description TEXT,
    template_config JSONB,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated Reports table
CREATE TABLE IF NOT EXISTS generated_reports (
    report_id SERIAL PRIMARY KEY,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50),
    file_path VARCHAR(500),
    parameters JSONB,
    generated_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on generated_reports
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_by ON generated_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);

-- Comments on important fields
COMMENT ON COLUMN projects.vessel_owner IS 'Owner of the vessel/ship (not the project creator)';
COMMENT ON COLUMN projects.created_by IS 'User who created the project (displayed as owner_name in API responses)';
COMMENT ON TABLE project_assignments IS 'Links users (engineers/technicians) to projects they are assigned to';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blueprints_updated_at BEFORE UPDATE ON blueprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample admin user (password: admin123)
-- This is for development only - remove or change in production!
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, email, password_hash, full_name, role, is_active) 
VALUES (
    'admin', 
    'admin@marineretrofit.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJxXgZqjG', 
    'System Administrator', 
    'admin', 
    TRUE
) ON CONFLICT (username) DO NOTHING;

