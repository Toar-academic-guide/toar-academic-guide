ALTER TABLE "admission_alert_outbox" ADD COLUMN "recipient_hash" text;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS admission_alert_private;
--> statement-breakpoint
REVOKE ALL ON SCHEMA admission_alert_private FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT USAGE ON SCHEMA admission_alert_private TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION admission_alert_private.delivery_recipient(delivery_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.email FROM public.admission_alert_outbox o
  JOIN public.admission_alert_subscriptions s ON s.id = o.subscription_id
  JOIN auth.users u ON u.id = s.user_id
  WHERE o.id = delivery_id AND u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL AND u.deleted_at IS NULL AND NOT coalesce(u.is_anonymous, false)
    AND (u.banned_until IS NULL OR u.banned_until <= current_timestamp)
    AND (auth.uid() IS NULL OR auth.uid() = s.user_id)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admission_alert_private.delivery_recipient(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admission_alert_private.delivery_recipient(uuid) TO app_runtime;
--> statement-breakpoint
CREATE FUNCTION admission_alert_private.cleanup_deleted_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE subscription_ids text[];
BEGIN
  -- Serialize with profile changes, activation, and category unsubscribe.
  PERFORM 1 FROM public.user_profiles WHERE user_id = OLD.id FOR UPDATE;
  SELECT array_agg(id::text) INTO subscription_ids FROM public.admission_alert_subscriptions WHERE user_id = OLD.id;
  IF subscription_ids IS NOT NULL THEN
    UPDATE public.admission_alert_transition_work SET retry_state = retry_state - subscription_ids
      WHERE retry_state ?| subscription_ids;
  END IF;
  DELETE FROM public.admission_alert_webhook_events e USING public.admission_alert_outbox o,
    public.admission_alert_subscriptions s WHERE e.outbox_id=o.id AND o.subscription_id=s.id AND s.user_id=OLD.id;
  DELETE FROM public.admission_alert_subscriptions WHERE user_id=OLD.id;
  DELETE FROM public.admission_alert_email_preferences WHERE user_id=OLD.id;
  DELETE FROM public.user_profiles WHERE user_id=OLD.id;
  DELETE FROM public.bagrut_profile_versions WHERE user_id=OLD.id;
  DELETE FROM public.saved_programs WHERE user_id=OLD.id;
  RETURN OLD;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admission_alert_private.cleanup_deleted_account() FROM PUBLIC, anon, authenticated, app_runtime;
--> statement-breakpoint
CREATE TRIGGER admission_alert_account_deleted AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION admission_alert_private.cleanup_deleted_account();
--> statement-breakpoint
CREATE FUNCTION admission_alert_private.prune_retained_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE subscription_ids uuid[]; webhook_count integer; subscription_count integer;
BEGIN
  DELETE FROM public.admission_alert_webhook_events WHERE received_at <= current_timestamp - interval '30 days';
  GET DIAGNOSTICS webhook_count = ROW_COUNT;
  SELECT array_agg(id) INTO subscription_ids FROM (
    SELECT id FROM public.admission_alert_subscriptions
    WHERE CASE WHEN cycle ~ '^[0-9]{4}$' THEN
      make_timestamptz(cycle::integer + 1, 10, 1, 0, 0, 0, 'Asia/Jerusalem') <= current_timestamp
      ELSE false END
    ORDER BY id LIMIT 1000 FOR UPDATE SKIP LOCKED
  ) expired;
  IF subscription_ids IS NOT NULL THEN
    UPDATE public.admission_alert_transition_work SET retry_state = retry_state - subscription_ids::text[]
      WHERE retry_state ?| subscription_ids::text[];
    DELETE FROM public.admission_alert_webhook_events e USING public.admission_alert_outbox o
      WHERE e.outbox_id=o.id AND o.subscription_id=ANY(subscription_ids);
    DELETE FROM public.admission_alert_subscriptions WHERE id=ANY(subscription_ids);
    GET DIAGNOSTICS subscription_count = ROW_COUNT;
  END IF;
  RETURN jsonb_build_object('webhookEventsDeleted',webhook_count,'subscriptionsDeleted',coalesce(subscription_count,0));
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admission_alert_private.prune_retained_data() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admission_alert_private.prune_retained_data() TO app_runtime;
