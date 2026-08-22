# 关卡 JSON Schema 设计基线

正式实现以 `schemas/level.schema.json` 为机器事实来源，本文件给出语义约束。

## 建议结构

```json
{
  "schemaVersion": 1,
  "id": "level-001",
  "chapter": 1,
  "order": 1,
  "title": "第一次分岔",
  "grid": { "width": 5, "height": 5 },
  "blueStart": { "x": 1, "y": 3 },
  "orangeStart": { "x": 3, "y": 3 },
  "blueExit": { "x": 0, "y": 3 },
  "orangeExit": { "x": 3, "y": 3 },
  "initialMapping": "H_MIRROR",
  "walls": [{ "x": 4, "y": 3 }],
  "entities": [],
  "parMoves": 1,
  "hint": { "focus": "观察谁会被墙挡住", "direction": null },
  "tags": ["chapter-1", "tutorial", "M0", "single-block"]
}
```

## 语义约束

- 坐标原点在左上，x向右、y向下；所有点在网格内。
- 角色、出口、墙和实体不得产生未定义重叠。
- 传送门必须成对并有稳定ID；门与压板引用必须存在。
- `parMoves` 必须来自求解器最短步数与人工目标的明确决策。
- `tags` 必须包含章节和机制；教学关包含 `tutorial`。
- 加载器必须拒绝未知关键字段组合，不得静默修复坏关卡。
- Schema版本升级要有迁移或明确拒绝策略。

## 求解状态必须包含

蓝/橙位置、当前映射、门/压板状态、暂停令牌、脆弱格坍塌集合、同步脉冲状态、一次性机关状态及其他会影响后续转移的字段。
