import { randomUUID } from 'crypto';
import { pool } from '../../config/database';
import { parseJson } from '../../shared/automation/automation-context';
import { AuditService } from '../../shared/audit/audit.service';
import { AppError } from '../../shared/errors/AppError';
import type { AutomationRuleInput } from './craft-automations.types';

const normalizeRule = (row: any) => ({ ...row, id: Number(row.id), version_no: Number(row.version_no), priority: Number(row.priority), cooldown_seconds: Number(row.cooldown_seconds || 0), max_retries: Number(row.max_retries || 0), is_system: Boolean(row.is_system), condition_json: parseJson(row.condition_json, null), action_json: parseJson(row.action_json, { version: 1, actions: [] }), trigger_config_json: parseJson(row.trigger_config_json, null) });
const normalizeRun = (row: any) => ({ ...row, id: Number(row.id), rule_id: Number(row.rule_id), rule_version: Number(row.rule_version), trigger_entity_id: row.trigger_entity_id === null ? null : Number(row.trigger_entity_id), initiated_by: row.initiated_by === null ? null : Number(row.initiated_by), attempt_no: Number(row.attempt_no), chain_depth: Number(row.chain_depth || 0), input_json: parseJson(row.input_json, null), rule_snapshot_json: parseJson(row.rule_snapshot_json, null), result_json: parseJson(row.result_json, null) });

export class CraftAutomationsRepository {
  async listRules(businessUnitId: number, filters: Record<string, unknown>, organizationId?: number) {
    const where = ['r.business_unit_id=?']; const params: unknown[] = [businessUnitId];
    if (organizationId !== undefined) { where.push('r.organization_id=?'); params.push(organizationId); }
    if (filters.status) { where.push('r.status_code=?'); params.push(String(filters.status)); }
    if (filters.module) { where.push('r.module_code=?'); params.push(String(filters.module)); }
    if (filters.trigger_type) { where.push('r.trigger_type=?'); params.push(String(filters.trigger_type)); }
    if (filters.search) { where.push('(r.rule_code LIKE ? OR r.name LIKE ? OR r.description LIKE ?)'); params.push(...Array(3).fill(`%${String(filters.search)}%`)); }
    const [rows]: any = await pool.execute(`SELECT r.*, (SELECT COUNT(*) FROM automation_runs ar WHERE ar.rule_id=r.id) total_runs, (SELECT COUNT(*) FROM automation_runs ar WHERE ar.rule_id=r.id AND ar.status_code='success') success_runs, (SELECT COUNT(*) FROM automation_runs ar WHERE ar.rule_id=r.id AND ar.status_code='failed') failed_runs FROM automation_rules r WHERE ${where.join(' AND ')} ORDER BY r.priority,r.id DESC`, params as any[]);
    return rows.map(normalizeRule);
  }

  async getRule(id: number, businessUnitId: number, organizationId?: number, lock = false) {
    const connection = lock ? await pool.getConnection() : null;
    try {
      const db = connection || pool;
      const params: unknown[] = [id, businessUnitId];
      const organizationClause = organizationId === undefined ? '' : ' AND organization_id=?';
      if (organizationId !== undefined) params.push(organizationId);
      const [rows]: any = await db.execute(`SELECT * FROM automation_rules WHERE id=? AND business_unit_id=?${organizationClause} ${lock ? 'FOR UPDATE' : ''}`, params as any[]);
      return rows.length ? normalizeRule(rows[0]) : null;
    }
    finally { connection?.release(); }
  }

