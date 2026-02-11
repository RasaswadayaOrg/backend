/**
 * API Client for Role Application & User Management
 * 
 * This file contains all API calls in one place for easy access.
 * Can be used in frontend, testing, or any client application.
 * 
 * Base URL: http://localhost:3001
 */

// Default base URL - can be overridden when creating ApiClient instance
const BASE_URL = 'http://localhost:3001';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export type UserRole = 'USER' | 'ARTIST' | 'ORGANIZER' | 'STORE_OWNER' | 'ADMIN';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RoleApplication {
  id: string;
  userId: string;
  role: UserRole;
  status: ApplicationStatus;
  bio?: string;
  portfolioUrl?: string;
  proofDocumentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithApplications extends User {
  roleApplications: RoleApplication[];
}

export interface ApplicationWithUser extends RoleApplication {
  user: User;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// API CLIENT CLASS
// ============================================

export class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string = BASE_URL, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token || null;
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  /**
   * Make HTTP request with FormData (for file uploads)
   */
  private async requestFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // ============================================
  // AUTHENTICATION APIs
  // ============================================

  /**
   * Login user and get JWT token
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Automatically set token after successful login
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * Logout (clear token)
   */
  logout(): void {
    this.clearToken();
  }

  // ============================================
  // USER MANAGEMENT APIs
  // ============================================

  /**
   * Get all users with role applications
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    search?: string;
  }): Promise<PaginatedResponse<UserWithApplications>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    const endpoint = `/api/users${query ? `?${query}` : ''}`;

    return this.request<PaginatedResponse<UserWithApplications>>(endpoint);
  }

  /**
   * Get user by ID with detailed information
   */
  async getUserById(userId: string): Promise<ApiResponse<{
    user: User;
    artistProfile: any;
    orders: any[];
    preferences: any;
    roleApplications: RoleApplication[];
  }>> {
    return this.request<ApiResponse<any>>(`/api/users/${userId}`);
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // ROLE APPLICATION APIs (Admin)
  // ============================================

  /**
   * Get all role applications
   */
  async getAllApplications(params?: {
    status?: ApplicationStatus | 'ALL';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ApplicationWithUser>> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/api/role-applications/all${query ? `?${query}` : ''}`;

    return this.request<PaginatedResponse<ApplicationWithUser>>(endpoint);
  }

  /**
   * Get single role application with full user details
   */
  async getApplicationById(applicationId: string): Promise<ApiResponse<ApplicationWithUser>> {
    return this.request<ApiResponse<ApplicationWithUser>>(
      `/api/role-applications/${applicationId}`
    );
  }

  /**
   * Approve role application
   */
  async approveApplication(applicationId: string): Promise<ApiResponse<RoleApplication>> {
    return this.request<ApiResponse<RoleApplication>>(
      `/api/role-applications/${applicationId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'APPROVED' }),
      }
    );
  }

  /**
   * Reject role application with reason
   */
  async rejectApplication(
    applicationId: string,
    rejectReason: string
  ): Promise<ApiResponse<RoleApplication>> {
    return this.request<ApiResponse<RoleApplication>>(
      `/api/role-applications/${applicationId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'REJECTED',
          rejectReason,
        }),
      }
    );
  }

  // ============================================
  // ROLE APPLICATION APIs (User)
  // ============================================

  /**
   * Submit role application
   */
  async submitRoleApplication(data: {
    role: 'ARTIST' | 'ORGANIZER';
    bio?: string;
    portfolioUrl?: string;
    proofDocument?: File;
  }): Promise<RoleApplication> {
    const formData = new FormData();
    formData.append('role', data.role);
    if (data.bio) formData.append('bio', data.bio);
    if (data.portfolioUrl) formData.append('portfolioUrl', data.portfolioUrl);
    if (data.proofDocument) formData.append('proofDocument', data.proofDocument);

    return this.requestFormData<RoleApplication>('/api/role-applications/apply', formData);
  }

  /**
   * Get my role applications
   */
  async getMyApplications(): Promise<RoleApplication[]> {
    return this.request<RoleApplication[]>('/api/role-applications/my-applications');
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check health status
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const apiClient = new ApiClient();

// ============================================
// CONVENIENCE FUNCTIONS (Optional)
// ============================================

/**
 * Login and get token
 */
export const login = (email: string, password: string) => 
  apiClient.login({ email, password });

/**
 * Get all users
 */
export const getUsers = (params?: Parameters<typeof apiClient.getUsers>[0]) =>
  apiClient.getUsers(params);

/**
 * Get user by ID
 */
export const getUserById = (userId: string) =>
  apiClient.getUserById(userId);

/**
 * Get all applications
 */
export const getAllApplications = (params?: Parameters<typeof apiClient.getAllApplications>[0]) =>
  apiClient.getAllApplications(params);

/**
 * Get application by ID
 */
export const getApplicationById = (applicationId: string) =>
  apiClient.getApplicationById(applicationId);

/**
 * Approve application
 */
export const approveApplication = (applicationId: string) =>
  apiClient.approveApplication(applicationId);

/**
 * Reject application
 */
export const rejectApplication = (applicationId: string, reason: string) =>
  apiClient.rejectApplication(applicationId, reason);

/**
 * Submit role application
 */
export const submitRoleApplication = (data: Parameters<typeof apiClient.submitRoleApplication>[0]) =>
  apiClient.submitRoleApplication(data);

/**
 * Get my applications
 */
export const getMyApplications = () =>
  apiClient.getMyApplications();

// Export default instance
export default apiClient;
