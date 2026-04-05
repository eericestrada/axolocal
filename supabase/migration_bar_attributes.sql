-- Add category attributes for bars (same as restaurants)
insert into category_attributes (primary_type, slug, label, input_type, options, sort_order) values
  ('bar', 'cuisine', 'Food Type', 'select', '["mexican","chinese","italian","japanese","american","bbq","thai","indian","vietnamese","other"]', 1),
  ('bar', 'price-range', 'Price Range', 'select', '["$","$$","$$$","$$$$"]', 2),
  ('bar', 'has-playground', 'Has Playground', 'boolean', null, 3),
  ('bar', 'wait-time', 'Typical Wait', 'select', '["none","short","moderate","long"]', 4);
