# 规则用例（Given/When/Then）V1.0

> 每条规则与机制至少含正常、边界、冲突三类用例。阶段 05 按本表转写为单元测试；阶段 12 扩展为属性测试。坐标：原点左上，x 右、y 下；B=蓝，O=橙，#=墙，bE/oE=蓝/橙出口。

## R-01 正交网格与输入域

- **GWT-R01-1（正常）**：Given 5×5 空盘，B(1,2)、O(3,2)。When 输入 LEFT。Then blueDir=LEFT，orangeDir 按映射计算；每角色至多移动 1 格（I13）。
- **GWT-R01-2（边界）**：Given 任意状态。When 输入为非四方向（斜向、空、未知键）。Then 归一化拒绝或映射到主轴方向，不产生非法 Direction（I14）。
- **GWT-R01-3（冲突）**：Given 动画/结算进行中。When 连续两次输入。Then 仅第一次进入结算，第二次被输入层丢弃（FR-02）。

## R-02 蓝原向、橙镜像

- **GWT-R02-1（正常，H_MIRROR）**：Given mapping=H_MIRROR。When 输入 LEFT。Then B 走 LEFT、O 走 RIGHT。
- **GWT-R02-2（边界，上下不镜像）**：Given mapping=H_MIRROR。When 输入 UP。Then B、O 均走 UP。
- **GWT-R02-3（冲突，映射非缺省）**：Given mapping=V_MIRROR（M4 已切换）。When 输入 UP。Then B 走 UP、O 走 DOWN（I9：仅橙受影响）。
- **GWT-R02-4（边界，ROTATE_CW）**：Given mapping=ROTATE_CW。When 输入 UP。Then B 走 UP、O 走 RIGHT。

## R-03 单方受阻

- **GWT-R03-1（正常，单方受阻）**：Given 行 `# B . O .`（B 左邻是墙），mapping=H_MIRROR。When 输入 LEFT。Then B 被墙阻挡停留；O 镜像走 RIGHT 移动 1 格；回合成立、计数+1。
- **GWT-R03-2（边界，边界阻挡）**：Given B 在 x=0 列。When 输入 LEFT。Then B 出界判定停留，O 照常结算。
- **GWT-R03-3（冲突，双方皆阻）**：Given B、O 各自被阻挡。When 输入任意。Then 双方均停留；无同格则回合成立（空回合合法，计数+1）。

## R-04 同格取消与对穿

- **GWT-R04-1（正常，对穿交换）**：Given `B O` 相邻（B 在左），mapping=H_MIRROR。When 输入 RIGHT。Then B→右格、O→左格，交换成立，无取消（目标格不同）。
- **GWT-R04-2（边界，撞向同一格）**：Given `B . O`，B(0,y)、O(2,y)，mapping=H_MIRROR。When 输入 RIGHT。Then B 候选 (1,y)、O 候选 (1,y) → 整步取消：位置、令牌、门、计数全部不变，无快照压栈（I6）。
- **GWT-R04-3（冲突，取消恢复令牌）**：Given O 持有暂停令牌，且本输入若成立将导致同格。When 输入。Then 取消后 O 令牌恢复（P3 暂记回滚）。
- **GWT-R04-4（冲突，取消不回退已成立回合）**：Given 回合 N 成立、回合 N+1 取消。When UNDO。Then 仅回退到回合 N 结束，不回退更多（I15）。

## R-05 出口不锁定与双出口胜利

- **GWT-R05-1（正常，同回合双达标）**：Given B 邻 bE、O 邻 oE。When 一步使两者同时站上各自出口。Then status=WON，结算界面可用。
- **GWT-R05-2（边界，提前到达不锁定）**：Given B 已在 bE、O 未就位。When 输入使 B 离开 bE。Then B 正常离开（出口不锁定）；status 仍 PLAYING。
- **GWT-R05-3（冲突，单方在出口）**：Given B 在 bE、O 不在 oE。When 回合结束。Then 不判胜；B 可继续被移动（"提前到达的角色不会被锁定"）。
- **GWT-R05-4（边界，站错出口）**：Given B 站在 oE、O 站在 bE。When 回合结束。Then 不判胜（出口按颜色匹配）。

## R-06 无限撤销

- **GWT-R06-1（正常，含全部动态状态）**：Given 经过含门开闭、脆弱格坍塌、令牌、映射切换、脉冲闩锁的若干回合。When 连续 UNDO 至初始。Then 每步逐字段等于对应快照；最终等于初始状态（I4）。
- **GWT-R06-2（边界，空栈）**：Given 初始状态。When UNDO。Then no-op，不崩溃（I15）。
- **GWT-R06-3（冲突，撤销后重放一致）**：Given 撤销一步。When 重新输入同一方向。Then 结果与第一次相同（I3、I19 无别名污染）。

## R-07 目标步数仅评价

- **GWT-R07-1（正常）**：Given parMoves=4。When 玩家 9 步通关。Then 通关成立（首次通关不限步数），星级按 9 与 4 的关系评价（FR-09）。
- **GWT-R07-2（边界）**：Given 已通关关。When 重玩并低于目标步数。Then 最佳步数更新，无阻断。

## M0 墙与边界

- **GWT-M0-1（正常）**：见 GWT-R03-1。
- **GWT-M0-2（边界，墙角双阻）**：Given B 在角落，两邻皆墙。When 任一被阻方向。Then B 停留，另一角色不受影响。
- **GWT-M0-3（冲突，门与墙叠加）**：Given 目标格既是关闭门后又是墙（关卡不应构造，防御性）。When 移动。Then blocked 判定幂等，结果停留。

## M1 压板/门

