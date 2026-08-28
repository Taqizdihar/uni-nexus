-- Rename the existing global RBAC row in place only when no replacement row exists.
-- This keeps roles.id, user_roles, and role_permissions untouched. If a
-- SPECIALIST_STAFF row already exists, stop and reconcile it explicitly instead.
UPDATE roles AS legacy
LEFT JOIN (
  SELECT organization_id
  FROM (
    SELECT organization_id
    FROM roles
    WHERE code = 'SPECIALIST_STAFF'
  ) AS existing_specialist_roles
) AS existing ON existing.organization_id = legacy.organization_id
SET legacy.code = 'SPECIALIST_STAFF',
    legacy.name = 'Staf Spesialis',
    legacy.description = 'Staf spesialis inti Uni-Inside yang mendukung operasional lintas Uni-Inside Craft dan Uni-Inside Studio.'
WHERE legacy.code = 'OPERATOR'
  AND existing.organization_id IS NULL;
