-- Apply only after explicit approval for the shared preview/production database.
-- Run inside a transaction. Evidence: 2026-10-21-calculator-routing.json.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM source_freshness_states WHERE source_id='tau-communication-live' AND status='fresh' AND reviewed_source_fingerprint IN ('sha256:7f9160db9c455cf662f56d033203a2046e97f1d1c50f8dd2ab9b9a3b9ea6a69','sha256:04e202dd1326f4ce1db5431a9e81b4a96e56b321b91b442d05f892b7fc49857d')) THEN
    RAISE EXCEPTION 'Source changed since review: tau-communication-live';
  END IF;
  UPDATE source_freshness_states SET reviewed_source_fingerprint='sha256:04e202dd1326f4ce1db5431a9e81b4a96e56b321b91b442d05f892b7fc49857d', last_exact_check_at='2026-10-21T13:34:30.013Z'::timestamptz, last_checked_at='2026-10-21T13:34:30.013Z'::timestamptz, last_successful_check_at='2026-10-21T13:34:30.013Z'::timestamptz, updated_at='2026-10-21T13:34:30.013Z'::timestamptz, raw_fingerprint='918537026725479ad895f4c7693dc4f2f91e597d256495e99f47b61af33df12f', normalized_fingerprint='21ea5a204df976e6fe2cc808734d1042a516e2d483fa54927e734cd6402525ed', normalized_decision_payload='{"fields":{"acceptanceThreshold":530,"derivedVerdict":"below","exactSciencesBonus":0,"matchedProgramIds":["108511050000","108511054185"],"matchedProgramTitle":"תואר ראשון בלימודי תקשורת","programId":"tau-communication","programName":"Communication","rejectionThreshold":529,"selectedScore":496,"selectedScoreField":"hatama"}}'::jsonb WHERE source_id='tau-communication-live';
  IF NOT EXISTS (SELECT 1 FROM source_freshness_states WHERE source_id='technion-technion_civil-live' AND status='fresh' AND reviewed_source_fingerprint IN ('sha256:ae4b286298793e6f2ae7601aaeb51d7eb2e988ca9a99df4797c22bc6ead2afa5','sha256:ae4b286298793e6f2ae7601aaeb51d7eb2e988ca9a99df4797c22bc6ead2afa5')) THEN
    RAISE EXCEPTION 'Source changed since review: technion-technion_civil-live';
  END IF;
  UPDATE source_freshness_states SET reviewed_source_fingerprint='sha256:ae4b286298793e6f2ae7601aaeb51d7eb2e988ca9a99df4797c22bc6ead2afa5', last_exact_check_at='2026-10-21T13:34:30.013Z'::timestamptz, last_checked_at='2026-10-21T13:34:30.013Z'::timestamptz, last_successful_check_at='2026-10-21T13:34:30.013Z'::timestamptz, updated_at='2026-10-21T13:34:30.013Z'::timestamptz, raw_fingerprint='3b980bd45773e56abab0f01283b45ffa5f10628b9a0f9acb97db187a572cacdc', normalized_fingerprint='24d5d0f6aef8819e7dada4e2418f10ba4220eb88400c7925f4ba81e9a9f16080', normalized_decision_payload='{"fields":{"acceptanceThreshold":87,"derivedVerdict":"below","programId":"technion_civil","programName":"technion_civil","rejectionThreshold":87,"sekhemScore":73.9,"selectedScore":73.9}}'::jsonb WHERE source_id='technion-technion_civil-live';
  IF NOT EXISTS (SELECT 1 FROM admission_thresholds WHERE id='technion_civil:technion:technion:sekhem' AND threshold_value IN (87,88)) THEN
    RAISE EXCEPTION 'Civil engineering cutoff changed since review';
  END IF;
  UPDATE admission_thresholds SET threshold_value=87 WHERE id='technion_civil:technion:technion:sekhem';
END $$;
