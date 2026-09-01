-- Audience voting was never part of the shipped user flow. The product uses
-- the persisted structured assessment as its single result model.
DROP TABLE IF EXISTS "Vote";
