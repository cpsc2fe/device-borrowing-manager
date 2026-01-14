-- 1. 使用者資料表 (users)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 設備資料表 (devices)
CREATE TABLE devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    device_type VARCHAR(50) CHECK (device_type IN ('phone', 'tablet', 'laptop', 'other')),
    operating_system VARCHAR(100),
    os_version VARCHAR(50),
    specifications JSONB,
    asset_number VARCHAR(100) UNIQUE,
    purchase_date DATE,
    warranty_end_date DATE,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'maintenance', 'retired', 'reserved')),
    condition VARCHAR(50) CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 設備圖片資料表 (device_images)
CREATE TABLE device_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    image_type VARCHAR(50) CHECK (image_type IN ('front', 'back', 'side', 'detail', 'damage')),
    description VARCHAR(255),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 借用申請資料表 (borrow_requests)
CREATE TABLE borrow_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    device_id UUID NOT NULL REFERENCES devices(id),
    requested_start_date TIMESTAMPTZ NOT NULL,
    requested_end_date TIMESTAMPTZ NOT NULL,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    purpose TEXT,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'active', 'completed', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 維護記錄資料表 (maintenance_records)
CREATE TABLE maintenance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('routine', 'repair', 'upgrade', 'inspection')),
    description TEXT,
    cost DECIMAL(10, 2),
    vendor VARCHAR(255),
    start_date DATE,
    end_date DATE,
    performed_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 通知資料表 (notifications)
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) CHECK (type IN ('borrow_confirmed', 'return_reminder', 'overdue_warning', 'maintenance_alert')),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Telegram 設定資料表 (telegram_settings)
CREATE TABLE telegram_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bot_token VARCHAR(255),
    chat_id VARCHAR(255),
    thread_id VARCHAR(255),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引以優化查詢效能
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_brand ON devices(brand);
CREATE INDEX idx_devices_device_type ON devices(device_type);
CREATE INDEX idx_borrow_requests_user_id ON borrow_requests(user_id);
CREATE INDEX idx_borrow_requests_device_id ON borrow_requests(device_id);
CREATE INDEX idx_borrow_requests_status ON borrow_requests(status);

-- 啟用 RLS (Row Level Security)
-- 建議為每個表啟用RLS並設定相應的策略，以確保資料安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_settings ENABLE ROW LEVEL SECURITY;

-- 提示: 建立完表格後，請記得在 Supabase Dashboard 中設定 Policies (RLS 規則)
-- 例如，使用者只能讀取自己的 `borrow_requests`，而管理員可以讀取所有。
