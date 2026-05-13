-- ============================================================
-- HOSPITAL @ HOME — COMPLETE PHASE 1 DATABASE SCHEMA
-- Multan, Pakistan | 2026
-- Modules: Auth, Profiles, Doctors, Telemedicine,
--          Medicine, Lab Tests, Payments, Notifications, Admin
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MODULE 1: AUTH & USER ROLES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'patient',
  'doctor',
  'rider',
  'lab_agent',
  'pharmacy_staff',
  'admin',
  'super_admin'
);

CREATE TYPE auth_provider AS ENUM (
  'phone',
  'email',
  'google',
  'apple'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role user_role NOT NULL DEFAULT 'patient',
  auth_provider auth_provider DEFAULT 'phone',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  profile_picture_url VARCHAR(500),
  fcm_token VARCHAR(500),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20),
  email VARCHAR(255),
  otp_code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL, -- 'registration', 'login', 'reset_password', 'verify_email'
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info VARCHAR(500),
  ip_address VARCHAR(50),
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 2: PATIENT PROFILES
-- ============================================================

CREATE TYPE blood_group AS ENUM (
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'
);

CREATE TYPE gender AS ENUM ('male', 'female', 'other');

CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  gender gender,
  blood_group blood_group DEFAULT 'unknown',
  cnic VARCHAR(20) UNIQUE,
  address TEXT,
  city VARCHAR(100) DEFAULT 'Multan',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL, -- 'spouse', 'child', 'parent', 'sibling', 'other'
  date_of_birth DATE,
  gender gender,
  blood_group blood_group DEFAULT 'unknown',
  profile_picture_url VARCHAR(500),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE medical_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  condition_name VARCHAR(255) NOT NULL,
  diagnosed_at DATE,
  is_ongoing BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE allergies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  allergen VARCHAR(255) NOT NULL,
  reaction VARCHAR(255),
  severity VARCHAR(50), -- 'mild', 'moderate', 'severe'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vaccinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  vaccine_name VARCHAR(255) NOT NULL,
  administered_at DATE,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 3: DOCTOR PROFILES & BOOKING
-- ============================================================

CREATE TYPE doctor_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'suspended'
);

CREATE TYPE consultation_type AS ENUM (
  'video',
  'audio',
  'chat',
  'home_visit'
);

CREATE TABLE specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  name_urdu VARCHAR(255),
  icon_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  gender gender,
  pmdc_number VARCHAR(100) UNIQUE NOT NULL,
  cnic VARCHAR(20) UNIQUE NOT NULL,
  date_of_birth DATE,
  profile_picture_url VARCHAR(500),
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  qualification VARCHAR(500),
  medical_school VARCHAR(255),
  city VARCHAR(100) DEFAULT 'Multan',
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  languages VARCHAR(255) DEFAULT 'Urdu, English',
  status doctor_status DEFAULT 'pending',
  is_available BOOLEAN DEFAULT true,
  video_consultation_fee DECIMAL(10, 2),
  audio_consultation_fee DECIMAL(10, 2),
  chat_consultation_fee DECIMAL(10, 2),
  home_visit_fee DECIMAL(10, 2),
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  total_consultations INTEGER DEFAULT 0,
  rejection_reason TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE doctor_specializations (
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  specialization_id UUID REFERENCES specializations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (doctor_id, specialization_id)
);

CREATE TABLE doctor_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'pmdc_certificate', 'cnic_front', 'cnic_back', 'degree', 'experience_letter'
  file_url VARCHAR(500) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  consultation_types consultation_type[] DEFAULT '{video, audio}'
);

CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled'
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  consultation_type consultation_type NOT NULL,
  status appointment_status DEFAULT 'pending',
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  symptoms TEXT,
  patient_notes TEXT,
  doctor_notes TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50), -- 'patient', 'doctor', 'admin'
  consultation_fee DECIMAL(10, 2) NOT NULL,
  platform_commission DECIMAL(10, 2),
  doctor_earning DECIMAL(10, 2),
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE doctor_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 4: TELEMEDICINE
-- ============================================================

CREATE TYPE session_status AS ENUM (
  'waiting',
  'active',
  'completed',
  'failed',
  'missed'
);

CREATE TABLE telemedicine_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id),
  agora_channel_name VARCHAR(255) UNIQUE,
  agora_token TEXT,
  session_status session_status DEFAULT 'waiting',
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  recording_url VARCHAR(500),
  patient_joined_at TIMESTAMP,
  doctor_joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  diagnosis TEXT,
  notes TEXT,
  follow_up_date DATE,
  is_fulfilled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prescription_medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255),
  frequency VARCHAR(255),
  duration VARCHAR(255),
  instructions TEXT,
  is_substitutable BOOLEAN DEFAULT true
);

CREATE TABLE consultation_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES telemedicine_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  message_text TEXT,
  file_url VARCHAR(500),
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'file', 'voice'
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 5: MEDICINE DELIVERY
-- ============================================================

