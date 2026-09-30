-- Requestor delete-before-accept uses status `deleted` (not `closed`).
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'deleted';
