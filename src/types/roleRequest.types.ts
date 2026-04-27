export type UserRole = 'USER' | 'ARTIST' | 'ORGANIZER' | 'STORE_OWNER' | 'TEACHER' | 'ADMIN';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreateRoleRequestDTO {
  userId: string;
  requestedRoles: UserRole[];
  documents: {
    [key: string]: Express.Multer.File;
  };
  textFields?: {
    [key: string]: string;
  };
  reason: string;
  contact: string;
}

export interface RoleRequestResponse {
  id: string;
  userId: string;
  requestedRole: UserRole;
  status: RequestStatus;
  reason: string;
  contact: string;
  documents?: any;
  textFields?: any;
  requestedAt: Date;
  reviewedAt?: Date;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}