CREATE TYPE pharmacy_status AS ENUM ('pending', 'verified', 'suspended');
CREATE TYPE medicine_order_status AS ENUM (
  'pending',
  'prescription_review',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned'
);

CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE NOT NULL,
  owner_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT NOT NULL,
  city VARCHAR(100) DEFAULT 'Multan',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status pharmacy_status DEFAULT 'pending',
  is_open BOOLEAN DEFAULT true,
  opening_time TIME,
  closing_time TIME,
  logo_url VARCHAR(500),
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  delivery_radius_km DECIMAL(5, 2) DEFAULT 5.00,
  minimum_order DECIMAL(10, 2) DEFAULT 0,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  brand VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  requires_prescription BOOLEAN DEFAULT false,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'piece', -- 'piece', 'strip', 'bottle', 'box'
  is_available BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pharmacy_id, medicine_id)
);

CREATE TABLE medicine_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  pharmacy_id UUID REFERENCES pharmacies(id),
  prescription_id UUID REFERENCES prescriptions(id),
  rider_id UUID REFERENCES users(id),
  status medicine_order_status DEFAULT 'pending',
  prescription_image_url VARCHAR(500),
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  special_instructions TEXT,
  subtotal DECIMAL(10, 2),
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2),
  platform_commission DECIMAL(10, 2),
  estimated_delivery_time TIMESTAMP,
  delivered_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE medicine_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES medicine_orders(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id),
  medicine_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  is_substituted BOOLEAN DEFAULT false,
  substituted_medicine_name VARCHAR(255)
);

-- ============================================================
-- MODULE 6: HOME LAB TESTS
-- ============================================================

CREATE TYPE lab_status AS ENUM ('pending', 'verified', 'suspended');
CREATE TYPE lab_order_status AS ENUM (
  'pending',
  'confirmed',
  'agent_assigned',
  'agent_on_way',
  'sample_collected',
  'processing',
  'report_ready',
  'completed',
  'cancelled'
);

CREATE TABLE laboratories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE NOT NULL,
  owner_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT NOT NULL,
  city VARCHAR(100) DEFAULT 'Multan',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status lab_status DEFAULT 'pending',
  logo_url VARCHAR(500),
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  home_collection_available BOOLEAN DEFAULT true,
  home_collection_fee DECIMAL(10, 2) DEFAULT 0,
  service_radius_km DECIMAL(5, 2) DEFAULT 10.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  category VARCHAR(100), -- 'hematology', 'biochemistry', 'microbiology', 'radiology'
  description TEXT,
  preparation_instructions TEXT,
  report_delivery_hours INTEGER DEFAULT 24,
  sample_type VARCHAR(100), -- 'blood', 'urine', 'stool', 'swab'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-populate popular tests
INSERT INTO lab_tests (name, short_name, category, sample_type, report_delivery_hours) VALUES
  ('Complete Blood Count', 'CBC', 'hematology', 'blood', 6),
  ('Blood Sugar Fasting', 'BSF', 'biochemistry', 'blood', 4),
  ('Blood Sugar Random', 'BSR', 'biochemistry', 'blood', 4),
  ('HbA1c', 'HbA1c', 'biochemistry', 'blood', 24),
  ('Lipid Profile', 'LP', 'biochemistry', 'blood', 12),
  ('Liver Function Test', 'LFT', 'biochemistry', 'blood', 12),
  ('Kidney Function Test', 'RFT', 'biochemistry', 'blood', 12),
  ('Thyroid Profile T3 T4 TSH', 'TFT', 'biochemistry', 'blood', 24),
  ('Vitamin D', 'Vit-D', 'biochemistry', 'blood', 24),
  ('Vitamin B12', 'B12', 'biochemistry', 'blood', 24),
  ('Urine Complete Examination', 'UCE', 'microbiology', 'urine', 6),
  ('Hepatitis B Surface Antigen', 'HBsAg', 'microbiology', 'blood', 8),
  ('Hepatitis C Antibody', 'HCV', 'microbiology', 'blood', 8),
  ('Dengue NS1 Antigen', 'Dengue', 'microbiology', 'blood', 6),
  ('Chest X-Ray', 'CXR', 'radiology', 'na', 4);

CREATE TABLE lab_test_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES lab_tests(id),
  price DECIMAL(10, 2) NOT NULL,
  discounted_price DECIMAL(10, 2),
  is_available BOOLEAN DEFAULT true,
  UNIQUE(lab_id, test_id)
);

CREATE TABLE lab_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  discounted_price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lab_package_tests (
  package_id UUID REFERENCES lab_packages(id) ON DELETE CASCADE,
  test_id UUID REFERENCES lab_tests(id),
  PRIMARY KEY (package_id, test_id)
);

CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  family_member_id UUID REFERENCES family_members(id),
  lab_id UUID REFERENCES laboratories(id),
  agent_id UUID REFERENCES users(id),
  status lab_order_status DEFAULT 'pending',
  collection_address TEXT NOT NULL,
  collection_latitude DECIMAL(10, 8),
  collection_longitude DECIMAL(11, 8),
  scheduled_at TIMESTAMP NOT NULL,
  collected_at TIMESTAMP,
  special_instructions TEXT,
  subtotal DECIMAL(10, 2),
  home_collection_fee DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2),
  platform_commission DECIMAL(10, 2),
  report_url VARCHAR(500),
  report_ready_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lab_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  test_id UUID REFERENCES lab_tests(id),
  package_id UUID REFERENCES lab_packages(id),
  item_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  report_url VARCHAR(500),
  report_ready_at TIMESTAMP
);

-- ============================================================
-- MODULE 7: PAYMENTS
-- ============================================================

CREATE TYPE payment_method AS ENUM (
  'jazzcash',
  'easypaisa',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'cash_on_delivery',
  'wallet'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partially_refunded',
  'cancelled'
);

CREATE TYPE transaction_type AS ENUM (
  'credit',
  'debit'
);

CREATE TYPE service_type AS ENUM (
  'consultation',
  'medicine_delivery',
  'lab_test',
  'home_visit',
  'nursing',
  'physiotherapy',
  'ambulance',
  'subscription',
  'wallet_topup'
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'PKR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  service_type service_type NOT NULL,
  service_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'PKR',
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  gateway_transaction_id VARCHAR(255),
  gateway_response JSONB,
  invoice_number VARCHAR(100) UNIQUE,
  platform_commission DECIMAL(12, 2),
  notes TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  payment_id UUID REFERENCES payments(id),
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  description VARCHAR(500),
  reference_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'processed'
  admin_notes TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
  discount_value DECIMAL(10, 2) NOT NULL,
  minimum_order DECIMAL(10, 2) DEFAULT 0,
  maximum_discount DECIMAL(10, 2),
  service_types service_type[],
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 8: NOTIFICATIONS
-- ============================================================

CREATE TYPE notification_type AS ENUM (
  'appointment_reminder',
  'appointment_confirmed',
  'appointment_cancelled',
  'doctor_on_way',
  'order_status',
  'lab_report_ready',
  'payment_success',
  'payment_failed',
  'prescription_ready',
  'otp',
  'general',
  'promo'
);

CREATE TYPE notification_channel AS ENUM (
  'push',
  'sms',
  'whatsapp',
  'email',
  'in_app'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  channel notification_channel DEFAULT 'push',
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL UNIQUE,
  title_template VARCHAR(255) NOT NULL,
  body_template TEXT NOT NULL,
  title_template_urdu VARCHAR(255),
  body_template_urdu TEXT,
  channels notification_channel[] DEFAULT '{push, sms}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MODULE 9: ADMIN DASHBOARD
-- ============================================================

CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('doctor_commission_percentage', '20', 'Platform commission on doctor consultations'),
  ('medicine_commission_percentage', '15', 'Platform commission on medicine orders'),
  ('lab_commission_percentage', '25', 'Platform commission on lab tests'),
  ('min_withdrawal_amount', '500', 'Minimum withdrawal amount in PKR'),
  ('support_phone', '+92-300-0000000', 'Customer support phone number'),
  ('support_email', 'support@hospitalathome.pk', 'Customer support email'),
  ('app_version_android', '1.0.0', 'Minimum required Android app version'),
  ('app_version_ios', '1.0.0', 'Minimum required iOS app version'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode');

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  service_type service_type,
  service_id UUID,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  assigned_to UUID REFERENCES users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Users
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- OTP
CREATE INDEX idx_otp_phone ON otp_verifications(phone);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);

-- Patient Profiles
CREATE INDEX idx_patient_user ON patient_profiles(user_id);
CREATE INDEX idx_patient_city ON patient_profiles(city);

-- Doctor Profiles
CREATE INDEX idx_doctor_user ON doctor_profiles(user_id);
CREATE INDEX idx_doctor_status ON doctor_profiles(status);
CREATE INDEX idx_doctor_city ON doctor_profiles(city);
CREATE INDEX idx_doctor_rating ON doctor_profiles(average_rating);
CREATE INDEX idx_doctor_available ON doctor_profiles(is_available);

-- Appointments
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);

-- Medicine Orders
CREATE INDEX idx_medicine_orders_patient ON medicine_orders(patient_id);
CREATE INDEX idx_medicine_orders_status ON medicine_orders(status);
CREATE INDEX idx_medicine_orders_pharmacy ON medicine_orders(pharmacy_id);

-- Lab Orders
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_status ON lab_orders(status);
CREATE INDEX idx_lab_orders_lab ON lab_orders(lab_id);

-- Payments
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_service ON payments(service_type, service_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================================
-- END OF SCHEMA
-- ============================================================