GRANT SELECT ON TABLE "review_items" TO admissions_automation;--> statement-breakpoint
GRANT UPDATE ("status", "reviewed_at") ON TABLE "review_items" TO admissions_automation;--> statement-breakpoint
DROP POLICY IF EXISTS "review_items_admissions_automation_read" ON "review_items";--> statement-breakpoint
CREATE POLICY "review_items_admissions_automation_read"
  ON "review_items" FOR SELECT TO admissions_automation USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "review_items_admissions_automation_update" ON "review_items";--> statement-breakpoint
CREATE POLICY "review_items_admissions_automation_update"
  ON "review_items" FOR UPDATE TO admissions_automation
  USING ("status" = 'pending'::"public"."review_item_status")
  WITH CHECK ("status" IN ('approved'::"public"."review_item_status", 'rejected'::"public"."review_item_status"));
