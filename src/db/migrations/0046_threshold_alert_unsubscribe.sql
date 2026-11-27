ALTER TABLE "threshold_alert_signups" ADD COLUMN "unsubscribe_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "threshold_alert_signups" ADD COLUMN "unsubscribed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "threshold_alert_signups" ADD CONSTRAINT "threshold_alert_signups_unsubscribe_token_unique" UNIQUE("unsubscribe_token");--> statement-breakpoint
-- Bearer capability: runtime can only suppress, never read contacts or reactivate.
CREATE OR REPLACE FUNCTION public.unsubscribe_threshold_alert_signup(token uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target public.threshold_alert_signups%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.threshold_alert_signups WHERE unsubscribe_token = token;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.threshold_alert_signups
  SET unsubscribed_at = COALESCE(unsubscribed_at, now())
  WHERE request_id = target.request_id
     OR (target.email IS NOT NULL AND email = target.email)
     OR (target.phone IS NOT NULL AND phone = target.phone);
  RETURN true;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.unsubscribe_threshold_alert_signup(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.unsubscribe_threshold_alert_signup(uuid) TO app_runtime;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
    REVOKE ALL ON FUNCTION public.unsubscribe_threshold_alert_signup(uuid) FROM ops_readonly;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admissions_automation') THEN
    REVOKE ALL ON FUNCTION public.unsubscribe_threshold_alert_signup(uuid) FROM admissions_automation;
  END IF;
END $$;
