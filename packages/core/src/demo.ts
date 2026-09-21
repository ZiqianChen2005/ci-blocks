import { 生成GitHubYAML, type IR工作流 } from './index';
import { 时间铡刀 } from '../../blocks-official/src/index';

const 节点 = 时间铡刀.生成IR(
    { 基准时间: '2026-09-20T20:00:00', 时区: 'UTC+08:00', 模式: '超时封仓' },
    { 工作流名称: '封仓门禁' },
);

const 工作流: IR工作流 = {
    名称: '封仓门禁',
    触发器: [{ kind: '触发器', keyword: '推送', 事件: 'push', 过滤: { branches: ['main'] } }],
    节点,
};

console.log(生成GitHubYAML(工作流));