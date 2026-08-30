-- CreateTable
CREATE TABLE "Account" (
    "id" VARCHAR(191) NOT NULL,
    "provider" VARCHAR(191) NOT NULL,
    "providerId" VARCHAR(191) NOT NULL,
    "email" VARCHAR(191),
    "name" VARCHAR(191),
    "avatarUrl" VARCHAR(191),
    "providerData" JSON,
    "accessToken" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshToken" TEXT,
    "refreshTokenExpiry" TIMESTAMPTZ(6),
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppInstall" (
    "id" VARCHAR(191) NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "appId" VARCHAR(191) NOT NULL,
    "token" VARCHAR(191) NOT NULL,
    "note" VARCHAR(191),
    "installedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceType" VARCHAR(191),
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AppInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoAuth" (
    "id" VARCHAR(191) NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "password" VARCHAR(191),
    "deviceType" VARCHAR(191),
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(191) NOT NULL,
    "name" VARCHAR(191),
    "accountId" VARCHAR(191),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" VARCHAR(191),
    "passwordHint" VARCHAR(191),
    "namespace" VARCHAR(191),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KVStore" (
    "deviceId" INTEGER NOT NULL,
    "key" VARCHAR(191) NOT NULL,
    "value" JSON NOT NULL,
    "creatorIp" VARCHAR(191) DEFAULT '',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KVStore_pkey" PRIMARY KEY ("deviceId","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerId_key" ON "Account"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppInstall_token_key" ON "AppInstall"("token");

-- CreateIndex
CREATE INDEX "AppInstall_deviceId_idx" ON "AppInstall"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoAuth_deviceId_password_key" ON "AutoAuth"("deviceId", "password");

-- CreateIndex
CREATE UNIQUE INDEX "Device_uuid_key" ON "Device"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Device_namespace_key" ON "Device"("namespace");

-- CreateIndex
CREATE INDEX "Device_accountId_idx" ON "Device"("accountId");
