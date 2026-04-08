export const WORK_TYPES = {
  A: [
    { key: 'tsukuri_chokuhai_dai', label: '作り（直売）大' },
    { key: 'tsukuri_chokuhai_midi', label: '作り（直売）ミディ' },
    { key: 'tsukuri_2ban', label: '作り（2番）' },
  ],
  B: [
    { key: 'ue', label: '植え' },
    { key: 'kumi', label: '組み' },
    { key: 'karimage', label: '仮曲げ' },
    { key: 'shichuu_tate', label: '支柱立て' },
    { key: 'shukka', label: '出荷' },
    { key: 'koke_nose', label: '苔のせ' },
    { key: 'kansui', label: '潅水' },
    { key: 'nae_dashi', label: '苗出し' },
    { key: 'takkyubin', label: '宅急便' },
    { key: 'labo_junbi', label: 'ラボ準備' },
    { key: 'yakuzai_sanpu', label: '薬剤散布' },
    { key: 'pikaku', label: 'ピカク' },
    { key: 'shichuu_mage', label: '支柱曲げ' },
    { key: 'sonota', label: 'その他' },
  ],
} as const

export const LOCATIONS = ['直売', '2番温室', '3番温室', '4番温室'] as const

export const GREENHOUSES = ['直売', '2号温室', '3号温室', '4号温室'] as const

export const POSITIONS = ['支柱立', '仮曲げ', '組み', 'その他'] as const

export const VARIETIES = [
  'ベトナム バーク4寸',
  'タイ 3寸ロング',
  '台湾水苔 3.5寸',
  'タイ 3.8寸 スタンダード',
  'タイ 3.8寸 若苗',
] as const

export const DISCARD_REASONS = ['病気', '折れ', 'ねじれ', '自然キズ', 'ぶつかり傷', 'その他'] as const

export const DOWNGRADE_REASONS = ['病気', '折れ', 'ねじれ', '自然キズ', 'ぶつかり傷', '先止め'] as const
