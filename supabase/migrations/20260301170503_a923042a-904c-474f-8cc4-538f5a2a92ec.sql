-- Allow anonymous/unauthenticated access for songbook management (admin panel uses custom auth)
CREATE POLICY "Allow all songbook_files operations" ON public.songbook_files
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all catalog_songbook_links operations" ON public.catalog_songbook_links
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all songbook_setlist_songs operations" ON public.songbook_setlist_songs
  FOR ALL USING (true) WITH CHECK (true);