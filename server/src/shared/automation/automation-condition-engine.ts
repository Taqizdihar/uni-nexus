import { automationEventRegistry } from './automation-event-registry';
import { AutomationValidationError } from './automation-errors';

export type AutomationOperator = 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_null' | 'not_null' | 'before' | 'after' | 'within_hours' | 'changed_from' | 'changed_to';
export interface AutomationCondition { field: string; operator: AutomationOperator; value?: unknown; }
export interface AutomationConditionGroup { version?: number; logic: 'all' | 'any'; conditions: Array<AutomationCondition | AutomationConditionGroup>; }

const DANGEROUS_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const OPERATORS: AutomationOperator[] = ['eq', 'neq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'is_null', 'not_null', 'before', 'after', 'within_hours', 'changed_from', 'changed_to'];

const getValue = (context: Record<string, any>, path: string): unknown => path.split('.').reduce((value, segment) => value && typeof value === 'object' ? value[segment] : undefined, context);
const asTime = (value: unknown) => value instanceof Date ? value.getTime() : new Date(String(value)).getTime();

export class AutomationConditionEngine {
  validate(triggerEvent: string, group: AutomationConditionGroup | null | undefined, depth = 0): void {
    if (!group) return;
    if (depth > 5) throw new AutomationValidationError('Kedalaman kondisi maksimal lima tingkat.');
    if (!['all', 'any'].includes(group.logic) || !Array.isArray(group.conditions) || group.conditions.length > 20) throw new AutomationValidationError('Kelompok kondisi tidak valid.');
    const allowed = new Map(automationEventRegistry.fieldsFor(triggerEvent).map((field) => [field.field, field]));
    for (const condition of group.conditions) {
      if ('conditions' in condition) { this.validate(triggerEvent, condition, depth + 1); continue; }
      if (!condition.field || condition.field.split('.').some((part) => DANGEROUS_SEGMENTS.has(part)) || !allowed.has(condition.field)) throw new AutomationValidationError(`Field kondisi ${condition.field || ''} tidak didukung untuk pemicu ini.`);
      if (!OPERATORS.includes(condition.operator)) throw new AutomationValidationError('Operator kondisi tidak didukung.');
      const type = allowed.get(condition.field)!.type;
      if (['gt', 'gte', 'lt', 'lte'].includes(condition.operator) && type !== 'number') throw new AutomationValidationError('Operator numerik hanya dapat digunakan pada field angka.');
      if (['before', 'after', 'within_hours'].includes(condition.operator) && type !== 'date') throw new AutomationValidationError('Operator waktu hanya dapat digunakan pada field tanggal.');
      if ((condition.operator === 'in' || condition.operator === 'not_in') && !Array.isArray(condition.value)) throw new AutomationValidationError('Nilai operator in harus berupa daftar.');
    }
  }

  evaluate(triggerEvent: string, group: AutomationConditionGroup | null | undefined, context: Record<string, any>, depth = 0): { matched: boolean; evaluations: any[] } {
    this.validate(triggerEvent, group, depth);
    if (!group || !group.conditions.length) return { matched: true, evaluations: [] };
    const evaluations = group.conditions.map((condition) => {
      if ('conditions' in condition) return this.evaluate(triggerEvent, condition, context, depth + 1);
      const actual = getValue(context, condition.field);
      const expected = condition.value;
      let matched = false;
      switch (condition.operator) {
        case 'eq': matched = actual === expected; break;
        case 'neq': matched = actual !== expected; break;
        case 'in': matched = Array.isArray(expected) && expected.includes(actual); break;
        case 'not_in': matched = Array.isArray(expected) && !expected.includes(actual); break;
        case 'gt': matched = Number(actual) > Number(expected); break;
        case 'gte': matched = Number(actual) >= Number(expected); break;
        case 'lt': matched = Number(actual) < Number(expected); break;
        case 'lte': matched = Number(actual) <= Number(expected); break;
        case 'contains': matched = String(actual ?? '').includes(String(expected ?? '')); break;
        case 'not_contains': matched = !String(actual ?? '').includes(String(expected ?? '')); break;
        case 'is_null': matched = actual === null || actual === undefined; break;
        case 'not_null': matched = actual !== null && actual !== undefined; break;
        case 'before': matched = asTime(actual) < asTime(expected); break;
        case 'after': matched = asTime(actual) > asTime(expected); break;
        case 'within_hours': matched = Number.isFinite(asTime(actual)) && asTime(actual) >= Date.now() && asTime(actual) <= Date.now() + Number(expected) * 3_600_000; break;
        case 'changed_from': matched = actual === expected; break;
        case 'changed_to': matched = actual === expected; break;
      }
      return { field: condition.field, operator: condition.operator, expected, actual, matched };
    });
    return { matched: group.logic === 'all' ? evaluations.every((item) => item.matched) : evaluations.some((item) => item.matched), evaluations };
  }
}

export const automationConditionEngine = new AutomationConditionEngine();
export const automationOperators = OPERATORS;
