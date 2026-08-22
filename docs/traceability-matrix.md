# 追踪矩阵 V1.0

> 每条需求映射到实现模块、测试层级与最终证据（对应 `reference/验收矩阵.md` 的 AC-01~AC-15）。反向视图确保无"无来源实现"。
> 模块为规划名，实际创建以阶段 03 ADR 定稿为准；矩阵随阶段推进更新。

## 正向：需求 → 模块 → 测试 → 证据

| 需求 | 实现模块（规划） | 测试层级 | 最终证据 | 主要落点阶段 |
|---|---|---|---|---|
| FR-01 | ui/home、ui/level-select、ui/settings、progress/unlock | 集成+E2E | AC-01/05/07 | 06、11 |
| FR-02 | input/normalize、input/gesture、input/buttons | 单元+E2E | AC-02 | 06 |
| FR-03 | domain/engine、domain/state | 单元+属性 | AC-03 | 05 |
| FR-04 | domain/engine（胜利判定）、ui/result | 单元+E2E | AC-03/05 | 05、06 |
| FR-05 | domain/history（撤销/克隆/哈希）、ui/restart | 单元+E2E | AC-04 | 05、07、08 |
| FR-06 | levels/（数据）、tools/validator、tools/solver | 批量校验 | AC-05/06 | 09、10 |
| FR-07 | persist/save、persist/migrate | 单元+E2E | AC-07 | 06、11 |
| FR-08 | levels/hints、ui/tutorial | 数据审计+E2E | AC-06 | 10、11 |
| FR-09 | domain/score、persist/save | 单元 | AC-07 | 10、11 |
| FR-10 | audio/*、settings/*、a11y/reduced-motion | 单元+E2E | AC-09 | 11 |
| FR-11 | telemetry/local | 单元+构建审计 | AC-12/14 | 11、13 |
| NFR-01 | 构建配置、domain/engine | 基准+实测 | AC-11 | 13 |
| NFR-02 | 构建配置、ui/viewport | E2E 矩阵 | AC-08/10 | 13 |
| NFR-03 | 全局（场景生命周期） | E2E 长链 | AC-07 | 12、13 |
| NFR-04 | ui/* | UI 审计+E2E | AC-08 | 11 |
| NFR-05 | render/encoding（色+形+纹理）、a11y/* | 灰度审查+E2E | AC-09 | 11 |
| NFR-06 | 依赖清单、构建扫描 | 静态扫描 | AC-12/14 | 04、13 |
| NFR-07 | tsconfig strict、CI、tools/* | CI 门禁 | AC-03/13 | 04、09、12 |
| NFR-08 | 构建（单文件打包）、依赖审计 | 断网冷启动+扫描 | AC-01/12 | 13、15 |
| R-01 | domain/engine（方向归一化入口） | 单元+属性 | AC-03 | 02、05 |
| R-02 | domain/rules（映射：H/V_MIRROR、ROTATE_CW） | 单元+属性 | AC-03 | 02、05、07 |
| R-03 | domain/engine（单方受阻结算） | 单元+属性 | AC-03 | 02、05 |
| R-04 | domain/engine（同格取消、对穿交换） | 单元+属性 | AC-03 | 02、05 |
| R-05 | domain/engine（双出口同回合判定） | 单元+E2E | AC-03 | 02、05 |
| R-06 | domain/history（无限撤销全状态恢复）、levels/hints | 单元+E2E | AC-04 | 05、09 |
| R-07 | domain/score（目标步数仅评价） | 单元 | AC-03 | 05、10 |
| CONTENT-01 | levels/、tools/solver | 批量求解 | AC-05 | 10 |
| CONTENT-02 | levels/ | 数据审计 | AC-06 | 10 |
| CONTENT-03 | levels/、tools/audit | 审计脚本 | AC-06 | 10 |
| CONTENT-04 | tools/validator、tools/solver、levels/ | 批量准入 | AC-05/06 | 09、10 |
| CONTENT-05 | tools/solver、reports | 难度报告+认知走查 | AC-14 | 10、14 |
| 提交材料（§8） | dist/、docs/、reports/ | 清单核对 | AC-15 | 15、16 |

## 反向：模块 → 需求来源

| 模块（规划） | 来源需求 | 无来源即禁止实现 |
|---|---|---|
| domain/*（engine、state、rules、history、score） | FR-03/04/05/09、R-01~R-07 | 领域层不得出现无规则依据的分支 |
| input/* | FR-02 | |
| ui/* | FR-01、NFR-04 | |
| persist/* | FR-07/09/10 | |
| audio/*、a11y/*、telemetry/* | FR-10/11、NFR-05 | |
| levels/*、tools/*（validator、solver、audit、editor） | FR-06/08、CONTENT-01~05、NFR-07 | |
| schemas/level.schema.json | CONTENT-04、`reference/关卡JSON_Schema.md` | |

## 完整性声明

- 正向：FR-01~11、NFR-01~08、R-01~07、CONTENT-01~05、提交材料共 32 项全部有模块、测试与证据映射。
- 反向：规划模块全部可回溯到至少一条需求；阶段 03 ADR 若调整模块名，须同步更新本矩阵。
- 完整性由 `scripts/check-stage01.mjs` 机器校验（见 `reports/stage-01-report.md`）。
