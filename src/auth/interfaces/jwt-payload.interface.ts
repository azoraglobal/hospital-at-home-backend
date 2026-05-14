export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  RIDER = 'rider',
  LAB_AGENT = 'lab_agent',
  PHARMACY_STAFF = 'pharmacy_staff',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}