  async createRule(input: AutomationRuleInput, context: { organizationId: number; businessUnitId: number; userId: number; moduleCode: string; auditModuleCode?: string; nextRunAt?: Date | null }) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const temporaryCode = `TMP-${randomUUID()}`;
      const [inserted]: any = await connection.execute(`INSERT INTO automation_rules (organization_id,business_unit_id,rule_code,name,description,module_code,trigger_type,trigger_event,trigger_config_json,schedule_timezone,condition_json,action_json,status_code,priority,cooldown_seconds,max_retries,next_run_at,created_by,updated_by) VALUES (?,?,?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [context.organizationId, context.businessUnitId, temporaryCode, input.name, input.description || null, context.moduleCode, input.trigger_type, input.trigger_event, input.trigger_config_json ? JSON.stringify(input.trigger_config_json) : null, input.schedule_timezone || null, input.condition_json ? JSON.stringify(input.condition_json) : null, JSON.stringify(input.action_json), input.status_code || 'draft', input.priority ?? 100, input.cooldown_seconds ?? 0, input.max_retries ?? 0, context.nextRunAt || null, context.userId, context.userId]);
      const id = Number(inserted.insertId); const code = `AUT-${String(id).padStart(6, '0')}`;
      await connection.execute('UPDATE automation_rules SET rule_code=? WHERE id=? AND organization_id=? AND business_unit_id=?', [code, id, context.organizationId, context.businessUnitId]);
      await this.audit(connection, context, 'automation.rule_create', 'automation_rule', id, code, `Membuat aturan otomasi ${code}.`, input);
      await connection.commit(); return { id, rule_code: code };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async updateRule(id: number, next: AutomationRuleInput, context: { organizationId: number; businessUnitId: number; userId: number; moduleCode: string; auditModuleCode?: string; nextRunAt?: Date | null; expectedVersion?: number }) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try {
      const [rows]: any = await connection.execute('SELECT * FROM automation_rules WHERE id=? AND business_unit_id=? AND organization_id=? FOR UPDATE', [id, context.businessUnitId, context.organizationId]);
      if (!rows.length) return null; const previous = normalizeRule(rows[0]);
      if (context.expectedVersion !== undefined && previous.version_no !== context.expectedVersion) throw new AppError(409, 'AUTOMATION_VERSION_CONFLICT', 'Aturan telah diperbarui oleh pengguna lain. Muat ulang sebelum menyimpan.');
      const [updated]: any = await connection.execute(`UPDATE automation_rules SET name=?,description=?,module_code=?,trigger_type=?,trigger_event=?,trigger_config_json=?,schedule_timezone=?,condition_json=?,action_json=?,status_code=?,priority=?,cooldown_seconds=?,max_retries=?,next_run_at=?,version_no=version_no+1,updated_by=? WHERE id=? AND organization_id=? AND business_unit_id=? AND version_no=?`, [next.name, next.description || null, context.moduleCode, next.trigger_type, next.trigger_event, next.trigger_config_json ? JSON.stringify(next.trigger_config_json) : null, next.schedule_timezone || null, next.condition_json ? JSON.stringify(next.condition_json) : null, JSON.stringify(next.action_json), next.status_code || previous.status_code, next.priority ?? 100, next.cooldown_seconds ?? 0, next.max_retries ?? 0, context.nextRunAt || null, context.userId, id, context.organizationId, context.businessUnitId, previous.version_no]);
      if (!updated.affectedRows) throw new AppError(409, 'AUTOMATION_VERSION_CONFLICT', 'Aturan telah diperbarui oleh pengguna lain. Muat ulang sebelum menyimpan.');
      await this.audit(connection, context, 'automation.rule_update', 'automation_rule', id, previous.rule_code, `Memperbarui aturan otomasi ${previous.rule_code}.`, { version_no: previous.version_no }, { ...next, version_no: previous.version_no + 1 });
      await connection.commit(); return { id, rule_code: previous.rule_code };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async changeStatus(id: number, status: string, context: { organizationId: number; businessUnitId: number; userId: number; auditModuleCode?: string; nextRunAt?: Date | null }) {
    const connection = await pool.getConnection(); await connection.beginTransaction();
    try { const [rows]: any = await connection.execute('SELECT rule_code,status_code FROM automation_rules WHERE id=? AND business_unit_id=? AND organization_id=? FOR UPDATE', [id, context.businessUnitId, context.organizationId]); if (!rows.length) return null; await connection.execute('UPDATE automation_rules SET status_code=?,next_run_at=?,updated_by=? WHERE id=? AND organization_id=? AND business_unit_id=?', [status, context.nextRunAt || null, context.userId, id, context.organizationId, context.businessUnitId]); await this.audit(connection, context, `automation.rule_${status}`, 'automation_rule', id, rows[0].rule_code, `Status aturan ${rows[0].rule_code} menjadi ${status}.`, { status_code: rows[0].status_code }, { status_code: status }); await connection.commit(); return { id, status_code: status }; }
    catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async duplicateRule(id: number, context: { organizationId: number; businessUnitId: number; userId: number; auditModuleCode?: string }) {
    const rule = await this.getRule(id, context.businessUnitId, context.organizationId); if (!rule) return null;
    return this.createRule({ ...rule, name: `${rule.name} (Salinan)`.slice(0, 180), status_code: 'draft' }, { ...context, moduleCode: rule.module_code, nextRunAt: null });
  }

  async listRuns(businessUnitId: number, filters: Record<string, unknown>, organizationId?: number) {
    const where = ['r.business_unit_id=?']; const params: unknown[] = [businessUnitId];
    if (organizationId !== undefined) { where.push('r.organization_id=?'); params.push(organizationId); }
    if (filters.status) { where.push('ar.status_code=?'); params.push(String(filters.status)); }
    if (filters.rule_id) { where.push('ar.rule_id=?'); params.push(Number(filters.rule_id)); }
    if (filters.trigger_event) { where.push('ar.trigger_event=?'); params.push(String(filters.trigger_event)); }
    if (filters.module) { where.push('r.module_code=?'); params.push(String(filters.module)); }
    const [rows]: any = await pool.execute(`SELECT ar.*,r.rule_code,r.name rule_name,r.module_code FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE ${where.join(' AND ')} ORDER BY ar.started_at DESC,ar.id DESC LIMIT 250`, params as any[]); return rows.map(normalizeRun);
  }
  async getRun(id: number, businessUnitId: number, organizationId?: number) { const params: unknown[] = [id, businessUnitId]; const organizationClause = organizationId === undefined ? '' : ' AND r.organization_id=?'; if (organizationId !== undefined) params.push(organizationId); const [rows]: any = await pool.execute(`SELECT ar.*,r.rule_code,r.name rule_name,r.module_code FROM automation_runs ar JOIN automation_rules r ON r.id=ar.rule_id WHERE ar.id=? AND r.business_unit_id=?${organizationClause}`, params as any[]); return rows.length ? normalizeRun(rows[0]) : null; }
  async recentEvents(businessUnitId: number, organizationId?: number) { const params: unknown[] = [businessUnitId]; const organizationClause = organizationId === undefined ? '' : ' AND organization_id=?'; if (organizationId !== undefined) params.push(organizationId); const [rows]: any = await pool.execute(`SELECT id,event_name,module_code,entity_type,entity_id,entity_code,correlation_id,chain_depth,status_code,attempt_count,available_at,locked_at,processed_at,last_error,created_at FROM domain_events WHERE business_unit_id=?${organizationClause} ORDER BY id DESC LIMIT 100`, params as any[]); return rows.map((row: any) => ({ ...row, id: Number(row.id), entity_id: row.entity_id === null ? null : Number(row.entity_id), chain_depth: Number(row.chain_depth || 0), attempt_count: Number(row.attempt_count || 0) })); }
  async audit(connection: any, context: { organizationId: number; businessUnitId: number; userId: number; auditModuleCode?: string }, action: string, entityType: string, entityId: number, entityCode: string, description: string, oldValues?: unknown, newValues?: unknown) { await AuditService.write({ organizationId: context.organizationId, businessUnitId: context.businessUnitId, userId: context.userId, moduleCode: context.auditModuleCode || 'craft_automations', actionCode: action, entityType, entityId, entityCode, description, oldValues, newValues }, connection); }
}

export { normalizeRule, normalizeRun };
