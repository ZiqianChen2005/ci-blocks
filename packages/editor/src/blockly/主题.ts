import * as Blockly from 'blockly';

export const CIB主题 = Blockly.Theme.defineTheme('cib', {
    name: 'cib',
    base: Blockly.Themes.Zelos,
    componentStyles: {
        workspaceBackgroundColour: '#fafafa',
        toolboxBackgroundColour: '#ffffff',
        toolboxForegroundColour: '#333',
        flyoutBackgroundColour: '#f5f5f5',
        flyoutForegroundColour: '#333',
        flyoutOpacity: 1,
        scrollbarColour: '#bbb',
        insertionMarkerColour: '#333',
        insertionMarkerOpacity: 0.3,
        cursorColour: '#333',
        blackBackground: '#333',
    },
    fontStyle: {
        family: '"Microsoft YaHei", "PingFang SC", sans-serif',
        size: 13,
    },
    blockStyles: {
        logic_blocks: { colourPrimary: '#5b80a5' },
        loop_blocks: { colourPrimary: '#5ba55b' },
        math_blocks: { colourPrimary: '#5b67a5' },
        text_blocks: { colourPrimary: '#5ba58c' },
        variable_blocks: { colourPrimary: '#a55b99' },
        procedure_blocks: { colourPrimary: '#995ba5' },
    },
});