ALTER TABLE "processing_details"
ADD COLUMN "wageCalculationVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "processing_details"
ADD CONSTRAINT "processing_details_wageCalculationVersion_check"
CHECK ("wageCalculationVersion" IN (1, 2));
