CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Role" AS ENUM ('STUDENT', 'STAFF', 'LIBRARIAN', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "ResourceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "ResourceType" AS ENUM ('EBOOK', 'THESIS', 'JOURNAL_ARTICLE', 'PAST_QUESTION', 'COURSE_MATERIAL');
CREATE TYPE "EventType" AS ENUM ('VIEW', 'DOWNLOAD');
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "department" VARCHAR(120),
    "emailVerifiedAt" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "author" VARCHAR(220) NOT NULL,
    "abstract" TEXT NOT NULL,
    "tags" TEXT[],
    "publicationYear" INTEGER NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "department" VARCHAR(120),
    "status" "ResourceStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(500),
    "categoryId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceVersion" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "objectKey" VARCHAR(700) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InteractionLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "eventType" "EventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InteractionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SearchLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "query" VARCHAR(300) NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedResource" (
    "userId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedResource_pkey" PRIMARY KEY ("userId", "resourceId")
);

CREATE TABLE "AuthToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "type" "TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(100),
    "metadata" JSONB,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecommendationCache" (
    "userId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "explanation" VARCHAR(300),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationCache_pkey" PRIMARY KEY ("userId", "resourceId")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX "User_department_idx" ON "User"("department");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE UNIQUE INDEX "Category_name_parentId_key" ON "Category"("name", "parentId");
CREATE INDEX "Resource_status_createdAt_idx" ON "Resource"("status", "createdAt");
CREATE INDEX "Resource_categoryId_status_idx" ON "Resource"("categoryId", "status");
CREATE INDEX "Resource_resourceType_publicationYear_idx" ON "Resource"("resourceType", "publicationYear");
CREATE INDEX "Resource_uploadedById_idx" ON "Resource"("uploadedById");
CREATE INDEX "Resource_viewCount_downloadCount_idx" ON "Resource"("viewCount", "downloadCount");

-- This expression index supports ranked full-text catalog search at the target 50k-resource scale.
CREATE INDEX "Resource_search_document_idx" ON "Resource" USING GIN (
  to_tsvector('english', coalesce("title", '') || ' ' || coalesce("author", '') || ' ' || coalesce("abstract", '') || ' ' || coalesce(array_to_string("tags", ' '), ''))
);

CREATE INDEX "ResourceVersion_resourceId_uploadedAt_idx" ON "ResourceVersion"("resourceId", "uploadedAt");
CREATE UNIQUE INDEX "ResourceVersion_resourceId_version_key" ON "ResourceVersion"("resourceId", "version");
CREATE INDEX "InteractionLog_userId_createdAt_idx" ON "InteractionLog"("userId", "createdAt");
CREATE INDEX "InteractionLog_resourceId_eventType_createdAt_idx" ON "InteractionLog"("resourceId", "eventType", "createdAt");
CREATE INDEX "SearchLog_resultCount_createdAt_idx" ON "SearchLog"("resultCount", "createdAt");
CREATE INDEX "SearchLog_userId_createdAt_idx" ON "SearchLog"("userId", "createdAt");
CREATE INDEX "SavedResource_userId_createdAt_idx" ON "SavedResource"("userId", "createdAt");
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_userId_type_expiresAt_idx" ON "AuthToken"("userId", "type", "expiresAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "RecommendationCache_userId_score_idx" ON "RecommendationCache"("userId", "score");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceVersion" ADD CONSTRAINT "ResourceVersion_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionLog" ADD CONSTRAINT "InteractionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionLog" ADD CONSTRAINT "InteractionLog_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedResource" ADD CONSTRAINT "SavedResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedResource" ADD CONSTRAINT "SavedResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecommendationCache" ADD CONSTRAINT "RecommendationCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecommendationCache" ADD CONSTRAINT "RecommendationCache_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
