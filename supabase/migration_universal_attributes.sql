-- Remove bar-specific attributes (they'll fall back to universal defaults)
delete from category_attributes where primary_type = 'bar';

-- Add universal default attributes for any type without its own
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('_default', 'price-range', 'Price Range', 'select', '["$","$$","$$$","$$$$"]', 1),
  ('_default', 'has-playground', 'Has Playground', 'boolean', null, 2),
  ('_default', 'wait-time', 'Typical Wait', 'select', '["none","short","moderate","long"]', 3);
