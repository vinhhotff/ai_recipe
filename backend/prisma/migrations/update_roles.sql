-- Update existing USER roles to MEMBER before schema migration
UPDATE users SET role = 'MEMBER' WHERE role = 'USER';
