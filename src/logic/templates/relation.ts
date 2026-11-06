/**
 * 关系类模板
 * CP、恋与、群像等"关系"维度。
 */
import type { Template } from './types';

export const RELATION_TEMPLATES: Template[] = [
    // =================================================================
    // CATEGORY: RELATION (关系)
    // =================================================================
    {
        id: 'couple',
        name: 'CP 问卷 (4x4)',
        category: 'relation',
        label: 'CP',
        cols: 4,
        hot: true,
        defaultTitle: '我的 CP 喜好果然有问题',
        items: [
            '最甜', '最甜', '最虐', '最虐',
            '颜值最高', '颜值最高', '性张力最强', '性张力最强',
            '最互补', '最互补', '相爱相杀', '相爱相杀',
            '意难平', '意难平', '最冷门', '最冷门'
        ]
    },
    {
        id: 'family',
        name: '家庭关系 (4x4)',
        category: 'relation',
        label: '家庭',
        cols: 4,
        defaultTitle: '我的二次元家庭果然有问题',
        items: [
            '最佳老妈', '最屑老妈', '最佳老爸', '最屑老爸',
            '最佳哥哥', '最屑哥哥', '最佳姐姐', '最屑姐姐',
            '最佳弟弟', '最屑弟弟', '最佳妹妹', '最屑妹妹',
            '最佳恋人', '最屑恋人', '最佳前任', '最屑前任'
        ]
    },
    {
        id: 'similarity_2x2',
        name: '简直就是 (2x2)',
        category: 'relation',
        label: '其他',
        cols: 2,
        defaultTitle: '我们简直一模一样',
        items: [
            '本体', '本体',
            '代餐', '代餐'
        ]
    },
];
