export type Role = "STUDENT" | "STAFF" | "LIBRARIAN" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  department: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
  _count?: { resources: number };
}

export interface Resource {
  id: string;
  title: string;
  author: string;
  abstract: string;
  tags: string[];
  publicationYear: number;
  resourceType: string;
  department: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
  rejectionReason?: string | null;
  viewCount: number;
  downloadCount: number;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  category: Category;
  uploadedBy?: { id: string; name: string };
  versions?: Array<{
    id: string;
    version: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    uploadedAt: string;
  }>;
  saved?: boolean;
  recommendationScore?: number;
  recommendationExplanation?: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
