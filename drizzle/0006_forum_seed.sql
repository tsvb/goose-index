insert into forum_categories (title, position) values ('The Music', 1), ('Community', 2);
--> statement-breakpoint
insert into forum_boards (category_id, slug, title, description, position)
select c.id, b.slug, b.title, b.description, b.position
from (values
  ('The Music', 'tour-talk',          'Tour Talk',        'Shows, runs, rumors, and the road.',            1),
  ('The Music', 'setlists-and-stats', 'Setlists & Stats', 'Setlist talk, gaps, bustouts, and the numbers.', 2),
  ('The Music', 'tapes-and-media',    'Tapes & Media',    'Recordings, streams, video, and photos.',        3),
  ('Community', 'introductions',      'Introductions',    'New around here? Say hello.',                    1),
  ('Community', 'off-topic',          'Off Topic',        'Everything that isn''t the honk.',               2),
  ('Community', 'site-feedback',      'Site Feedback',    'Bugs, ideas, and requests for Goose Index.',     3)
) as b(cat, slug, title, description, position)
join forum_categories c on c.title = b.cat;