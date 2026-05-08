DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY[
    'ArtistEvent',
    'BookingRequest',
    'CartItem',
    'Category',
    'Conversation',
    'Course',
    'Enquiry',
    'Follower',
    'Interest',
    'Message',
    'Order',
    'OrderItem',
    'OrganizerEvent',
    'Performance',
    'Post',
    'PostComment',
    'PostLike',
    'Recommendation',
    'Reminder',
    'RoleRequest',
    'SponsoredAd',
    'Ticket',
    'UserPreference'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow public read access to ' || table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow insert on ' || table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow update on ' || table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow delete on ' || table_name, table_name);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', 'Allow public read access to ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (true)', 'Allow insert on ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', 'Allow update on ' || table_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (true)', 'Allow delete on ' || table_name, table_name);
  END LOOP;
END $$;