- **GWT-M1-1（正常，踩板开门）**：Given plate P 联动 door D（关闭）。When B 移动到 P 上（回合末站在板上）。Then D.open=true，下回合可穿过。
- **GWT-M1-2（边界，离板关门时序）**：Given B 在 P 上、D 开。When B 离开 P。Then 该回合末 D.open=false（回合末关闭）；B 本回合已离开故不受 D 影响。
- **GWT-M1-3（冲突，同回合门后追击）**：Given O 在 P 上，B 欲穿过 D。When 输入使 B 进入 D 格。Then B 的阻挡判定用回合开始时 D 状态（开）→ 通过；即使 O 同回合离板，B 已通过（顺序无循环，见结算规范 §6）。

## M2 角色专属门

- **GWT-M2-1（正常）**：Given colorDoor(orange) 在 B 与目标之间。When B 尝试进入。Then B 被阻挡。
- **GWT-M2-2（边界）**：Given 同上。When O 尝试进入。Then O 通过。
- **GWT-M2-3（冲突，镜像致入错门）**：Given 玩家意图让 B 入 orange 门，但输入被镜像后 O 撞门。Then 按实际方向结算，O 被阻（规则不迎合意图）。

## M3 暂停格

- **GWT-M3-1（正常，获得令牌）**：Given B 移动到 pauseTile。When 回合结束。Then B.hasPauseToken=true（原无令牌）。
- **GWT-M3-2（边界，令牌消耗回合）**：Given B 有令牌。When 输入 LEFT。Then B 原地不动、令牌清空；O 与动态状态照常结算（ADR-002）。
- **GWT-M3-3（冲突，已有令牌再踩板）**：Given B 有令牌且站在 pauseTile。When 回合结束。Then 令牌不叠加，仍为 1（ADR-005、I10）。

## M4 映射切换器

- **GWT-M4-1（正常）**：Given switcher(target=V_MIRROR)。When B 回合末站在其上。Then state.mapping=V_MIRROR，自下回合生效（I18）。
- **GWT-M4-2（边界，同回合方向不受影响）**：Given 输入使 B 站上切换器。When 该回合结算。Then 本回合 O 的方向仍按切换前映射计算。
- **GWT-M4-3（冲突，双切换器不同目标）**：Given 两个 switcher（target 不同）分别被 B、O 同回合站上。When 结算。Then mapping=蓝色所在切换器的 target（ADR-006 蓝色优先）。

## M5 单向格

- **GWT-M5-1（正常，顺箭头离开）**：Given B 在 oneWay(arrow=RIGHT) 上。When 输入 RIGHT。Then B 正常离开。
- **GWT-M5-2（边界，逆箭头被阻）**：Given 同上。When 输入 LEFT。Then B 被离开约束阻挡停留（O 照常）。
- **GWT-M5-3（冲突，进入不限）**：Given B 不在单向格。When 从任意方向进入 oneWay 格。Then 进入成功（进入不受箭头限制）。

## M6 传送门

- **GWT-M6-1（正常，回合末传送）**：Given B 回合末站在 portal A 入口，配对 B 端在空地。When 结算。Then B 位置变为配对端，teleported.blue=true。
- **GWT-M6-2（边界，目标被占）**：Given 传送目标格被另一角色占据且其不传送。When 结算。Then 传送失败，B 停留原地（结算规范 §3-b）。
- **GWT-M6-3（冲突，双角色互换传送）**：Given B、O 分别站在互为配对的入口。When 结算。Then 两者同时交换位置（§3-c），每角色仅传送一次（I5）。
- **GWT-M6-4（冲突，落点再入 portal）**：Given B 传送后恰好落在另一 portal 入口。When 同回合。Then 不再二次传送（I5）。

## M7 脆弱格

- **GWT-M7-1（正常，离开即坍塌）**：Given B 在脆弱格 F。When B 离开 F。Then F 记入坍塌集合，后续任何角色不可进入（I12）。
- **GWT-M7-2（边界，停留不坍塌）**：Given B 在 F 上。When 输入被阻挡（B 未离开）。Then F 不坍塌。
- **GWT-M7-3（冲突，撤销恢复）**：Given F 已坍塌。When UNDO 回到坍塌前。Then F 恢复可用（I4、I12）。

## M8 同步脉冲

- **GWT-M8-1（正常，同回合配对触发）**：Given 配对 pulseSwitch S1/S2 与 pulseDoor G（未激活）。When 同回合 B 站 S1、O 站 S2。Then G.activated=true（闩锁），之后可穿过。
- **GWT-M8-2（边界，单方触发无效）**：Given 同上。When 仅 B 站 S1。Then G 保持关闭。
- **GWT-M8-3（冲突，闩锁不回退）**：Given G 已激活。When 两角色离开开关。Then G 保持开启（I17），仅 UNDO 可还原。

## 综合边界（交叉机制）

- **GWT-X-1（传送落点压板）**：Given portal 配对端为 plate。When B 传送落 plate。Then D4 按传送后位置判定开门（D2 先于 D4）。
- **GWT-X-2（传送起点脆弱格）**：Given B 站在脆弱格 F 且 F 为 portal 入口。When B 传送离开（最终位置≠F）。Then F 坍塌（D1 比较回合开始位置与最终位置）。
- **GWT-X-3（暂停+同格取消）**：Given B 有令牌，输入本将令双方同格。When 结算。Then 整步取消，令牌恢复，无任何动态推进（I6 优先于 D 阶段）。
- **GWT-X-4（胜利+传送）**：Given portal 落点为 O 的出口，O 回合末站上入口。When 结算。Then 传送后判定胜利成立（P7 读最终位置）。

用例合计：R-01~~R-07 共 18 例，M0~~M8 共 27 例，综合 4 例；覆盖正常/边界/冲突三类，验收门"所有规则都有确定结果"成立。
