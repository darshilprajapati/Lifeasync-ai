import { createContext } from 'react';

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  profilePhoto?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface AuthContextType {
  user: UserDto | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserDto>;
  register: (
    fullName: string,
    email: string,
    password: string,
    location?: { country?: string; state?: string; city?: string }
  ) => Promise<UserDto>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: UserDto) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export { useAuth } from './useAuth';
