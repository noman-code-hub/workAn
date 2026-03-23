export type ResumePageSize = 'A4' | 'Letter' | 'Custom';

export type ResumeSectionType =
    | 'header'
    | 'summary'
    | 'experience'
    | 'education'
    | 'skills'
    | 'projects'
    | 'certifications'
    | 'additional'
    | 'custom';

export type ResumeBlockKind = 'text' | 'richText' | 'image' | 'list' | 'table' | 'divider' | 'group';

export interface ResumeTemplateDefinition {
    schemaVersion: 1;
    metadata: ResumeTemplateMetadata;
    page: ResumeTemplatePage;
    theme: ResumeTemplateTheme;
    layout?: ResumeTemplateLayout;
    sections: ResumeTemplateSection[];
}

export interface ResumeTemplateMetadata {
    name: string;
    slug: string;
    description?: string;
    category?: string;
    tags?: string[];
    thumbnailUrl?: string;
}

export interface ResumeTemplatePage {
    size: ResumePageSize;
    widthPx: number;
    heightPx: number;
    margin: ResumeTemplateMargin;
}

export interface ResumeTemplateMargin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface ResumeTemplateTheme {
    fonts: {
        heading: string;
        body: string;
        mono?: string;
    };
    colors: {
        text: string;
        muted: string;
        primary: string;
        secondary: string;
        background: string;
        accent?: string;
    };
    spacing: {
        sectionGapPx: number;
        itemGapPx: number;
        lineHeight: number;
    };
}

export interface ResumeTemplateLayout {
    columns?: number;
    columnGapPx?: number;
}

export interface ResumeTemplateSection {
    id: string;
    type: ResumeSectionType;
    label?: string;
    showTitle?: boolean;
    dataKey?: string;
    style?: ResumeTemplateStyle;
    blocks: ResumeTemplateBlock[];
}

export interface ResumeTemplateStyle {
    align?: 'left' | 'center' | 'right';
    columns?: number;
    columnGapPx?: number;
    paddingPx?: number;
    paddingXpx?: number;
    paddingYpx?: number;
    paddingTopPx?: number;
    paddingRightPx?: number;
    paddingBottomPx?: number;
    paddingLeftPx?: number;
    background?: string;
    color?: string;
    font?: string;
    fontSizePx?: number;
    fontWeight?: number | string;
    lineHeight?: number | string;
    letterSpacingPx?: number;
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    borderColor?: string;
    borderWidthPx?: number;
    borderLeftColor?: string;
    borderLeftWidthPx?: number;
    borderRadiusPx?: number;
    width?: string;
    minWidthPx?: number;
    maxWidthPx?: number;
    display?: 'block' | 'inline-block' | 'inline-flex' | 'flex' | 'grid';
    gapPx?: number;
    justifyContent?: string;
    alignItems?: string;
    marginTopPx?: number;
    marginBottomPx?: number;
    marginLeft?: string;
    marginRight?: string;
}

export type ResumeTemplateBlock =
    | ResumeTemplateTextBlock
    | ResumeTemplateRichTextBlock
    | ResumeTemplateImageBlock
    | ResumeTemplateListBlock
    | ResumeTemplateTableBlock
    | ResumeTemplateDividerBlock
    | ResumeTemplateGroupBlock;

export interface ResumeTemplateTextBlock {
    kind: 'text';
    key: string;
    variant?: 'heading' | 'subheading' | 'body' | 'label' | 'caption';
    style?: ResumeTemplateStyle;
}

export interface ResumeTemplateRichTextBlock {
    kind: 'richText';
    key: string;
    style?: ResumeTemplateStyle;
}

export interface ResumeTemplateImageBlock {
    kind: 'image';
    key: string;
    shape?: 'circle' | 'square' | 'rounded';
    width?: number;
    height?: number;
    style?: ResumeTemplateStyle;
}

export interface ResumeTemplateListBlock {
    kind: 'list';
    key: string;
    itemGapPx?: number;
    itemBlocks: ResumeTemplateBlock[];
    style?: ResumeTemplateStyle;
}

export interface ResumeTemplateTableBlock {
    kind: 'table';
    key: string;
    columns: ResumeTemplateTableColumn[];
    style?: ResumeTemplateStyle;
}

export interface ResumeTemplateTableColumn {
    key: string;
    label?: string;
    widthPx?: number;
    align?: 'left' | 'center' | 'right';
    style?: ResumeTemplateStyle;
}

export interface ResumeTemplateDividerBlock {
    kind: 'divider';
    thicknessPx?: number;
    color?: string;
    marginTopPx?: number;
    marginBottomPx?: number;
}

export interface ResumeTemplateGroupBlock {
    kind: 'group';
    direction?: 'row' | 'column';
    gapPx?: number;
    items: ResumeTemplateGroupItem[];
    style?: ResumeTemplateStyle;
}

export interface ResumeTemplateGroupItem {
    width?: string;
    style?: ResumeTemplateStyle;
    blocks: ResumeTemplateBlock[];
}

export interface ResumeTemplateRow {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category: string | null;
    thumbnail_url: string | null;
    is_active: boolean;
    definition: ResumeTemplateDefinition;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ResumeTemplateRecord {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    category?: string | null;
    thumbnailUrl?: string | null;
    isActive: boolean;
    definition: ResumeTemplateDefinition;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ResumeTemplateUpsert {
    id?: string;
    slug: string;
    name: string;
    description?: string | null;
    category?: string | null;
    thumbnailUrl?: string | null;
    isActive?: boolean;
    definition: ResumeTemplateDefinition;
    createdBy?: string | null;
}
