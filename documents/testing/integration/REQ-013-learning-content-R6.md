# REQ-013 / FR-06.06, FR-06.09 — R6 integration boundary

Date: 2026-10-29. **No new Testcontainers scenario is applicable:** R6 changes frontend presentation only. It adds no endpoint/DTO, SQL migration, field, graph mapping, persistence implementation or backend authorization behavior. Existing V35–V38 assignments/pins/progress/private files remain unchanged. R5's PostgreSQL result is historical, not counted as a new R6 run.

Current integration acceptance uses the existing Compose API and stores through the [R6 browser flow](../system/REQ-013-learning-content-R6.md): assigned released snapshots, real private MP4 byte ranges/playback, lesson data, persisted active lesson/position and reload. Empty/error UI cases use explicitly labeled response fixtures, not fake application data or deleted account assignments. Backend regression policies and architecture checks were rerun as recorded in [unit evidence](../unit/REQ-013-learning-content-R6.md).
