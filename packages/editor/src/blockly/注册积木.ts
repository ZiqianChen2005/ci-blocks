import * as Blockly from 'blockly';
import type { CIBBlock, 字段描述 } from '@cib/core';
import { 取积木名, 取字段名, 取选项名, type 语言包 } from '@cib/i18n';

const 已注册 = new Set<string>();

const 分类颜色: Record<string, number> = {
    基础: 210,
    门禁: 0,
    构建: 120,
    校验: 210,
    科研: 270,
    项目: 30,
    审计: 160,
    环境: 200,
};

const 年选项 = Array.from({ length: 20 }, (_, i) => String(2025 + i));
const 月选项 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const 日选项 = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const 时选项 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const 分秒选项 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function 展开日期时间(字段: 字段描述, 显示名: string) {
    const 键 = 字段.键;
    return {
        message: `${显示名}: %1年 %2月 %3日 %4时 %5分 %6秒`,
        args: [
            { type: 'field_dropdown', name: `${键}_年`, options: 年选项.map((v) => [v, v]) },
            { type: 'field_dropdown', name: `${键}_月`, options: 月选项.map((v) => [v, v]) },
            { type: 'field_dropdown', name: `${键}_日`, options: 日选项.map((v) => [v, v]) },
            { type: 'field_dropdown', name: `${键}_时`, options: 时选项.map((v) => [v, v]) },
            { type: 'field_dropdown', name: `${键}_分`, options: 分秒选项.map((v) => [v, v]) },
            { type: 'field_dropdown', name: `${键}_秒`, options: 分秒选项.map((v) => [v, v]) },
        ],
    };
}

function 字段转BlocklyArg(字段: 字段描述, blockId: string, 包: 语言包): object | null {
    const 默认值 = 字段.默认 !== undefined ? String(字段.默认) : '';
    switch (字段.类型) {
        case '枚举':
            return {
                type: 'field_dropdown',
                name: 字段.键,
                options: (字段.选项 ?? []).map((o) => [取选项名(包, blockId, o, o), o]),
            };
        case '布尔':
            return { type: 'field_checkbox', name: 字段.键, checked: 默认值 === 'true' };
        case '数字':
            return { type: 'field_number', name: 字段.键, value: Number(默认值) || 0 };
        case '文本':
        case '时间':
        case '路径列表':
        default:
            return { type: 'field_input', name: 字段.键, text: 默认值 };
    }
}

function 注册自动编译积木(block: CIBBlock<any>, 包: 语言包) {
    const 积木名 = 取积木名(包, block.id, block.keyword);
    const 图标 = block.meta.icon ?? '🔨';
    const 字段名 = (键: string) => 取字段名(包, block.id, 键, 键);
    const 选项名 = (值: string) => 取选项名(包, block.id, 值, 值);
    const 颜色 = 分类颜色[block.category] ?? 120;
    const 提示 = 包.积木[block.id]?.描述 ?? block.meta.描述;

    Blockly.Blocks[block.id] = {
        init(this: Blockly.Block) {
            const 工具链选项: [string, string][] = [
                ['Node', 'Node'],
                ['Python', 'Python'],
                ['Java', 'Java'],
                ['Go', 'Go'],
                ['Rust', 'Rust'],
                [选项名('自定义'), '自定义'],
            ];

            this.appendDummyInput('头部').appendField(`${图标} ${积木名}`);

            this.appendDummyInput('工具链行')
                .appendField(`${字段名('工具链')}:`)
                .appendField(new Blockly.FieldDropdown(工具链选项, this.校验工具链), '工具链');

            this.appendDummyInput('版本行')
                .appendField(`${字段名('版本')}:`)
                .appendField(new Blockly.FieldTextInput('20'), '版本');

            this.appendDummyInput('构建命令行')
                .appendField(`${字段名('构建命令')}:`)
                .appendField(new Blockly.FieldTextInput('npm run build'), '构建命令');

            this.appendDummyInput('工作目录行')
                .appendField(`${字段名('工作目录')}:`)
                .appendField(new Blockly.FieldTextInput('.'), '工作目录');

            this.appendDummyInput('缓存行')
                .appendField(`${字段名('缓存')}:`)
                .appendField(new Blockly.FieldDropdown([['开', '开'], ['关', '关']]), '缓存');

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(颜色);
            this.setTooltip(提示);

            this.updateShape_('Node');
        },

        校验工具链(this: any, newValue: string) {
            const 源 = this.getSourceBlock();
            if (源 && typeof 源.updateShape_ === 'function') {
                源.updateShape_(newValue);
            }
            return newValue;
        },

        updateShape_(this: Blockly.Block, 工具链: string) {
            // 1. 先读旧值（字符串化，防 object Object）
            let 额外值 = '';
            let 安装值 = '';
            try {
                const v1 = this.getFieldValue('额外setup');
                if (typeof v1 === 'string') 额外值 = v1;
            } catch {}
            try {
                const v2 = this.getFieldValue('安装命令');
                if (typeof v2 === 'string') 安装值 = v2;
            } catch {}

            // 2. 清掉所有自定义 input（逐个 try，避免某个不存在时崩）
            for (const name of ['自定义块1', '自定义块2']) {
                if (this.getInput(name)) {
                    try {
                        this.removeInput(name);
                    } catch (e) {
                        console.warn(`removeInput(${name}) 失败：`, e);
                    }
                }
            }

            // 3. 非"自定义"：直接返回，字段已清
            if (工具链 !== '自定义') return;

            // 4. "自定义"：重新加字段
            try {
                this.appendDummyInput('自定义块1')
                    .appendField(`${字段名('额外setup')}:`)
                    .appendField(new Blockly.FieldTextInput(额外值), '额外setup');

                this.appendDummyInput('自定义块2')
                    .appendField(`${字段名('安装命令')}:`)
                    .appendField(new Blockly.FieldTextInput(安装值), '安装命令');

                // 移到"版本行"之前
                if (this.getInput('自定义块1')) {
                    this.moveInputBefore('自定义块1', '版本行');
                }
                if (this.getInput('自定义块2')) {
                    this.moveInputBefore('自定义块2', '版本行');
                }
            } catch (e) {
                console.warn('添加自定义字段失败：', e);
            }
        },
    };
}

