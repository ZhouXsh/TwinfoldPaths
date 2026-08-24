import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Schema 与 TypeScript 类型一致性测试（ADR-012）。
 * 当 LevelDef/Entity 类型发生变化时，此处测试应同步更新以反映 Schema 约束。
 */
describe('Schema 与类型一致性', () => {
  const schemaPath = resolve(process.cwd(), 'schemas', 'level.schema.json');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as any;
  const allOf = schema.$defs.entity.allOf as Array<Record<string, unknown>>;

  it('Schema 版本为 1', () => {
    expect(schema.properties.schemaVersion.const).toBe(1);
  });

  it('Schema 必填字段包含所有 LevelDef 关键字段', () => {
    const required = schema.required as string[];
    const expectedFields = [
      'schemaVersion',
      'id',
      'chapter',
      'order',
      'title',
      'grid',
      'blueStart',
      'orangeStart',
      'blueExit',
      'orangeExit',
      'initialMapping',
      'walls',
      'entities',
      'parMoves',
      'hint',
      'tags'
    ];
    for (const f of expectedFields) {
      expect(required, `缺少必填字段: ${f}`).toContain(f);
    }
  });

  it('Schema 实体类型枚举包含全部 10 种 Entity', () => {
    const entityEnum = schema.$defs.entity.properties.type.enum as string[];
    const expectedTypes = [
      'door',
      'plate',
      'colorDoor',
      'pauseTile',
      'switcher',
      'oneWay',
      'portal',
      'fragile',
      'pulseSwitch',
      'pulseDoor'
    ];
    expect(entityEnum.sort()).toEqual(expectedTypes.sort());
  });

  it('Schema 映射模式枚举包含全部 3 种', () => {
    const mappingEnum = schema.properties.initialMapping.enum as string[];
    expect(mappingEnum.sort()).toEqual(['H_MIRROR', 'ROTATE_CW', 'V_MIRROR']);
  });

  it('Schema 方向枚举包含全部 4 种', () => {
    const dirEntry = allOf.find((a) => {
      const ifBlock = a.if as Record<string, unknown> | undefined;
      const props = ifBlock?.properties as Record<string, unknown> | undefined;
      const typeProp = props?.type as Record<string, unknown> | undefined;
      return typeProp?.const === 'oneWay';
    });
    const thenBlock = dirEntry?.then as Record<string, unknown> | undefined;
    const thenProps = thenBlock?.properties as Record<string, unknown> | undefined;
    const arrowProp = thenProps?.arrow as Record<string, unknown> | undefined;
    const dirEnum = arrowProp?.enum as string[] | undefined;
    expect(dirEnum?.sort()).toEqual(['DOWN', 'LEFT', 'RIGHT', 'UP']);
  });

  it('Schema 网格尺寸范围 2..32', () => {
    const widthProps = schema.properties.grid.properties.width;
    expect(widthProps.minimum).toBe(2);
    expect(widthProps.maximum).toBe(32);
    const heightProps = schema.properties.grid.properties.height;
    expect(heightProps.minimum).toBe(2);
    expect(heightProps.maximum).toBe(32);
  });

  it('Schema 的 parMovesNote 为可选字段', () => {
    const required = schema.required as string[];
    expect(required).not.toContain('parMovesNote');
    expect(schema.properties.parMovesNote).toBeDefined();
  });

  it('Schema 实体 sub-schema 包含 door 的 id 必填', () => {
    const entry = allOf.find((a) => {
      const ifBlock = a.if as Record<string, unknown> | undefined;
      const props = ifBlock?.properties as Record<string, unknown> | undefined;
      const typeProp = props?.type as Record<string, unknown> | undefined;
      return typeProp?.const === 'door';
    });
    const thenBlock = entry?.then as Record<string, unknown> | undefined;
    const required = thenBlock?.required as string[] | undefined;
    expect(required).toContain('id');
  });

  it('Schema 实体 sub-schema 包含 plate 的 id 和 doorId 必填', () => {
    const entry = allOf.find((a) => {
      const ifBlock = a.if as Record<string, unknown> | undefined;
      const props = ifBlock?.properties as Record<string, unknown> | undefined;
      const typeProp = props?.type as Record<string, unknown> | undefined;
      return typeProp?.const === 'plate';
    });
    const thenBlock = entry?.then as Record<string, unknown> | undefined;
    const required = thenBlock?.required as string[] | undefined;
    expect(required).toContain('id');
    expect(required).toContain('doorId');
  });

  it('Schema 实体 sub-schema 包含 portal 的 portalId 和 end 必填', () => {
    const entry = allOf.find((a) => {
      const ifBlock = a.if as Record<string, unknown> | undefined;
      const props = ifBlock?.properties as Record<string, unknown> | undefined;
      const typeProp = props?.type as Record<string, unknown> | undefined;
      return typeProp?.const === 'portal';
    });
    const thenBlock = entry?.then as Record<string, unknown> | undefined;
    const required = thenBlock?.required as string[] | undefined;
    expect(required).toContain('portalId');
    expect(required).toContain('end');
  });

  it('Schema 实体 sub-schema 包含 pulseSwitch 和 pulseDoor 的 pairId 必填', () => {
    const psEntry = allOf.find((a) => {
      const ifBlock = a.if as Record<string, unknown> | undefined;
      const props = ifBlock?.properties as Record<string, unknown> | undefined;
      const typeProp = props?.type as Record<string, unknown> | undefined;
      return typeProp?.const === 'pulseSwitch';
    });
    const pdEntry = allOf.find((a) => {
      const ifBlock = a.if as Record<string, unknown> | undefined;
      const props = ifBlock?.properties as Record<string, unknown> | undefined;
      const typeProp = props?.type as Record<string, unknown> | undefined;
      return typeProp?.const === 'pulseDoor';
    });
    const psThen = psEntry?.then as Record<string, unknown> | undefined;
    const pdThen = pdEntry?.then as Record<string, unknown> | undefined;
    const psRequired = psThen?.required as string[] | undefined;
    const pdRequired = pdThen?.required as string[] | undefined;
    expect(psRequired).toContain('pairId');
    expect(pdRequired).toContain('pairId');
  });
});
