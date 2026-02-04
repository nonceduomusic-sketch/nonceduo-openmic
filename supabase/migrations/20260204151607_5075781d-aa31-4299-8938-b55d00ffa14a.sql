-- Add missing operator permissions for the new 3-level system
-- Ensure all sections have: view, manage (partial), full permissions

INSERT INTO permissions (name, description)
VALUES 
  -- Open Mic levels (new granular)
  ('operator.openmic_view', 'Operator can view Open Mic section'),
  ('operator.openmic_partial', 'Operator can manage Open Mic (no deletions)'),
  ('operator.openmic_full', 'Operator has full control of Open Mic'),
  -- Dediche levels (new granular) 
  ('operator.dediche_view', 'Operator can view Dediche section'),
  ('operator.dediche_partial', 'Operator can manage Dediche (no deletions)'),
  ('operator.dediche_full', 'Operator has full control of Dediche'),
  -- Centro (just view)
  ('operator.centro_view', 'Operator can view Centro section')
ON CONFLICT (name) DO NOTHING;