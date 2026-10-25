export async function loadProductionSchemaSnapshot(sql) {
  const [
    migrationRows,
    roleRows,
    ownershipRows,
    tableRows,
    columnRows,
    constraintRows,
    indexRows,
    policyRows,
    privilegeRows,
    columnPrivilegeRows,
    enumRows,
    triggerRows,
    functionRows,
  ] = await Promise.all([
    sql`
      select
        version,
        name,
        md5(array_to_string(statements, E'\n')) as statement_fingerprint
      from supabase_migrations.schema_migrations
      order by version
    `,
    sql`
      select
        database_role.rolname as name,
        database_role.rolcanlogin as can_login,
        database_role.rolbypassrls as bypass_rls,
        database_role.rolsuper as is_superuser,
        database_role.rolcreatedb as can_create_databases,
        database_role.rolcreaterole as can_create_roles,
        database_role.rolinherit as inherits_privileges,
        database_role.rolreplication as can_replicate,
        coalesce(
          jsonb_agg(parent_role.rolname) filter (where parent_role.rolname is not null),
          '[]'::jsonb
        ) as member_of
      from pg_roles database_role
      left join pg_auth_members membership on membership.member = database_role.oid
      left join pg_roles parent_role on parent_role.oid = membership.roleid
      where database_role.rolname = any(${[
        'anon',
        'authenticated',
        'app_runtime',
        'ops_readonly',
        'admissions_automation',
      ]})
      group by
        database_role.rolname,
        database_role.rolcanlogin,
        database_role.rolbypassrls,
        database_role.rolsuper,
        database_role.rolcreatedb,
        database_role.rolcreaterole,
        database_role.rolinherit,
        database_role.rolreplication
      order by database_role.rolname
    `,
    sql`
      select object_name
      from (
        select format('relation:%I.%I', namespace.nspname, relation.relname) as object_name
        from pg_class relation
        join pg_namespace namespace on namespace.oid = relation.relnamespace
        join pg_roles owner_role on owner_role.oid = relation.relowner
        where namespace.nspname = 'public'
          and owner_role.rolname = 'admissions_automation'
        union all
        select format('routine:%I.%I', namespace.nspname, routine.proname) as object_name
        from pg_proc routine
        join pg_namespace namespace on namespace.oid = routine.pronamespace
        join pg_roles owner_role on owner_role.oid = routine.proowner
        where namespace.nspname = 'public'
          and owner_role.rolname = 'admissions_automation'
        union all
        select format('type:%I.%I', namespace.nspname, type.typname) as object_name
        from pg_type type
        join pg_namespace namespace on namespace.oid = type.typnamespace
        join pg_roles owner_role on owner_role.oid = type.typowner
        where namespace.nspname = 'public'
          and owner_role.rolname = 'admissions_automation'
        union all
        select format('schema:%I', namespace.nspname) as object_name
        from pg_namespace namespace
        join pg_roles owner_role on owner_role.oid = namespace.nspowner
        where namespace.nspname = 'public'
          and owner_role.rolname = 'admissions_automation'
      ) owned
      order by object_name
    `,
    sql`
      select c.relname as table_name, c.relrowsecurity as row_level_security,
        array(select distinct privilege_type from aclexplode(acldefault('r', c.relowner))) as supported_privileges
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      order by c.relname
    `,
    sql`
      select
        c.relname as table_name,
        a.attname as column_name,
        format_type(a.atttypid, null) as column_type
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
        and a.attnum > 0 and not a.attisdropped
      order by c.relname, a.attnum
    `,
    sql`
      select c.relname as table_name, con.conname as constraint_name
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
      order by c.relname, con.conname
    `,
    sql`
      select tablename as table_name, indexname as index_name
      from pg_indexes
      where schemaname = 'public'
      order by tablename, indexname
    `,
    sql`
      select tablename as table_name, policyname as policy_name
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname
    `,
    sql`
      select
        c.relname as table_name,
        expected_role.role_name,
        privilege,
        case when expected_role.role_name = 'PUBLIC' then exists (
          select 1 from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
          where acl.grantee = 0 and acl.privilege_type = privilege
        ) else has_table_privilege(
          database_role.oid, format('%I.%I', n.nspname, c.relname), privilege
        ) end as allowed
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join unnest(${[
        'PUBLIC',
        'service_role',
        'anon',
        'authenticated',
        'app_runtime',
        'ops_readonly',
        'admissions_automation',
      ]}::text[]) as expected_role(role_name)
      left join pg_roles database_role on database_role.rolname = expected_role.role_name
      cross join lateral (
        select distinct privilege_type as privilege
        from aclexplode(acldefault('r', c.relowner))
        where c.relname = 'enquiries' or privilege_type <> 'MAINTAIN'
      ) supported
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      order by c.relname, role_name, privilege
    `,
    sql`
      select
        c.relname as table_name,
        database_role.rolname as role_name,
        column_privilege.privilege,
        attribute.attname as column_name,
        has_column_privilege(
          database_role.oid,
          format('%I.%I', n.nspname, c.relname),
          attribute.attname,
          column_privilege.privilege
        ) as allowed
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute attribute on attribute.attrelid = c.oid
      cross join pg_roles database_role
      cross join unnest(${['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']}::text[]) as column_privilege(privilege)
      where n.nspname = 'public'
        and (
          (database_role.rolname = 'admissions_automation' and c.relname = 'admission_thresholds'
            and column_privilege.privilege <> 'SELECT')
          or (database_role.rolname = any(${['anon', 'authenticated', 'app_runtime', 'ops_readonly']}::text[])
            and c.relname = any(${['ingestion_sources', 'ingestion_jobs', 'review_items', 'enquiries']}::text[]))
          or (database_role.rolname = 'admissions_automation' and c.relname = 'review_items'
            and column_privilege.privilege in ('UPDATE', 'REFERENCES'))
          or (database_role.rolname = 'admissions_automation' and c.relname = 'enquiries')
        )
        and c.relkind in ('r', 'p')
        and attribute.attnum > 0
        and not attribute.attisdropped
      union all
      select c.relname, 'PUBLIC', acl.privilege_type, attribute.attname, true
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute attribute on attribute.attrelid = c.oid
      cross join lateral aclexplode(attribute.attacl) acl
      where n.nspname = 'public' and c.relname = 'enquiries'
        and attribute.attnum > 0 and not attribute.attisdropped and acl.grantee = 0
      order by table_name, role_name, privilege, column_name
    `,
    sql`
      select
        t.typname as enum_name,
        e.enumlabel as enum_value
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      order by t.typname, e.enumsortorder
    `,
    sql`
      select distinct t.tgname as trigger_name
      from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where not t.tgisinternal and t.tgenabled <> 'D' and
        (n.nspname = 'public' or (n.nspname='auth' and c.relname='users' and t.tgname='admission_alert_account_deleted'))
      order by trigger_name
    `,
    sql`
      select
        case
          when n.nspname='public' and p.proname='store_enquiry'
            then p.proname||'('||oidvectortypes(p.proargtypes)||')'
          when n.nspname='public' then p.proname
          else n.nspname||'.'||p.proname
        end as function_name,
        coalesce(p.proconfig, array[]::text[]) as function_config,
        case when n.nspname='public' and p.proname='store_enquiry' and p.prokind='f'
          then pg_get_functiondef(p.oid) end as function_definition,
        p.prosecdef as security_definer,
        array(select r.rolname from pg_roles r
          where (r.rolname = any(array['anon','authenticated','app_runtime','ops_readonly','admissions_automation'])
            or (p.proname='store_enquiry' and n.nspname='public' and r.rolname='service_role'))
            and has_function_privilege(r.oid, p.oid, 'EXECUTE')
          order by r.rolname)
        || case when p.proname='store_enquiry' and n.nspname='public' and exists (
          select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
          where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
        ) then array['PUBLIC']::text[] else array[]::text[] end as execute_roles
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public','admission_alert_private')
      order by p.proname, p.oid
    `,
  ]);

  const tables = {};
  for (const row of tableRows) {
    tables[row.table_name] = {
      columns: [],
      columnTypes: {},
      constraints: [],
      indexes: [],
      rowLevelSecurity: row.row_level_security,
      supportedPrivileges: row.supported_privileges,
      policies: [],
      grants: {},
      columnGrants: {},
    };
  }
  for (const row of columnRows) {
    const table = tables[row.table_name];
    if (!table) continue;
    table.columns.push(row.column_name);
    table.columnTypes[row.column_name] = row.column_type;
  }
  for (const row of constraintRows) {
    tables[row.table_name]?.constraints.push(row.constraint_name);
  }
  for (const row of indexRows) {
    tables[row.table_name]?.indexes.push(row.index_name);
  }
  for (const row of policyRows) {
    tables[row.table_name]?.policies.push(row.policy_name);
  }
  for (const row of privilegeRows) {
    if (!row.allowed || !tables[row.table_name]) continue;
    const roleGrants = (tables[row.table_name].grants[row.role_name] ??= []);
    roleGrants.push(row.privilege);
  }
  for (const row of columnPrivilegeRows) {
    if (!row.allowed || !tables[row.table_name]) continue;
    const roleColumnGrants = (tables[row.table_name].columnGrants[row.role_name] ??= {});
    const privilegeColumns = (roleColumnGrants[row.privilege] ??= []);
    privilegeColumns.push(row.column_name);
  }

  const enums = {};
  for (const row of enumRows) {
    (enums[row.enum_name] ??= []).push(row.enum_value);
  }

  return {
    migrationHistory: migrationRows.map((row) => ({
      version: row.version,
      name: row.name,
      statementFingerprint: row.statement_fingerprint,
    })),
    roles: roleRows.map((row) => ({
      name: row.name,
      canLogin: row.can_login,
      bypassRls: row.bypass_rls,
      isSuperuser: row.is_superuser,
      canCreateDatabases: row.can_create_databases,
      canCreateRoles: row.can_create_roles,
      inheritsPrivileges: row.inherits_privileges,
      canReplicate: row.can_replicate,
      memberOf: row.member_of,
      ownedPublicObjects: ownershipRows.map((ownership) => ownership.object_name),
    })),
    tables,
    enums,
    triggers: triggerRows.map((row) => row.trigger_name),
    functions: Object.fromEntries(
      functionRows.map((row) => [row.function_name, row.function_config]),
    ),
    functionDefinitions: Object.fromEntries(
      functionRows
        .filter((row) => typeof row.function_definition === 'string')
        .map((row) => [row.function_name, row.function_definition]),
    ),
    functionAccess: Object.fromEntries(
      functionRows.map((row) => [
        row.function_name,
        {
          securityDefiner: row.security_definer,
          executeRoles: row.execute_roles,
        },
      ]),
    ),
  };
}
