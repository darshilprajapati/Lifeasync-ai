export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  profilePhoto?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthUserResponse {
  isSuccess: boolean;
  data: UserDto;
  message?: string;
}
