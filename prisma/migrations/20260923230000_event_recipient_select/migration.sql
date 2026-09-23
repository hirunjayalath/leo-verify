-- Recipients can SELECT Event rows for certificates they already see.
DROP POLICY IF EXISTS event_recipient_select ON "Event";
CREATE POLICY event_recipient_select ON "Event"
  FOR SELECT
  USING (
    id IN (
      SELECT "eventId" FROM "Certificate"
      WHERE
        "recipientEmail" IN (SELECT public.current_recipient_emails())
        OR "recipientId" IN (SELECT public.current_recipient_ids())
    )
  );
