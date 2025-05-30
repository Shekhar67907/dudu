-- Add unique constraint to prescription_remarks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'prescription_remarks' 
        AND constraint_name = 'uq_prescription_remarks_prescription_id'
    ) THEN
        ALTER TABLE prescription_remarks
        ADD CONSTRAINT uq_prescription_remarks_prescription_id 
        UNIQUE (prescription_id);
    END IF;
END $$;
