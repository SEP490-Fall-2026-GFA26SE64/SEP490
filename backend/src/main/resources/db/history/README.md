# Original local migration sources

These files retain the exact original bytes of the local revision18 migrations whose version numbers collide with newer main migrations. They are historical source, outside all configured Flyway locations; do not configure `classpath:db` as a migration location.

Main migrations V1–V43 are unchanged. The same own functionality is represented by forward versions V44 (organization Assessment Policy), V45 (owned baseline binding) and V46 (the narrowly scoped bank/Occupation binding correction) in each active lineage.

The current initialization scope is a fresh database. No history-table adoption, checksum repair or automatic retained-database upgrade is provided. Do not run this new tree over an old revision18 database without a separately designed upgrade path. Never run these archived scripts as seed jobs.
