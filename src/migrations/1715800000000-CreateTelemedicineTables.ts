import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelemedicineTables1715800000000 implements MigrationInterface {
  name = 'CreateTelemedicineTables1715800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE session_status_enum AS ENUM ('scheduled','waiting','active','completed','cancelled','missed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE session_type_enum AS ENUM ('video','audio'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE prescription_status_enum AS ENUM ('draft','issued','dispensed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE medicine_form_enum AS ENUM ('tablet','capsule','syrup','injection','cream','drops','inhaler','patch','suppository','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE medicine_frequency_enum AS ENUM ('OD','BD','TDS','QID','PRN','STAT','HS','AC','PC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE medicine_route_enum AS ENUM ('oral','intravenous','intramuscular','subcutaneous','topical','sublingual','rectal','inhalation','ophthalmic','otic','nasal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE message_type_enum AS ENUM ('text','image','file','system','vitals'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE sender_role_enum AS ENUM ('patient','doctor','system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS telemedicine_sessions (
        id                    UUID NOT NULL DEFAULT gen_random_uuid(),
        session_ref           VARCHAR NOT NULL,
        booking_id            UUID NOT NULL,
        patient_id            UUID NOT NULL,
        doctor_id             UUID NOT NULL,
        session_type          session_type_enum NOT NULL DEFAULT 'video',
        status                session_status_enum NOT NULL DEFAULT 'scheduled',
        agora_channel         VARCHAR,
        agora_patient_token   TEXT,
        agora_doctor_token    TEXT,
        agora_app_id          VARCHAR,
        agora_patient_uid     INTEGER,
        agora_doctor_uid      INTEGER,
        scheduled_at          TIMESTAMP,
        started_at            TIMESTAMP,
        ended_at              TIMESTAMP,
        duration_seconds      INTEGER,
        is_recording_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
        recording_resource_id VARCHAR,
        recording_sid         VARCHAR,
        recording_url         TEXT,
        consultation_notes    TEXT,
        chief_complaint       TEXT,
        diagnosis             TEXT,
        icd_codes             TEXT,
        follow_up_required    BOOLEAN NOT NULL DEFAULT FALSE,
        follow_up_date        TIMESTAMP,
        follow_up_booking_id  UUID,
        vitals                JSONB,
        cancelled_by          UUID,
        cancellation_reason   TEXT,
        consultation_fee      DECIMAL(10,2),
        is_paid               BOOLEAN NOT NULL DEFAULT FALSE,
        created_at            TIMESTAMP NOT NULL DEFAULT now(),
        updated_at            TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_telemedicine_sessions PRIMARY KEY (id),
        CONSTRAINT uq_telemedicine_sessions_ref UNIQUE (session_ref)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id                        UUID NOT NULL DEFAULT gen_random_uuid(),
        prescription_ref          VARCHAR NOT NULL,
        session_id                UUID NOT NULL,
        patient_id                UUID NOT NULL,
        doctor_id                 UUID NOT NULL,
        status                    prescription_status_enum NOT NULL DEFAULT 'draft',
        diagnosis                 TEXT,
        icd_codes                 TEXT,
        clinical_notes            TEXT,
        special_instructions      TEXT,
        lab_investigations        TEXT,
        radiology_investigations  TEXT,
        follow_up_required        BOOLEAN NOT NULL DEFAULT FALSE,
        follow_up_date            TIMESTAMP,
        issued_at                 TIMESTAMP NOT NULL,
        pdf_url                   TEXT,
        digital_signature_url     TEXT,
        doctor_snapshot           JSONB,
        patient_snapshot          JSONB,
        created_at                TIMESTAMP NOT NULL DEFAULT now(),
        updated_at                TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_prescriptions PRIMARY KEY (id),
        CONSTRAINT uq_prescriptions_ref UNIQUE (prescription_ref),
        CONSTRAINT uq_prescriptions_session UNIQUE (session_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS prescription_medicines (
        id               UUID NOT NULL DEFAULT gen_random_uuid(),
        prescription_id  UUID NOT NULL,
        medicine_name    VARCHAR NOT NULL,
        generic_name     VARCHAR,
        brand_name       VARCHAR,
        form             medicine_form_enum NOT NULL DEFAULT 'tablet',
        strength         VARCHAR NOT NULL,
        frequency        medicine_frequency_enum NOT NULL,
        route            medicine_route_enum NOT NULL DEFAULT 'oral',
        duration         VARCHAR NOT NULL,
        duration_days    INTEGER,
        dose             VARCHAR,
        quantity         INTEGER,
        instructions     TEXT,
        is_controlled    BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order       INTEGER NOT NULL DEFAULT 0,
        created_at       TIMESTAMP NOT NULL DEFAULT now(),
        updated_at       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_prescription_medicines PRIMARY KEY (id),
        CONSTRAINT fk_prescription_medicines_prescription
          FOREIGN KEY (prescription_id)
          REFERENCES prescriptions(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consultation_chat_messages (
        id             UUID NOT NULL DEFAULT gen_random_uuid(),
        session_id     UUID NOT NULL,
        sender_id      VARCHAR NOT NULL,
        sender_role    sender_role_enum NOT NULL,
        message_type   message_type_enum NOT NULL DEFAULT 'text',
        content        TEXT,
        file_url       TEXT,
        file_name      VARCHAR,
        file_mime_type VARCHAR,
        file_size      INTEGER,
        metadata       JSONB,
        is_read        BOOLEAN NOT NULL DEFAULT FALSE,
        read_at        TIMESTAMP,
        is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_consultation_chat_messages PRIMARY KEY (id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS consultation_chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS prescription_medicines`);
    await queryRunner.query(`DROP TABLE IF EXISTS prescriptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS telemedicine_sessions`);
    await queryRunner.query(`DROP TYPE IF EXISTS sender_role_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS message_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS medicine_route_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS medicine_frequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS medicine_form_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS prescription_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS session_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS session_status_enum`);
  }
}