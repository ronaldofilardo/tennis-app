export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'SCORER' | 'ATHLETE' | 'COACH';
  clubId?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'SCORER' | 'ATHLETE' | 'COACH';
  cpf?: string;
}

export interface AuthContextType {
  currentUser: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}
