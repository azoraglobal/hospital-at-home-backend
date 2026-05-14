import { MigrationInterface, QueryRunner } from 'typeorm';

export class DoctorBookingModule1715692800000 implements MigrationInterface {
  name = 'DoctorBookingModule1715692800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old incomplete tables if they exist
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_reviews" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_documents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_availability" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_specialization_map" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctors" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "specializations" CASCADE`);

    // Drop old types if they exist
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "day_of_week_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pmdc_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "doctor_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "gender_enum"`);

    // Create specializations
    await queryRunner.query(`
      CREATE TABLE "specializations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "name_urdu" character varying,
        "description" character varying,
        "icon_url" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_specializations_name" UNIQUE ("name"),
        CONSTRAINT "PK_specializations" PRIMARY KEY ("id")
      )
    `);

    // Create enums
    await queryRunner.query(`CREATE TYPE "doctor_status_enum" AS ENUM ('pending', 'active', 'suspended', 'rejected')`);
    await queryRunner.query(`CREATE TYPE "pmdc_verification_status_enum" AS ENUM ('unverified', 'pending', 'verified', 'failed')`);
    await queryRunner.query(`CREATE TYPE "gender_enum" AS ENUM ('male', 'female', 'other')`);
    await queryRunner.query(`CREATE TYPE "day_of_week_enum" AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')`);
    await queryRunner.query(`CREATE TYPE "document_type_enum" AS ENUM ('pmdc_certificate','degree','cnic','experience_letter','other')`);
    await queryRunner.query(`CREATE TYPE "appointment_status_enum" AS ENUM ('pending','confirmed','in_progress','completed','cancelled_by_patient','cancelled_by_doctor','no_show')`);
    await queryRunner.query(`CREATE TYPE "appointment_type_enum" AS ENUM ('home_visit','video_call','clinic')`);

    // Create doctors
    await queryRunner.query(`
      CREATE TABLE "doctors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "full_name" character varying NOT NULL,
        "gender" "gender_enum",
        "date_of_birth" date,
        "profile_photo_url" character varying,
        "bio" text,
        "languages" character varying,
        "phone_number" character varying,
        "city" character varying,
        "address" character varying,
        "pmdc_number" character varying,
        "pmdc_verification_status" "pmdc_verification_status_enum" NOT NULL DEFAULT 'unverified',
        "pmdc_verified_at" TIMESTAMP WITH TIME ZONE,
        "pmdc_rejection_reason" text,
        "medical_degree" character varying,
        "medical_college" character varying,
        "graduation_year" integer,
        "additional_qualifications" text,
        "years_of_experience" integer NOT NULL DEFAULT 0,
        "primary_specialization" character varying,
        "consultation_fee" numeric(10,2) NOT NULL DEFAULT 0,
        "follow_up_fee" numeric(10,2),
        "home_visit_fee" numeric(10,2),
        "accepts_home_visits" boolean NOT NULL DEFAULT true,
        "accepts_video_calls" boolean NOT NULL DEFAULT false,
        "slot_duration_minutes" integer NOT NULL DEFAULT 30,
        "status" "doctor_status_enum" NOT NULL DEFAULT 'pending',
        "is_available_now" boolean NOT NULL DEFAULT false,
        "average_rating" numeric(3,2) NOT NULL DEFAULT 0,
        "total_reviews" integer NOT NULL DEFAULT 0,
        "total_appointments" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_doctors_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_doctors_pmdc_number" UNIQUE ("pmdc_number"),
        CONSTRAINT "PK_doctors" PRIMARY KEY ("id")
      )
    `);

    // Create doctor_specialization_map
    await queryRunner.query(`
      CREATE TABLE "doctor_specialization_map" (
        "doctor_id" uuid NOT NULL,
        "specialization_id" uuid NOT NULL,
        CONSTRAINT "PK_doctor_specialization_map" PRIMARY KEY ("doctor_id", "specialization_id")
      )
    `);

    // Create doctor_availability
    await queryRunner.query(`
      CREATE TABLE "doctor_availability" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL,
        "day_of_week" "day_of_week_enum",
        "start_time" time,
        "end_time" time,
        "max_slots" integer NOT NULL DEFAULT 10,
        "is_active" boolean NOT NULL DEFAULT true,
        "override_date" date,
        "is_blocked" boolean NOT NULL DEFAULT false,
        "block_reason" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_availability" PRIMARY KEY ("id")
      )
    `);

    // Create doctor_documents
    await queryRunner.query(`
      CREATE TABLE "doctor_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL,
        "document_type" "document_type_enum" NOT NULL,
        "file_url" character varying NOT NULL,
        "original_name" character varying,
        "is_verified" boolean NOT NULL DEFAULT false,
        "verified_by" character varying,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_documents" PRIMARY KEY ("id")
      )
    `);

    // Create appointments
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL,
        "patient_id" uuid NOT NULL,
        "appointment_date" date NOT NULL,
        "slot_start_time" time NOT NULL,
        "slot_end_time" time NOT NULL,
        "appointment_type" "appointment_type_enum" NOT NULL DEFAULT 'home_visit',
        "patient_address" text,
        "patient_lat" numeric(10,8),
        "patient_lng" numeric(11,8),
        "chief_complaint" text,
        "doctor_notes" text,
        "prescription_url" character varying,
        "fee_charged" numeric(10,2),
        "is_paid" boolean NOT NULL DEFAULT false,
        "payment_method" character varying,
        "payment_reference" character varying,
        "status" "appointment_status_enum" NOT NULL DEFAULT 'pending',
        "cancellation_reason" text,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "booking_reference" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_appointments_booking_ref" UNIQUE ("booking_reference"),
        CONSTRAINT "PK_appointments" PRIMARY KEY ("id")
      )
    `);

    // Create doctor_reviews
    await queryRunner.query(`
      CREATE TABLE "doctor_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL,
        "patient_id" uuid NOT NULL,
        "appointment_id" uuid NOT NULL,
        "overall_rating" integer NOT NULL,
        "punctuality_rating" integer,
        "behavior_rating" integer,
        "knowledge_rating" integer,
        "comment" text,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "is_approved" boolean NOT NULL DEFAULT true,
        "is_flagged" boolean NOT NULL DEFAULT false,
        "doctor_reply" text,
        "replied_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_doctor_reviews_appointment" UNIQUE ("appointment_id"),
        CONSTRAINT "PK_doctor_reviews" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys
    await queryRunner.query(`ALTER TABLE "doctors" ADD CONSTRAINT "FK_doctors_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "doctor_specialization_map" ADD CONSTRAINT "FK_dsm_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "doctor_specialization_map" ADD CONSTRAINT "FK_dsm_spec" FOREIGN KEY ("specialization_id") REFERENCES "specializations"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_da_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "doctor_documents" ADD CONSTRAINT "FK_dd_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_appt_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id")`);
    await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_appt_patient" FOREIGN KEY ("patient_id") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "doctor_reviews" ADD CONSTRAINT "FK_dr_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "doctor_reviews" ADD CONSTRAINT "FK_dr_patient" FOREIGN KEY ("patient_id") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "doctor_reviews" ADD CONSTRAINT "FK_dr_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")`);

    // Indexes
    await queryRunner.query(`CREATE INDEX "IDX_doctors_status" ON "doctors" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_doctors_city" ON "doctors" ("city")`);
    await queryRunner.query(`CREATE INDEX "IDX_doctors_rating" ON "doctors" ("average_rating" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_appointments_doctor_date" ON "appointments" ("doctor_id", "appointment_date")`);
    await queryRunner.query(`CREATE INDEX "IDX_appointments_patient" ON "appointments" ("patient_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_appointments_status" ON "appointments" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_reviews_doctor" ON "doctor_reviews" ("doctor_id")`);

    // Seed specializations
    await queryRunner.query(`
      INSERT INTO "specializations" ("name", "name_urdu") VALUES
        ('General Practice', 'جنرل پریکٹس'),
        ('Cardiology', 'امراض قلب'),
        ('Pediatrics', 'امراض اطفال'),
        ('Gynecology', 'امراض نسواں'),
        ('Dermatology', 'امراض جلد'),
        ('Orthopedics', 'ہڈیوں کے امراض'),
        ('Neurology', 'اعصابی امراض'),
        ('Psychiatry', 'نفسیاتی امراض'),
        ('ENT', 'کان ناک گلا'),
        ('Ophthalmology', 'امراض چشم'),
        ('Urology', 'امراض بول'),
        ('Gastroenterology', 'معدے کے امراض'),
        ('Endocrinology', 'غدد کے امراض'),
        ('Pulmonology', 'پھیپھڑوں کے امراض'),
        ('Emergency Medicine', 'ہنگامی طب')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_reviews" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_documents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_availability" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_specialization_map" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctors" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "specializations" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "day_of_week_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pmdc_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "doctor_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "gender_enum"`);
  }
}