// ========== 通用积木注册 ==========
function 生成定义(block: CIBBlock<any>, 包: 语言包): any {
    const 字段列表 = block.schema;
    const 积木名 = 取积木名(包, block.id, block.keyword);
    const 图标 = block.meta.icon ?? '🧱';

    const 定义: any = {
        type: block.id,
        colour: 分类颜色[block.category] ?? 0,
        tooltip: 包.积木[block.id]?.描述 ?? block.meta.描述,
    };

    if (block.id === 'cib/if-action') {
        定义.message0 = `${图标} ${积木名}`;
        定义.args0 = [];
        定义.message1 = `${取字段名(包, block.id, '事件', '事件')}: %1`;
        定义.args1 = [字段转BlocklyArg(字段列表[0], block.id, 包)];
        定义.message2 = `${取字段名(包, block.id, '分支', '分支')} %1`;
        定义.args2 = [{ type: 'input_statement', name: '分支块' }];
        定义.message3 = `${取字段名(包, block.id, '作业', '作业')} %1`;
        定义.args3 = [{ type: 'input_statement', name: '作业块' }];
        定义.inputsInline = false;
        定义.previousStatement = null;
        定义.nextStatement = null;
        return 定义;
    }

    if (block.id === 'cib/if-branch') {
        定义.message0 = `${图标} ${积木名}`;
        定义.args0 = [];
        定义.message1 = `${取字段名(包, block.id, '过滤键', '过滤键')}: %1`;
        定义.args1 = [字段转BlocklyArg(字段列表[0], block.id, 包)];
        定义.message2 = `${取字段名(包, block.id, '过滤值', '过滤值')}: %1`;
        定义.args2 = [字段转BlocklyArg(字段列表[1], block.id, 包)];
        定义.previousStatement = null;
        定义.nextStatement = null;
        return 定义;
    }

    if (block.id === 'cib/if-workflow') {
        定义.message0 = `${图标} ${积木名}`;
        定义.args0 = [];
        定义.message1 = `${取字段名(包, block.id, '通过时执行', '通过时执行')} %1`;
        定义.args1 = [{ type: 'input_statement', name: '通过块' }];
        定义.message2 = `${取字段名(包, block.id, '失败时执行', '失败时执行')} %1`;
        定义.args2 = [{ type: 'input_statement', name: '失败块' }];
        定义.inputsInline = false;
        定义.previousStatement = null;
        定义.nextStatement = null;
        return 定义;
    }

    定义.previousStatement = null;
    定义.nextStatement = null;
    定义.message0 = `${图标} ${积木名}`;
    定义.args0 = [];

    let 行号 = 0;
    for (const f of 字段列表) {
        const 字段显示名 = 取字段名(包, block.id, f.键, f.键);
        if (f.类型 === '日期时间') {
            const { message, args } = 展开日期时间(f, 字段显示名);
            行号 += 1;
            定义[`message${行号}`] = message;
            定义[`args${行号}`] = args;
        } else {
            const arg = 字段转BlocklyArg(f, block.id, 包);
            if (!arg) continue;
            行号 += 1;
            定义[`message${行号}`] = `${字段显示名}: %1`;
            定义[`args${行号}`] = [arg];
        }
    }

    return 定义;
}

export function 注册积木(block: CIBBlock<any>, 包: 语言包) {
    const key = `${block.id}@${包.语言}`;

    // 特殊积木：自动编译用动态字段
    if (block.id === 'cib/build') {
        注册自动编译积木(block, 包);
        已注册.add(key);
        return;
    }

    const 定义 = 生成定义(block, 包);
    Blockly.Blocks[block.id] = {
        init(this: Blockly.Block) {
            this.jsonInit(定义);
        },
    };
    已注册.add(key);
}

export function 注册所有积木(blocks: CIBBlock<any>[], 包: 语言包) {
    blocks.forEach((b) => 注册积木(b, 包));
}