ALTER TABLE `services` MODIFY COLUMN `integration` ENUM('NONE', 'JELLYFIN', 'BUPO_SSO') NOT NULL DEFAULT 'NONE';
ALTER TABLE `services` ADD COLUMN `ssoClientId` VARCHAR(191) NULL;
ALTER TABLE `services` ADD COLUMN `ssoSecretEnc` VARCHAR(191) NULL;
ALTER TABLE `services` ADD COLUMN `ssoRedirectUri` VARCHAR(191) NULL;
ALTER TABLE `services` ADD UNIQUE INDEX `ssoClientId_key` (`ssoClientId`);
