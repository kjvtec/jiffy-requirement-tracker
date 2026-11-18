-- ============================================================
-- Jiffy Requirement Tracker (New Pos Jiify) - Database Schema
-- ============================================================

-- 1. Create requirements table
CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    req_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT '2.Medium',
    type VARCHAR(50) NOT NULL DEFAULT 'New Feature',
    core_function VARCHAR(100) NOT NULL DEFAULT 'VTec POS',
    module VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    requested_by VARCHAR(100) NOT NULL,
    request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    dev_assigned VARCHAR(100),
    target_version VARCHAR(50),
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create requirement_images table
CREATE TABLE IF NOT EXISTS public.requirement_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_requirements_status ON public.requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON public.requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_core_function ON public.requirements(core_function);
CREATE INDEX IF NOT EXISTS idx_requirements_module ON public.requirements(module);
CREATE INDEX IF NOT EXISTS idx_requirements_request_date ON public.requirements(request_date DESC);
CREATE INDEX IF NOT EXISTS idx_requirement_images_req_id ON public.requirement_images(requirement_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_requirement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_requirements_updated_at ON public.requirements;
CREATE TRIGGER set_requirements_updated_at
BEFORE UPDATE ON public.requirements
FOR EACH ROW
EXECUTE FUNCTION update_requirement_updated_at();

-- 3. Row Level Security (RLS)
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for requirements" ON public.requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for requirement_images" ON public.requirement_images FOR ALL USING (true) WITH CHECK (true);

-- 4. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('requirement-attachments', 'requirement-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Allow public read from requirement-attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'requirement-attachments');

CREATE POLICY "Allow public insert into requirement-attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'requirement-attachments');

CREATE POLICY "Allow public update in requirement-attachments" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'requirement-attachments');

CREATE POLICY "Allow public delete from requirement-attachments" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'requirement-attachments');

-- 5. Seed Initial Sample Data (2 Records as Guideline)
INSERT INTO public.requirements (
    req_id, title, priority, type, core_function, module, details, requested_by, request_date, status, dev_assigned, target_version, remark
) VALUES 
(
    'JFY-REQ-01',
    'รองรับการสแกน Barcode สินค้าแบบชั่งน้ำหนัก (Weight Barcode 13 หลัก)',
    '1.High',
    'New Feature',
    'VTec POS',
    'Sale / Checkout',
    'ต้องการให้หน้าจอขาย POS สามารถสแกนบาร์โค้ด EAN-13 ของสินค้าประเภทชั่งน้ำหนัก (ขึ้นต้นด้วย 20-29) โดยแยกถอดรหัสรหัสสินค้า (Item Code 5 หลัก) และน้ำหนัก/ราคา (5 หลัก) เพื่อคำนวณยอดเงินรวมได้อัตโนมัติ ไม่ต้องคีย์มือน้ำหนักซ้ำ',
    'Nat',
    NOW(),
    'In Development',
    'Kampon',
    'v1.2.0',
    'ทดสอบ Logic การตัด Prefix บาร์โค้ดและทดสอบกับเครื่องสแกนหน้าร้าน'
),
(
    'JFY-REQ-02',
    'เพิ่มปุ่มคัดลอกเลขที่เอกสารในหน้ารายงานสินค้าขาด (Stock Shortage)',
    '2.Medium',
    'Enhancement',
    'VTec Store Backoffice',
    'Report',
    'เพิ่มปุ่ม Copy เลขที่ใบโอน/เลขที่ PO บนหน้ารายงานสต็อก เพื่อให้พนักงานสาขาคัดลอกไปค้นหาต่อในหน้า Stock Adjustment ได้สะดวกขึ้นโดยไม่ต้องพิมพ์เอง',
    'Tukta',
    NOW(),
    'Draft',
    NULL,
    'v1.3.0',
    'อยู่ระหว่างสรุป UI กับทีมสาขา'
)
ON CONFLICT (req_id) DO NOTHING;
