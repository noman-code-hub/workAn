import carterClassicThumbnail from '../../assets/images/london-bd8262b0.jpg';
import blackWhiteProfessionalThumbnail from '../../assets/images/black and White Clean and Professional Resume.jpg';
import blueGraySimpleProfessionalThumbnail from '../../assets/images/Blue and Gray Simple Professional CV Resume.jpg';
import accountingExecutiveThumbnail from '../../assets/images/Simple Professional Accounting Executive CV Resume - Copy.jpg';
import minimalistModernProfessionalThumbnail from '../../assets/images/Minimalist Modern Professional CV Resume.jpg';
import simpleProfessionalMarketingManagerThumbnail from '../../assets/images/Simple Professional Marketing Manager CV Resume.jpg';
import lavenderExecutiveThumbnail from '../../assets/images/image.png';
import cleanSimpleProfessionalManagerThumbnail from '../../assets/images/Clean Simple Professional  Manager Resume.jpg';
import type { ResumeTemplateDefinition, ResumeTemplateRecord } from '../../types/resumeTemplate';

const CREATED_AT = '2026-03-22T00:00:00.000Z';
const sectionPillStyle = {
  background: '#232323',
  color: '#ffffff',
  display: 'inline-block',
  borderRadiusPx: 10,
  paddingXpx: 14,
  paddingYpx: 8,
  fontSizePx: 14,
  fontWeight: 800,
  letterSpacingPx: 0.5,
  textTransform: 'uppercase',
  marginBottomPx: 6,
} as const;

const carterClassicDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Carter Classic',
    slug: 'carter-classic',
    description: 'Classic editorial resume with understated dividers and refined serif typography.',
    category: 'Simple',
    tags: ['classic', 'editorial', 'serif', 'single-column', 'ats'],
    thumbnailUrl: carterClassicThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 44,
      right: 44,
      bottom: 40,
      left: 44,
    },
  },
  theme: {
    fonts: {
      heading: '"Times New Roman", Georgia, serif',
      body: 'Georgia, "Times New Roman", serif',
      mono: '"Courier New", monospace',
    },
    colors: {
      text: '#222222',
      muted: '#767676',
      primary: '#171717',
      secondary: '#4b4b4b',
      background: '#fffdf9',
      accent: '#d7d0c7',
    },
    spacing: {
      sectionGapPx: 14,
      itemGapPx: 7,
      lineHeight: 1.45,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 24,
  },
  sections: [
    {
      id: 'header',
      type: 'header',
      blocks: [
        {
          kind: 'text',
          key: 'full_name',
          variant: 'heading',
          style: { align: 'center' },
        },
        {
          kind: 'text',
          key: 'title',
          variant: 'body',
          style: { align: 'center', color: '#555555' },
        },
        {
          kind: 'table',
          key: 'header_contact',
          style: { color: '#666666' },
          columns: [
            { key: 'left', align: 'left', widthPx: 240, style: { color: '#666666' } },
            { key: 'center', align: 'center', widthPx: 170, style: { color: '#666666' } },
            { key: 'right', align: 'right', widthPx: 220, style: { color: '#666666' } },
          ],
        },
      ],
    },
    {
      id: 'summary',
      type: 'summary',
      label: 'Profile',
      showTitle: true,
      dataKey: 'summary',
      blocks: [
        { kind: 'divider', thicknessPx: 1, color: '#d7d0c7', marginTopPx: 2, marginBottomPx: 8 },
        { kind: 'richText', key: 'summary', style: { color: '#4d4d4d' } },
      ],
      style: { color: '#646464' },
    },
    {
      id: 'education',
      type: 'education',
      label: 'Education',
      showTitle: true,
      dataKey: 'education',
      blocks: [
        { kind: 'divider', thicknessPx: 1, color: '#d7d0c7', marginTopPx: 2, marginBottomPx: 8 },
        {
          kind: 'list',
          key: 'education',
          itemGapPx: 14,
          itemBlocks: [
            { kind: 'text', key: 'date_range', variant: 'caption' },
            { kind: 'text', key: 'degree', variant: 'subheading' },
            { kind: 'text', key: 'school', variant: 'body', style: { color: '#444444' } },
            { kind: 'richText', key: 'highlights', style: { color: '#5b5b5b' } },
          ],
        },
      ],
      style: { color: '#646464' },
    },
    {
      id: 'experience',
      type: 'experience',
      label: 'Experience',
      showTitle: true,
      dataKey: 'experience',
      blocks: [
        { kind: 'divider', thicknessPx: 1, color: '#d7d0c7', marginTopPx: 2, marginBottomPx: 8 },
        {
          kind: 'list',
          key: 'experience',
          itemGapPx: 16,
          itemBlocks: [
            { kind: 'text', key: 'date_range', variant: 'caption' },
            { kind: 'text', key: 'role', variant: 'subheading' },
            { kind: 'text', key: 'company', variant: 'body', style: { color: '#444444' } },
            { kind: 'richText', key: 'highlights', style: { color: '#565656' } },
          ],
        },
      ],
      style: { color: '#646464' },
    },
    {
      id: 'skills',
      type: 'skills',
      label: 'Skills',
      showTitle: true,
      dataKey: 'skills',
      blocks: [
        { kind: 'divider', thicknessPx: 1, color: '#d7d0c7', marginTopPx: 2, marginBottomPx: 8 },
        {
          kind: 'list',
          key: 'skills',
          itemGapPx: 5,
          style: { columns: 2, columnGapPx: 28 },
          itemBlocks: [
            { kind: 'text', key: 'name', variant: 'body' },
          ],
        },
      ],
      style: { color: '#646464' },
    },
  ],
};

const blackWhiteProfessionalDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Black & White Professional',
    slug: 'black-white-professional',
    description: 'Minimal monochrome resume with a profile image, bold section pills, and clean two-column headers.',
    category: 'Simple',
    tags: ['black-and-white', 'photo', 'modern', 'single-column', 'ats'],
    thumbnailUrl: blackWhiteProfessionalThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 48,
      right: 46,
      bottom: 42,
      left: 46,
    },
  },
  theme: {
    fonts: {
      heading: '"Aptos Display", "Segoe UI", Arial, sans-serif',
      body: '"Aptos", "Segoe UI", Arial, sans-serif',
      mono: '"Cascadia Mono", "Courier New", monospace',
    },
    colors: {
      text: '#171717',
      muted: '#6b7280',
      primary: '#1f1f1f',
      secondary: '#3f3f46',
      background: '#ffffff',
      accent: '#e5e7eb',
    },
    spacing: {
      sectionGapPx: 18,
      itemGapPx: 8,
      lineHeight: 1.5,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 24,
  },
  sections: [
    {
      id: 'header',
      type: 'header',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 28,
          items: [
            {
              width: 'minmax(0, 1fr)',
              blocks: [
                {
                  kind: 'text',
                  key: 'full_name',
                  variant: 'heading',
                  style: {
                    font: '"Aptos Display", "Segoe UI", Arial, sans-serif',
                    fontSizePx: 35,
                    fontWeight: 800,
                    letterSpacingPx: 0.8,
                    textTransform: 'uppercase',
                    lineHeight: 1.02,
                    marginBottomPx: 4,
                  },
                },
                {
                  kind: 'text',
                  key: 'title',
                  variant: 'body',
                  style: {
                    fontSizePx: 15,
                    color: '#52525b',
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'list',
                  key: 'contact',
                  itemGapPx: 8,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 12,
                      items: [
                        {
                          width: '138px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'label',
                              variant: 'body',
                              style: {
                                background: '#232323',
                                color: '#ffffff',
                                display: 'inline-block',
                                borderRadiusPx: 10,
                                paddingXpx: 12,
                                paddingYpx: 9,
                                fontSizePx: 13,
                                fontWeight: 700,
                                marginRight: 'auto',
                              },
                            },
                          ],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'value',
                              variant: 'body',
                              style: {
                                fontSizePx: 13,
                                color: '#262626',
                                lineHeight: 1.45,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              width: '180px',
              blocks: [
                {
                  kind: 'image',
                  key: 'photo_url',
                  width: 170,
                  height: 190,
                  shape: 'rounded',
                  style: {
                    display: 'block',
                    marginLeft: 'auto',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'summary',
      type: 'summary',
      label: 'About Me',
      showTitle: true,
      dataKey: 'summary',
      style: sectionPillStyle,
      blocks: [
        {
          kind: 'richText',
          key: 'summary',
          style: {
            fontSizePx: 15,
            lineHeight: 1.68,
            color: '#252525',
          },
        },
      ],
    },
    {
      id: 'experience',
      type: 'experience',
      label: 'Work Experience',
      showTitle: true,
      dataKey: 'experience',
      style: sectionPillStyle,
      blocks: [
        {
          kind: 'list',
          key: 'experience',
          itemGapPx: 18,
          itemBlocks: [
            {
              kind: 'group',
              direction: 'row',
              gapPx: 24,
              items: [
                {
                  width: 'minmax(0, 1fr)',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'role',
                      variant: 'subheading',
                      style: {
                        fontSizePx: 17,
                        fontWeight: 800,
                        color: '#171717',
                      },
                    },
                    {
                      kind: 'text',
                      key: 'company',
                      variant: 'body',
                      style: {
                        fontSizePx: 15,
                        fontWeight: 600,
                        color: '#1f2937',
                      },
                    },
                  ],
                },
                {
                  width: '180px',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        fontSizePx: 15,
                        fontWeight: 700,
                        color: '#6b7280',
                        align: 'right',
                      },
                    },
                  ],
                },
              ],
            },
            {
              kind: 'list',
              key: 'bullets',
              itemGapPx: 5,
              itemBlocks: [
                {
                  kind: 'text',
                  key: 'value',
                  variant: 'body',
                  style: {
                    fontSizePx: 14,
                    color: '#262626',
                    lineHeight: 1.55,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'education',
      type: 'education',
      label: 'Education',
      showTitle: true,
      dataKey: 'education',
      style: sectionPillStyle,
      blocks: [
        {
          kind: 'list',
          key: 'education',
          itemGapPx: 16,
          itemBlocks: [
            {
              kind: 'group',
              direction: 'row',
              gapPx: 24,
              items: [
                {
                  width: 'minmax(0, 1fr)',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'degree',
                      variant: 'subheading',
                      style: {
                        fontSizePx: 17,
                        fontWeight: 800,
                        color: '#171717',
                      },
                    },
                    {
                      kind: 'text',
                      key: 'school',
                      variant: 'body',
                      style: {
                        fontSizePx: 15,
                        color: '#1f2937',
                      },
                    },
                  ],
                },
                {
                  width: '180px',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        fontSizePx: 15,
                        fontWeight: 700,
                        color: '#6b7280',
                        align: 'right',
                      },
                    },
                  ],
                },
              ],
            },
            {
              kind: 'list',
              key: 'bullets',
              itemGapPx: 5,
              itemBlocks: [
                {
                  kind: 'text',
                  key: 'value',
                  variant: 'body',
                  style: {
                    fontSizePx: 14,
                    color: '#262626',
                    lineHeight: 1.55,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'additional',
      type: 'additional',
      label: 'Additional Information',
      showTitle: true,
      style: sectionPillStyle,
      blocks: [
        {
          kind: 'text',
          key: 'skills_text',
          variant: 'body',
          style: {
            fontSizePx: 14,
            color: '#262626',
            lineHeight: 1.6,
          },
        },
        {
          kind: 'list',
          key: 'custom_details',
          itemGapPx: 8,
          itemBlocks: [
            {
              kind: 'group',
              direction: 'row',
              gapPx: 12,
              items: [
                {
                  width: '170px',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'label',
                      variant: 'body',
                      style: {
                        fontSizePx: 14,
                        fontWeight: 700,
                        color: '#171717',
                      },
                    },
                  ],
                },
                {
                  width: 'minmax(0, 1fr)',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'value',
                      variant: 'body',
                      style: {
                        fontSizePx: 14,
                        color: '#262626',
                        lineHeight: 1.55,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const blueGraySimpleProfessionalDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Blue Gray Professional',
    slug: 'blue-gray-professional',
    description: 'Two-column blue and gray CV with a soft sidebar, profile photo, and structured experience blocks.',
    category: 'Professional',
    tags: ['blue', 'gray', 'sidebar', 'photo', 'cv'],
    thumbnailUrl: blueGraySimpleProfessionalThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
  theme: {
    fonts: {
      heading: '"Aptos Display", "Segoe UI", Arial, sans-serif',
      body: '"Aptos", "Segoe UI", Arial, sans-serif',
      mono: '"Cascadia Mono", "Courier New", monospace',
    },
    colors: {
      text: '#1f2937',
      muted: '#6b7280',
      primary: '#0d79a8',
      secondary: '#9ca3af',
      background: '#ffffff',
      accent: '#dbe6ec',
    },
    spacing: {
      sectionGapPx: 18,
      itemGapPx: 8,
      lineHeight: 1.5,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 0,
  },
  sections: [
    {
      id: 'blue-gray-cv',
      type: 'custom',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 0,
          items: [
            {
              width: '270px',
              style: {
                background: '#ececec',
                paddingPx: 34,
                minWidthPx: 270,
              },
              blocks: [
                {
                  kind: 'image',
                  key: 'photo_url',
                  width: 170,
                  height: 170,
                  shape: 'circle',
                  style: {
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    borderWidthPx: 4,
                    borderColor: '#0d79a8',
                    marginBottomPx: 28,
                  },
                },
                {
                  kind: 'text',
                  key: 'contact_heading',
                  variant: 'label',
                  style: {
                    color: '#0d79a8',
                    fontSizePx: 18,
                    fontWeight: 800,
                    letterSpacingPx: 2,
                    textTransform: 'uppercase',
                    marginBottomPx: 12,
                  },
                },
                {
                  kind: 'list',
                  key: 'contact',
                  itemGapPx: 10,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'label',
                      variant: 'body',
                      style: {
                        color: '#0d79a8',
                        fontSizePx: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      },
                    },
                    {
                      kind: 'text',
                      key: 'value',
                      variant: 'body',
                      style: {
                        color: '#1f2937',
                        fontSizePx: 14,
                        marginBottomPx: 2,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'skills_heading',
                  variant: 'label',
                  style: {
                    color: '#0d79a8',
                    fontSizePx: 18,
                    fontWeight: 800,
                    letterSpacingPx: 2,
                    textTransform: 'uppercase',
                    marginTopPx: 20,
                    marginBottomPx: 12,
                  },
                },
                {
                  kind: 'list',
                  key: 'skills',
                  itemGapPx: 8,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'name',
                      variant: 'body',
                      style: {
                        color: '#1f2937',
                        fontSizePx: 14,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'custom_heading',
                  variant: 'label',
                  style: {
                    color: '#0d79a8',
                    fontSizePx: 18,
                    fontWeight: 800,
                    letterSpacingPx: 2,
                    textTransform: 'uppercase',
                    marginTopPx: 20,
                    marginBottomPx: 12,
                  },
                },
                {
                  kind: 'list',
                  key: 'custom_details',
                  itemGapPx: 10,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'label',
                      variant: 'body',
                      style: {
                        color: '#0d79a8',
                        fontSizePx: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      },
                    },
                    {
                      kind: 'text',
                      key: 'value',
                      variant: 'body',
                      style: {
                        color: '#1f2937',
                        fontSizePx: 14,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'education_heading',
                  variant: 'label',
                  style: {
                    color: '#0d79a8',
                    fontSizePx: 18,
                    fontWeight: 800,
                    letterSpacingPx: 2,
                    textTransform: 'uppercase',
                    marginTopPx: 20,
                    marginBottomPx: 12,
                  },
                },
                {
                  kind: 'list',
                  key: 'education',
                  itemGapPx: 12,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        color: '#0d79a8',
                        fontSizePx: 14,
                        fontWeight: 800,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'school',
                      variant: 'body',
                      style: {
                        color: '#1f2937',
                        fontSizePx: 14,
                        fontWeight: 700,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'degree',
                      variant: 'body',
                      style: {
                        color: '#374151',
                        fontSizePx: 14,
                      },
                    },
                  ],
                },
              ],
            },
            {
              width: 'minmax(0, 1fr)',
              style: {
                background: '#ffffff',
                paddingPx: 42,
              },
              blocks: [
                {
                  kind: 'text',
                  key: 'full_name',
                  variant: 'heading',
                  style: {
                    color: '#0d79a8',
                    fontSizePx: 34,
                    fontWeight: 800,
                    letterSpacingPx: 1.2,
                    textTransform: 'uppercase',
                    marginTopPx: 26,
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'text',
                  key: 'title',
                  variant: 'body',
                  style: {
                    color: '#9ca3af',
                    fontSizePx: 22,
                    letterSpacingPx: 1,
                    marginBottomPx: 14,
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 3,
                  color: '#0d79a8',
                  marginTopPx: 0,
                  marginBottomPx: 30,
                },
                {
                  kind: 'text',
                  key: 'profile_heading',
                  variant: 'label',
                  style: {
                    color: '#0d79a8',
                    fontSizePx: 19,
                    fontWeight: 800,
                    letterSpacingPx: 2,
                    textTransform: 'uppercase',
                    marginBottomPx: 12,
                  },
                },
                {
                  kind: 'richText',
                  key: 'summary',
                  style: {
                    color: '#1f2937',
                    fontSizePx: 15,
                    lineHeight: 1.6,
                    marginBottomPx: 24,
                  },
                },
                {
                  kind: 'text',
                  key: 'experience_heading',
                  variant: 'label',
                  style: {
                    color: '#0d79a8',
                    fontSizePx: 19,
                    fontWeight: 800,
                    letterSpacingPx: 2,
                    textTransform: 'uppercase',
                    marginBottomPx: 14,
                  },
                },
                {
                  kind: 'list',
                  key: 'experience',
                  itemGapPx: 18,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 16,
                      items: [
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'role',
                              variant: 'body',
                              style: {
                                color: '#111827',
                                fontSizePx: 16,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                              },
                            },
                          ],
                        },
                        {
                          width: '170px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'date_range',
                              variant: 'body',
                              style: {
                                color: '#111827',
                                fontSizePx: 15,
                                fontWeight: 800,
                                align: 'right',
                              },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      kind: 'text',
                      key: 'company',
                      variant: 'body',
                      style: {
                        color: '#374151',
                        fontSizePx: 15,
                        marginBottomPx: 4,
                      },
                    },
                    {
                      kind: 'list',
                      key: 'bullets',
                      itemGapPx: 5,
                      itemBlocks: [
                        {
                          kind: 'text',
                          key: 'value',
                          variant: 'body',
                          style: {
                            color: '#1f2937',
                            fontSizePx: 14,
                            lineHeight: 1.55,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const accountingExecutiveDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Accounting Executive',
    slug: 'accounting-executive',
    description: 'Structured accounting CV with centered header, elegant spacing, and a customizable accent color.',
    category: 'Professional',
    tags: ['accounting', 'executive', 'professional', 'two-column', 'accent'],
    thumbnailUrl: accountingExecutiveThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 42,
      right: 38,
      bottom: 36,
      left: 38,
    },
  },
  theme: {
    fonts: {
      heading: '"Aptos Display", "Segoe UI", Arial, sans-serif',
      body: '"Aptos", "Segoe UI", Arial, sans-serif',
      mono: '"Cascadia Mono", "Courier New", monospace',
    },
    colors: {
      text: '#2f3135',
      muted: '#6b7280',
      primary: '#c3aa72',
      secondary: '#2f3135',
      background: '#ffffff',
      accent: '#c3aa72',
    },
    spacing: {
      sectionGapPx: 20,
      itemGapPx: 9,
      lineHeight: 1.55,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 0,
  },
  sections: [
    {
      id: 'header',
      type: 'header',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 14,
          style: {
            marginTopPx: 12,
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottomPx: 8,
          },
          items: [
            {
              width: 'auto',
              blocks: [
                {
                  kind: 'text',
                  key: 'first_name',
                  variant: 'heading',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 44,
                    fontWeight: 300,
                    letterSpacingPx: 4.6,
                    textTransform: 'uppercase',
                  },
                },
              ],
            },
            {
              width: 'auto',
              blocks: [
                {
                  kind: 'text',
                  key: 'last_name',
                  variant: 'heading',
                  style: {
                    color: '#c3aa72',
                    fontSizePx: 44,
                    fontWeight: 300,
                    letterSpacingPx: 4.6,
                    textTransform: 'uppercase',
                  },
                },
              ],
            },
          ],
        },
        {
          kind: 'text',
          key: 'title',
          variant: 'body',
          style: {
            align: 'center',
            color: '#2f3135',
            fontSizePx: 22,
            fontWeight: 300,
            letterSpacingPx: 2.2,
            marginBottomPx: 26,
          },
        },
        {
          kind: 'divider',
          thicknessPx: 2,
          color: '#c3aa72',
          marginTopPx: 0,
          marginBottomPx: 22,
        },
      ],
    },
    {
      id: 'accounting-body',
      type: 'custom',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 42,
          items: [
            {
              width: 'minmax(0, 1.65fr)',
              blocks: [
                {
                  kind: 'text',
                  key: 'career_summary_heading',
                  variant: 'label',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 18,
                    fontWeight: 300,
                    letterSpacingPx: 5,
                    textTransform: 'uppercase',
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'richText',
                  key: 'summary',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 14,
                    lineHeight: 1.6,
                    marginBottomPx: 24,
                  },
                },
                {
                  kind: 'text',
                  key: 'experience_heading',
                  variant: 'label',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 18,
                    fontWeight: 300,
                    letterSpacingPx: 5,
                    textTransform: 'uppercase',
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'list',
                  key: 'experience',
                  itemGapPx: 16,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'role',
                      variant: 'subheading',
                      style: {
                        color: '#222222',
                        fontSizePx: 15,
                        fontWeight: 800,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'company',
                      variant: 'body',
                      style: {
                        color: '#2f3135',
                        fontSizePx: 14,
                        marginBottomPx: 2,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        color: '#2f3135',
                        fontSizePx: 13,
                        marginBottomPx: 2,
                      },
                    },
                    {
                      kind: 'list',
                      key: 'bullets',
                      itemGapPx: 4,
                      itemBlocks: [
                        {
                          kind: 'text',
                          key: 'value',
                          variant: 'body',
                          style: {
                            color: '#2f3135',
                            fontSizePx: 14,
                            lineHeight: 1.5,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              width: '260px',
              blocks: [
                {
                  kind: 'text',
                  key: 'contact_heading',
                  variant: 'label',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 18,
                    fontWeight: 300,
                    letterSpacingPx: 5,
                    textTransform: 'uppercase',
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'list',
                  key: 'contact',
                  itemGapPx: 10,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'value',
                      variant: 'body',
                      style: {
                        color: '#2f3135',
                        fontSizePx: 14,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'education_heading',
                  variant: 'label',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 18,
                    fontWeight: 300,
                    letterSpacingPx: 5,
                    textTransform: 'uppercase',
                    marginTopPx: 20,
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'list',
                  key: 'education',
                  itemGapPx: 14,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'degree',
                      variant: 'body',
                      style: {
                        color: '#222222',
                        fontSizePx: 14,
                        fontWeight: 700,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'school',
                      variant: 'body',
                      style: {
                        color: '#2f3135',
                        fontSizePx: 14,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        color: '#2f3135',
                        fontSizePx: 13,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'skills_heading',
                  variant: 'label',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 18,
                    fontWeight: 300,
                    letterSpacingPx: 5,
                    textTransform: 'uppercase',
                    marginTopPx: 20,
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'list',
                  key: 'skills',
                  itemGapPx: 6,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'name',
                      variant: 'body',
                      style: {
                        color: '#2f3135',
                        fontSizePx: 14,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'awards_heading',
                  variant: 'label',
                  style: {
                    color: '#2f3135',
                    fontSizePx: 18,
                    fontWeight: 300,
                    letterSpacingPx: 5,
                    textTransform: 'uppercase',
                    marginTopPx: 20,
                    marginBottomPx: 10,
                  },
                },
                {
                  kind: 'list',
                  key: 'additional',
                  itemGapPx: 6,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'value',
                      variant: 'body',
                      style: {
                        color: '#2f3135',
                        fontSizePx: 14,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const minimalistModernProfessionalDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Minimalist Modern',
    slug: 'minimalist-modern',
    description: 'Minimal modern CV with a blush header, dark sidebar, and clean timeline-based experience layout.',
    category: 'Professional',
    tags: ['minimal', 'modern', 'sidebar', 'photo', 'cv'],
    thumbnailUrl: minimalistModernProfessionalThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
  theme: {
    fonts: {
      heading: '"Aptos Display", "Segoe UI", Arial, sans-serif',
      body: '"Aptos", "Segoe UI", Arial, sans-serif',
      mono: '"Cascadia Mono", "Courier New", monospace',
    },
    colors: {
      text: '#413b42',
      muted: '#7e767d',
      primary: '#eecdc0',
      secondary: '#514b52',
      background: '#ffffff',
      accent: '#edd8d1',
    },
    spacing: {
      sectionGapPx: 20,
      itemGapPx: 8,
      lineHeight: 1.6,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 0,
  },
  sections: [
    {
      id: 'minimalist-modern-header',
      type: 'header',
      style: {
        background: '#eecdc0',
        paddingTopPx: 60,
        paddingRightPx: 42,
        paddingBottomPx: 48,
        paddingLeftPx: 42,
      },
      blocks: [
        {
          kind: 'text',
          key: 'full_name',
          variant: 'heading',
          style: {
            align: 'center',
            color: '#3f3941',
            fontSizePx: 46,
            fontWeight: 800,
            letterSpacingPx: 3,
            textTransform: 'uppercase',
            marginBottomPx: 10,
          },
        },
        {
          kind: 'text',
          key: 'title',
          variant: 'body',
          style: {
            align: 'center',
            color: '#48414a',
            fontSizePx: 25,
            fontWeight: 300,
            letterSpacingPx: 4.2,
            marginBottomPx: 0,
          },
        },
      ],
    },
    {
      id: 'minimalist-modern-body',
      type: 'custom',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 0,
          items: [
            {
              width: '292px',
              style: {
                background: '#524c54',
                color: '#ffffff',
                paddingTopPx: 38,
                paddingRightPx: 36,
                paddingBottomPx: 38,
                paddingLeftPx: 36,
                minWidthPx: 292,
              },
              blocks: [
                {
                  kind: 'image',
                  key: 'photo_url',
                  width: 154,
                  height: 154,
                  shape: 'circle',
                  style: {
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottomPx: 36,
                  },
                },
                {
                  kind: 'text',
                  key: 'contact_heading',
                  variant: 'label',
                  style: {
                    color: '#ffffff',
                    fontSizePx: 21,
                    fontWeight: 800,
                    marginBottomPx: 9,
                    textTransform: 'none',
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 2,
                  color: '#edd8d1',
                  marginTopPx: 0,
                  marginBottomPx: 16,
                },
                {
                  kind: 'list',
                  key: 'contact',
                  itemGapPx: 12,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 12,
                      items: [
                        {
                          width: '72px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'label',
                              variant: 'body',
                              style: {
                                color: '#f2e6eb',
                                fontSizePx: 13,
                                fontWeight: 600,
                              },
                            },
                          ],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'value',
                              variant: 'body',
                              style: {
                                color: '#ffffff',
                                fontSizePx: 13.5,
                                lineHeight: 1.5,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'education_heading',
                  variant: 'label',
                  style: {
                    color: '#ffffff',
                    fontSizePx: 21,
                    fontWeight: 800,
                    marginTopPx: 30,
                    marginBottomPx: 8,
                    textTransform: 'none',
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 2,
                  color: '#edd8d1',
                  marginTopPx: 0,
                  marginBottomPx: 16,
                },
                {
                  kind: 'list',
                  key: 'education',
                  itemGapPx: 22,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'degree',
                      variant: 'body',
                      style: {
                        color: '#ffffff',
                        fontSizePx: 14,
                        fontWeight: 400,
                        marginBottomPx: 2,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'school',
                      variant: 'body',
                      style: {
                        color: '#ffffff',
                        fontSizePx: 15,
                        fontWeight: 800,
                        marginBottomPx: 2,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        color: '#f2e8e9',
                        fontSizePx: 13.5,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'skills_heading',
                  variant: 'label',
                  style: {
                    color: '#ffffff',
                    fontSizePx: 21,
                    fontWeight: 800,
                    marginTopPx: 30,
                    marginBottomPx: 8,
                    textTransform: 'none',
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 2,
                  color: '#edd8d1',
                  marginTopPx: 0,
                  marginBottomPx: 16,
                },
                {
                  kind: 'list',
                  key: 'skills',
                  itemGapPx: 10,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 10,
                      items: [
                        {
                          width: '12px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'bullet',
                              variant: 'body',
                              style: {
                                color: '#ffffff',
                                fontSizePx: 16,
                                lineHeight: 1,
                              },
                            },
                          ],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'name',
                              variant: 'body',
                              style: {
                                color: '#ffffff',
                                fontSizePx: 14,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'language_heading',
                  variant: 'label',
                  style: {
                    color: '#ffffff',
                    fontSizePx: 21,
                    fontWeight: 800,
                    marginTopPx: 30,
                    marginBottomPx: 8,
                    textTransform: 'none',
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 2,
                  color: '#edd8d1',
                  marginTopPx: 0,
                  marginBottomPx: 16,
                },
                {
                  kind: 'list',
                  key: 'languages',
                  itemGapPx: 11,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'name',
                      variant: 'body',
                      style: {
                        color: '#ffffff',
                        fontSizePx: 14,
                      },
                    },
                  ],
                },
              ],
            },
            {
              width: 'minmax(0, 1fr)',
              style: {
                background: '#ffffff',
                paddingTopPx: 40,
                paddingRightPx: 40,
                paddingBottomPx: 36,
                paddingLeftPx: 40,
              },
              blocks: [
                {
                  kind: 'text',
                  key: 'about_heading',
                  variant: 'label',
                  style: {
                    color: '#413b42',
                    fontSizePx: 22,
                    fontWeight: 800,
                    marginBottomPx: 8,
                    textTransform: 'none',
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 2,
                  color: '#edd8d1',
                  marginTopPx: 0,
                  marginBottomPx: 16,
                },
                {
                  kind: 'richText',
                  key: 'summary',
                  style: {
                    color: '#5f5860',
                    fontSizePx: 14,
                    lineHeight: 1.7,
                    marginBottomPx: 28,
                  },
                },
                {
                  kind: 'text',
                  key: 'minimalist_experience_heading',
                  variant: 'label',
                  style: {
                    color: '#413b42',
                    fontSizePx: 22,
                    fontWeight: 800,
                    marginBottomPx: 8,
                    textTransform: 'none',
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 2,
                  color: '#edd8d1',
                  marginTopPx: 0,
                  marginBottomPx: 16,
                },
                {
                  kind: 'list',
                  key: 'experience',
                  itemGapPx: 24,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 18,
                      items: [
                        {
                          width: '20px',
                          style: {
                            borderLeftWidthPx: 2,
                            borderLeftColor: '#5a555c',
                            paddingLeftPx: 0,
                            paddingTopPx: 4,
                            paddingBottomPx: 6,
                          },
                          blocks: [
                            {
                              kind: 'text',
                              key: 'marker',
                              variant: 'body',
                              style: {
                                color: '#5a555c',
                                fontSizePx: 18,
                                fontWeight: 700,
                                background: '#ffffff',
                                display: 'inline-block',
                                marginLeft: '-11px',
                                paddingXpx: 1,
                                lineHeight: 1,
                              },
                            },
                          ],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'date_range',
                              variant: 'body',
                              style: {
                                color: '#6f6970',
                                fontSizePx: 13.5,
                                fontWeight: 500,
                                marginBottomPx: 4,
                              },
                            },
                            {
                              kind: 'text',
                              key: 'company',
                              variant: 'body',
                              style: {
                                color: '#5a555c',
                                fontSizePx: 14.5,
                                marginBottomPx: 6,
                              },
                            },
                            {
                              kind: 'text',
                              key: 'role',
                              variant: 'subheading',
                              style: {
                                color: '#413b42',
                                fontSizePx: 18,
                                fontWeight: 800,
                                marginBottomPx: 8,
                              },
                            },
                            {
                              kind: 'richText',
                              key: 'highlights',
                              style: {
                                color: '#756f75',
                                fontSizePx: 13,
                                lineHeight: 1.6,
                                marginBottomPx: 2,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'reference_heading',
                  variant: 'label',
                  style: {
                    color: '#413b42',
                    fontSizePx: 22,
                    fontWeight: 800,
                    marginTopPx: 26,
                    marginBottomPx: 8,
                    textTransform: 'none',
                  },
                },
                {
                  kind: 'divider',
                  thicknessPx: 2,
                  color: '#edd8d1',
                  marginTopPx: 0,
                  marginBottomPx: 18,
                },
                {
                  kind: 'group',
                  direction: 'row',
                  gapPx: 42,
                  items: [
                    {
                      width: 'minmax(0, 1fr)',
                      blocks: [
                        {
                          kind: 'text',
                          key: 'reference_primary_name',
                          variant: 'subheading',
                          style: {
                            color: '#413b42',
                            fontSizePx: 16,
                            fontWeight: 800,
                            marginBottomPx: 6,
                          },
                        },
                        {
                          kind: 'text',
                          key: 'reference_primary_title',
                          variant: 'body',
                          style: {
                            color: '#5a555c',
                            fontSizePx: 14,
                            marginBottomPx: 12,
                          },
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '46px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_phone_label',
                                  variant: 'body',
                                  style: {
                                    color: '#413b42',
                                    fontSizePx: 12.5,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_primary_phone',
                                  variant: 'body',
                                  style: {
                                    color: '#4d474e',
                                    fontSizePx: 13,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '46px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_email_label',
                                  variant: 'body',
                                  style: {
                                    color: '#413b42',
                                    fontSizePx: 12.5,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_primary_email',
                                  variant: 'body',
                                  style: {
                                    color: '#4d474e',
                                    fontSizePx: 13,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      width: 'minmax(0, 1fr)',
                      blocks: [
                        {
                          kind: 'text',
                          key: 'reference_secondary_name',
                          variant: 'subheading',
                          style: {
                            color: '#413b42',
                            fontSizePx: 16,
                            fontWeight: 800,
                            marginBottomPx: 6,
                          },
                        },
                        {
                          kind: 'text',
                          key: 'reference_secondary_title',
                          variant: 'body',
                          style: {
                            color: '#5a555c',
                            fontSizePx: 14,
                            marginBottomPx: 12,
                          },
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '46px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_phone_label',
                                  variant: 'body',
                                  style: {
                                    color: '#413b42',
                                    fontSizePx: 12.5,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_secondary_phone',
                                  variant: 'body',
                                  style: {
                                    color: '#4d474e',
                                    fontSizePx: 13,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '46px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_email_label',
                                  variant: 'body',
                                  style: {
                                    color: '#413b42',
                                    fontSizePx: 12.5,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_secondary_email',
                                  variant: 'body',
                                  style: {
                                    color: '#4d474e',
                                    fontSizePx: 13,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const simpleProfessionalMarketingManagerDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Marketing Manager CV',
    slug: 'marketing-manager-cv',
    description: 'Minimal professional CV with a light editorial sidebar, bold name treatment, and structured work timeline.',
    category: 'Professional',
    tags: ['marketing', 'professional', 'sidebar', 'timeline', 'photo'],
    thumbnailUrl: simpleProfessionalMarketingManagerThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
  theme: {
    fonts: {
      heading: '"Aptos Display", "Segoe UI", Arial, sans-serif',
      body: '"Aptos", "Segoe UI", Arial, sans-serif',
      mono: '"Cascadia Mono", "Courier New", monospace',
    },
    colors: {
      text: '#232323',
      muted: '#727272',
      primary: '#202020',
      secondary: '#f1f1ef',
      background: '#ffffff',
      accent: '#bcbcbc',
    },
    spacing: {
      sectionGapPx: 20,
      itemGapPx: 8,
      lineHeight: 1.55,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 0,
  },
  sections: [
    {
      id: 'marketing-manager-cv-layout',
      type: 'custom',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 0,
          items: [
            {
              width: '232px',
              style: {
                background: '#f1f1ef',
                paddingTopPx: 42,
                paddingRightPx: 28,
                paddingBottomPx: 34,
                paddingLeftPx: 28,
                minWidthPx: 232,
              },
              blocks: [
                {
                  kind: 'image',
                  key: 'photo_url',
                  width: 116,
                  height: 116,
                  shape: 'circle',
                  style: {
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottomPx: 42,
                  },
                },
                {
                  kind: 'text',
                  key: 'contact_heading',
                  variant: 'label',
                  style: {
                    color: '#242424',
                    fontSizePx: 20,
                    fontWeight: 400,
                    letterSpacingPx: 1.2,
                    textTransform: 'none',
                    marginBottomPx: 18,
                  },
                },
                {
                  kind: 'list',
                  key: 'contact',
                  itemGapPx: 14,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 10,
                      items: [
                        {
                          width: '64px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'label',
                              variant: 'body',
                              style: {
                                color: '#4a4a4a',
                                fontSizePx: 12,
                                fontWeight: 700,
                              },
                            },
                          ],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'value',
                              variant: 'body',
                              style: {
                                color: '#5a5a5a',
                                fontSizePx: 12.5,
                                lineHeight: 1.45,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  kind: 'divider',
                  thicknessPx: 1,
                  color: '#aaaaaa',
                  marginTopPx: 22,
                  marginBottomPx: 18,
                },
                {
                  kind: 'text',
                  key: 'education_heading',
                  variant: 'label',
                  style: {
                    color: '#242424',
                    fontSizePx: 20,
                    fontWeight: 400,
                    letterSpacingPx: 1.2,
                    textTransform: 'none',
                    marginBottomPx: 18,
                  },
                },
                {
                  kind: 'list',
                  key: 'education',
                  itemGapPx: 18,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'degree',
                      variant: 'body',
                      style: {
                        color: '#242424',
                        fontSizePx: 14,
                        fontWeight: 800,
                        marginBottomPx: 4,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'school',
                      variant: 'body',
                      style: {
                        color: '#454545',
                        fontSizePx: 14,
                        marginBottomPx: 4,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        color: '#555555',
                        fontSizePx: 13,
                      },
                    },
                  ],
                },
                {
                  kind: 'divider',
                  thicknessPx: 1,
                  color: '#aaaaaa',
                  marginTopPx: 22,
                  marginBottomPx: 18,
                },
                {
                  kind: 'text',
                  key: 'skills_heading',
                  variant: 'label',
                  style: {
                    color: '#242424',
                    fontSizePx: 20,
                    fontWeight: 400,
                    letterSpacingPx: 1.2,
                    textTransform: 'none',
                    marginBottomPx: 18,
                  },
                },
                {
                  kind: 'list',
                  key: 'skills',
                  itemGapPx: 12,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 10,
                      items: [
                        {
                          width: '12px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'bullet',
                              variant: 'body',
                              style: {
                                color: '#232323',
                                fontSizePx: 15,
                                lineHeight: 1,
                              },
                            },
                          ],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'name',
                              variant: 'body',
                              style: {
                                color: '#333333',
                                fontSizePx: 13.5,
                                lineHeight: 1.5,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              width: 'minmax(0, 1fr)',
              style: {
                background: '#ffffff',
                paddingTopPx: 54,
                paddingRightPx: 48,
                paddingBottomPx: 40,
                paddingLeftPx: 48,
              },
              blocks: [
                {
                  kind: 'text',
                  key: 'first_name',
                  variant: 'heading',
                  style: {
                    color: '#1f1f1f',
                    fontSizePx: 34,
                    fontWeight: 300,
                    letterSpacingPx: 1.5,
                    textTransform: 'uppercase',
                    marginBottomPx: 0,
                  },
                },
                {
                  kind: 'text',
                  key: 'last_name',
                  variant: 'heading',
                  style: {
                    color: '#1f1f1f',
                    fontSizePx: 38,
                    fontWeight: 900,
                    letterSpacingPx: 1,
                    textTransform: 'uppercase',
                    marginBottomPx: 8,
                  },
                },
                {
                  kind: 'text',
                  key: 'title',
                  variant: 'body',
                  style: {
                    color: '#353535',
                    fontSizePx: 16,
                    fontWeight: 500,
                    letterSpacingPx: 1.1,
                    marginBottomPx: 42,
                  },
                },
                {
                  kind: 'text',
                  key: 'experience_heading',
                  variant: 'label',
                  style: {
                    color: '#242424',
                    fontSizePx: 22,
                    fontWeight: 400,
                    letterSpacingPx: 1.2,
                    textTransform: 'none',
                    marginBottomPx: 18,
                  },
                },
                {
                  kind: 'list',
                  key: 'experience',
                  itemGapPx: 24,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 16,
                      items: [
                        {
                          width: '46px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'date_range',
                              variant: 'body',
                              style: {
                                color: '#262626',
                                fontSizePx: 12.5,
                                fontWeight: 800,
                                lineHeight: 1.5,
                              },
                            },
                          ],
                        },
                        {
                          width: '12px',
                          style: {
                            borderLeftWidthPx: 1,
                            borderLeftColor: '#8b8b8b',
                          },
                          blocks: [],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'role',
                              variant: 'subheading',
                              style: {
                                color: '#232323',
                                fontSizePx: 15,
                                fontWeight: 800,
                                marginBottomPx: 4,
                              },
                            },
                            {
                              kind: 'text',
                              key: 'company',
                              variant: 'body',
                              style: {
                                color: '#444444',
                                fontSizePx: 13,
                                marginBottomPx: 6,
                              },
                            },
                            {
                              kind: 'richText',
                              key: 'highlights',
                              style: {
                                color: '#444444',
                                fontSizePx: 12.5,
                                lineHeight: 1.55,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'references_heading',
                  variant: 'label',
                  style: {
                    color: '#242424',
                    fontSizePx: 22,
                    fontWeight: 400,
                    letterSpacingPx: 1.2,
                    textTransform: 'none',
                    marginTopPx: 18,
                    marginBottomPx: 18,
                  },
                },
                {
                  kind: 'group',
                  direction: 'row',
                  gapPx: 40,
                  items: [
                    {
                      width: 'minmax(0, 1fr)',
                      blocks: [
                        {
                          kind: 'text',
                          key: 'reference_primary_name',
                          variant: 'subheading',
                          style: {
                            color: '#232323',
                            fontSizePx: 16,
                            fontWeight: 800,
                            marginBottomPx: 4,
                          },
                        },
                        {
                          kind: 'text',
                          key: 'reference_primary_title',
                          variant: 'body',
                          style: {
                            color: '#454545',
                            fontSizePx: 14,
                            marginBottomPx: 10,
                          },
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '42px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_phone_label',
                                  variant: 'body',
                                  style: {
                                    color: '#232323',
                                    fontSizePx: 12,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_primary_phone',
                                  variant: 'body',
                                  style: {
                                    color: '#5a5a5a',
                                    fontSizePx: 12,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '42px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_email_label',
                                  variant: 'body',
                                  style: {
                                    color: '#232323',
                                    fontSizePx: 12,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_primary_email',
                                  variant: 'body',
                                  style: {
                                    color: '#5a5a5a',
                                    fontSizePx: 12,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      width: 'minmax(0, 1fr)',
                      blocks: [
                        {
                          kind: 'text',
                          key: 'reference_secondary_name',
                          variant: 'subheading',
                          style: {
                            color: '#232323',
                            fontSizePx: 16,
                            fontWeight: 800,
                            marginBottomPx: 4,
                          },
                        },
                        {
                          kind: 'text',
                          key: 'reference_secondary_title',
                          variant: 'body',
                          style: {
                            color: '#454545',
                            fontSizePx: 14,
                            marginBottomPx: 10,
                          },
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '42px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_phone_label',
                                  variant: 'body',
                                  style: {
                                    color: '#232323',
                                    fontSizePx: 12,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_secondary_phone',
                                  variant: 'body',
                                  style: {
                                    color: '#5a5a5a',
                                    fontSizePx: 12,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          kind: 'group',
                          direction: 'row',
                          gapPx: 6,
                          items: [
                            {
                              width: '42px',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_email_label',
                                  variant: 'body',
                                  style: {
                                    color: '#232323',
                                    fontSizePx: 12,
                                    fontWeight: 800,
                                  },
                                },
                              ],
                            },
                            {
                              width: 'minmax(0, 1fr)',
                              blocks: [
                                {
                                  kind: 'text',
                                  key: 'reference_secondary_email',
                                  variant: 'body',
                                  style: {
                                    color: '#5a5a5a',
                                    fontSizePx: 12,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const lavenderExecutiveDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Lavender Executive',
    slug: 'lavender-executive',
    description: 'Elegant single-column executive resume with centered lavender header and clean section dividers.',
    category: 'Professional',
    tags: ['lavender', 'executive', 'single-column', 'minimal', 'engineering'],
    thumbnailUrl: lavenderExecutiveThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 50,
      right: 50,
      bottom: 44,
      left: 50,
    },
  },
  theme: {
    fonts: {
      heading: '"Aptos Display", "Segoe UI", Arial, sans-serif',
      body: '"Aptos", "Segoe UI", Arial, sans-serif',
      mono: '"Cascadia Mono", "Courier New", monospace',
    },
    colors: {
      text: '#222222',
      muted: '#6a6a6a',
      primary: '#8a63b1',
      secondary: '#ffffff',
      background: '#ffffff',
      accent: '#b89fd0',
    },
    spacing: {
      sectionGapPx: 18,
      itemGapPx: 8,
      lineHeight: 1.55,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 0,
  },
  sections: [
    {
      id: 'lavender-executive-header',
      type: 'header',
      blocks: [
        {
          kind: 'text',
          key: 'full_name',
          variant: 'heading',
          style: {
            align: 'center',
            color: '#8a63b1',
            fontSizePx: 46,
            fontWeight: 900,
            letterSpacingPx: 1.2,
            textTransform: 'uppercase',
            marginBottomPx: 14,
          },
        },
        {
          kind: 'text',
          key: 'contact_line',
          variant: 'body',
          style: {
            align: 'center',
            color: '#232323',
            fontSizePx: 17,
            marginBottomPx: 4,
          },
        },
        {
          kind: 'text',
          key: 'website_line',
          variant: 'body',
          style: {
            align: 'center',
            color: '#232323',
            fontSizePx: 17,
            marginBottomPx: 16,
          },
        },
        {
          kind: 'divider',
          thicknessPx: 1,
          color: '#b89fd0',
          marginTopPx: 8,
          marginBottomPx: 18,
        },
      ],
    },
    {
      id: 'lavender-executive-summary',
      type: 'summary',
      blocks: [
        {
          kind: 'text',
          key: 'summary_heading',
          variant: 'label',
          style: {
            color: '#8a63b1',
            fontSizePx: 22,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottomPx: 10,
          },
        },
        {
          kind: 'richText',
          key: 'summary',
          style: {
            color: '#232323',
            fontSizePx: 14,
            lineHeight: 1.62,
            marginBottomPx: 16,
          },
        },
        {
          kind: 'divider',
          thicknessPx: 1,
          color: '#b89fd0',
          marginTopPx: 8,
          marginBottomPx: 18,
        },
      ],
    },
    {
      id: 'lavender-executive-experience',
      type: 'experience',
      blocks: [
        {
          kind: 'text',
          key: 'experience_heading',
          variant: 'label',
          style: {
            color: '#8a63b1',
            fontSizePx: 22,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottomPx: 12,
          },
        },
        {
          kind: 'list',
          key: 'experience',
          itemGapPx: 26,
          itemBlocks: [
            {
              kind: 'group',
              direction: 'row',
              gapPx: 20,
              items: [
                {
                  width: 'minmax(0, 1fr)',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'role_company',
                      variant: 'subheading',
                      style: {
                        color: '#222222',
                        fontSizePx: 15,
                        fontWeight: 800,
                      },
                    },
                  ],
                },
                {
                  width: '190px',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        align: 'right',
                        color: '#222222',
                        fontSizePx: 15,
                        fontWeight: 800,
                      },
                    },
                  ],
                },
              ],
            },
            {
              kind: 'list',
              key: 'bullet_lines',
              itemGapPx: 6,
              style: {
                marginTopPx: 8,
              },
              itemBlocks: [
                {
                  kind: 'text',
                  key: 'value',
                  variant: 'body',
                  style: {
                    color: '#232323',
                    fontSizePx: 14,
                    lineHeight: 1.58,
                  },
                },
              ],
            },
          ],
        },
        {
          kind: 'divider',
          thicknessPx: 1,
          color: '#b89fd0',
          marginTopPx: 14,
          marginBottomPx: 18,
        },
      ],
    },
    {
      id: 'lavender-executive-education',
      type: 'education',
      blocks: [
        {
          kind: 'text',
          key: 'education_heading',
          variant: 'label',
          style: {
            color: '#8a63b1',
            fontSizePx: 22,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottomPx: 12,
          },
        },
        {
          kind: 'list',
          key: 'education',
          itemGapPx: 24,
          itemBlocks: [
            {
              kind: 'group',
              direction: 'row',
              gapPx: 20,
              items: [
                {
                  width: 'minmax(0, 1fr)',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'degree',
                      variant: 'subheading',
                      style: {
                        color: '#222222',
                        fontSizePx: 15,
                        fontWeight: 800,
                        marginBottomPx: 4,
                      },
                    },
                  ],
                },
                {
                  width: '190px',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        align: 'right',
                        color: '#222222',
                        fontSizePx: 15,
                        fontWeight: 800,
                      },
                    },
                  ],
                },
              ],
            },
            {
              kind: 'text',
              key: 'school',
              variant: 'body',
              style: {
                color: '#2f2f2f',
                fontSizePx: 14,
                marginBottomPx: 4,
              },
            },
            {
              kind: 'list',
              key: 'bullet_lines',
              itemGapPx: 6,
              itemBlocks: [
                {
                  kind: 'text',
                  key: 'value',
                  variant: 'body',
                  style: {
                    color: '#232323',
                    fontSizePx: 14,
                    lineHeight: 1.58,
                  },
                },
              ],
            },
          ],
        },
        {
          kind: 'divider',
          thicknessPx: 1,
          color: '#b89fd0',
          marginTopPx: 14,
          marginBottomPx: 18,
        },
      ],
    },
    {
      id: 'lavender-executive-additional',
      type: 'additional',
      blocks: [
        {
          kind: 'text',
          key: 'additional_heading',
          variant: 'label',
          style: {
            color: '#8a63b1',
            fontSizePx: 22,
            fontWeight: 800,
            textTransform: 'uppercase',
            marginBottomPx: 12,
          },
        },
        {
          kind: 'list',
          key: 'custom_details',
          itemGapPx: 8,
          itemBlocks: [
            {
              kind: 'group',
              direction: 'row',
              gapPx: 8,
              items: [
                {
                  width: '14px',
                  blocks: [
                    {
                      kind: 'text',
                      key: 'bullet',
                      variant: 'body',
                      style: {
                        color: '#222222',
                        fontSizePx: 15,
                        lineHeight: 1.2,
                      },
                    },
                  ],
                },
                {
                  width: 'minmax(0, 1fr)',
                  blocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 8,
                      items: [
                        {
                          width: '176px',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'label_with_colon',
                              variant: 'body',
                              style: {
                                color: '#222222',
                                fontSizePx: 14,
                                fontWeight: 800,
                              },
                            },
                          ],
                        },
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'value',
                              variant: 'body',
                              style: {
                                color: '#232323',
                                fontSizePx: 14,
                                lineHeight: 1.58,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const cleanSimpleProfessionalManagerDefinition: ResumeTemplateDefinition = {
  schemaVersion: 1,
  metadata: {
    name: 'Clean Manager',
    slug: 'clean-manager',
    description: 'Clean two-column manager resume with portrait header, soft editorial bands, and structured sidebar content.',
    category: 'Professional',
    tags: ['manager', 'clean', 'two-column', 'serif', 'classic'],
    thumbnailUrl: cleanSimpleProfessionalManagerThumbnail,
  },
  page: {
    size: 'A4',
    widthPx: 794,
    heightPx: 1123,
    margin: {
      top: 22,
      right: 22,
      bottom: 24,
      left: 22,
    },
  },
  theme: {
    fonts: {
      heading: 'Georgia, "Times New Roman", serif',
      body: 'Georgia, "Times New Roman", serif',
      mono: '"Courier New", monospace',
    },
    colors: {
      text: '#1f1f1f',
      muted: '#6f6f6f',
      primary: '#1f1f1f',
      secondary: '#f3f1e8',
      background: '#ffffff',
      accent: '#d7d4c8',
    },
    spacing: {
      sectionGapPx: 18,
      itemGapPx: 8,
      lineHeight: 1.55,
    },
  },
  layout: {
    columns: 1,
    columnGapPx: 0,
  },
  sections: [
    {
      id: 'clean-manager-header',
      type: 'header',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 16,
          style: {
            alignItems: 'center',
            marginBottomPx: 16,
          },
          items: [
            {
              width: 'minmax(0, 1fr)',
              blocks: [
                {
                  kind: 'divider',
                  thicknessPx: 1,
                  color: '#3a3a3a',
                  marginTopPx: 24,
                  marginBottomPx: 0,
                },
              ],
            },
            {
              width: '128px',
              blocks: [
                {
                  kind: 'image',
                  key: 'photo_url',
                  width: 128,
                  height: 128,
                  shape: 'circle',
                  style: {
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  },
                },
              ],
            },
            {
              width: 'minmax(0, 1fr)',
              blocks: [
                {
                  kind: 'divider',
                  thicknessPx: 1,
                  color: '#3a3a3a',
                  marginTopPx: 24,
                  marginBottomPx: 0,
                },
              ],
            },
          ],
        },
        {
          kind: 'text',
          key: 'full_name',
          variant: 'heading',
          style: {
            align: 'center',
            color: '#1c1c1c',
            font: 'Georgia, "Times New Roman", serif',
            fontSizePx: 34,
            fontWeight: 500,
            letterSpacingPx: 3.5,
            marginBottomPx: 6,
          },
        },
        {
          kind: 'text',
          key: 'title',
          variant: 'body',
          style: {
            align: 'center',
            color: '#242424',
            fontSizePx: 15,
            fontWeight: 500,
            letterSpacingPx: 5,
            textTransform: 'uppercase',
            marginBottomPx: 10,
          },
        },
      ],
    },
    {
      id: 'clean-manager-body',
      type: 'custom',
      blocks: [
        {
          kind: 'group',
          direction: 'row',
          gapPx: 36,
          items: [
            {
              width: '210px',
              style: {
                minWidthPx: 210,
              },
              blocks: [
                {
                  kind: 'text',
                  key: 'education_heading',
                  variant: 'label',
                  style: {
                    background: '#ecebe3',
                    color: '#1f1f1f',
                    fontSizePx: 18,
                    fontWeight: 500,
                    letterSpacingPx: 2.2,
                    textTransform: 'uppercase',
                    paddingTopPx: 6,
                    paddingRightPx: 10,
                    paddingBottomPx: 6,
                    paddingLeftPx: 10,
                    marginBottomPx: 14,
                  },
                },
                {
                  kind: 'list',
                  key: 'education',
                  itemGapPx: 20,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        color: '#202020',
                        fontSizePx: 14,
                        fontWeight: 500,
                        marginBottomPx: 6,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'degree',
                      variant: 'body',
                      style: {
                        color: '#202020',
                        fontSizePx: 12.5,
                        lineHeight: 1.45,
                        marginBottomPx: 4,
                      },
                    },
                    {
                      kind: 'richText',
                      key: 'highlights',
                      style: {
                        color: '#262626',
                        fontSizePx: 12,
                        lineHeight: 1.45,
                      },
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'additional_skills_heading',
                  variant: 'label',
                  style: {
                    background: '#ecebe3',
                    color: '#1f1f1f',
                    fontSizePx: 18,
                    fontWeight: 500,
                    letterSpacingPx: 2.2,
                    textTransform: 'uppercase',
                    paddingTopPx: 6,
                    paddingRightPx: 10,
                    paddingBottomPx: 6,
                    paddingLeftPx: 10,
                    marginTopPx: 6,
                    marginBottomPx: 16,
                  },
                },
                {
                  kind: 'list',
                  key: 'skills',
                  itemGapPx: 12,
                  itemBlocks: [
                    {
                      kind: 'group',
                      direction: 'row',
                      gapPx: 10,
                      items: [
                        {
                          width: 'minmax(0, 1fr)',
                          blocks: [
                            {
                              kind: 'text',
                              key: 'name',
                              variant: 'body',
                              style: {
                                color: '#222222',
                                fontSizePx: 13,
                              },
                            },
                          ],
                        },
                        {
                          width: '74px',
                          blocks: [
                            {
                              kind: 'divider',
                              thicknessPx: 4,
                              color: '#9fa3a8',
                              marginTopPx: 12,
                              marginBottomPx: 0,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'contacts_heading',
                  variant: 'label',
                  style: {
                    background: '#ecebe3',
                    color: '#1f1f1f',
                    fontSizePx: 18,
                    fontWeight: 500,
                    letterSpacingPx: 2.2,
                    textTransform: 'uppercase',
                    paddingTopPx: 6,
                    paddingRightPx: 10,
                    paddingBottomPx: 6,
                    paddingLeftPx: 10,
                    marginTopPx: 10,
                    marginBottomPx: 16,
                  },
                },
                {
                  kind: 'list',
                  key: 'sidebar_contacts',
                  itemGapPx: 8,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'value',
                      variant: 'body',
                      style: {
                        color: '#222222',
                        fontSizePx: 12.5,
                        lineHeight: 1.45,
                      },
                    },
                  ],
                },
              ],
            },
            {
              width: 'minmax(0, 1fr)',
              blocks: [
                {
                  kind: 'text',
                  key: 'about_myself_heading',
                  variant: 'label',
                  style: {
                    background: '#ecebe3',
                    color: '#1f1f1f',
                    fontSizePx: 18,
                    fontWeight: 500,
                    letterSpacingPx: 2.2,
                    textTransform: 'uppercase',
                    paddingTopPx: 6,
                    paddingRightPx: 10,
                    paddingBottomPx: 6,
                    paddingLeftPx: 10,
                    marginBottomPx: 14,
                  },
                },
                {
                  kind: 'richText',
                  key: 'summary',
                  style: {
                    color: '#232323',
                    fontSizePx: 13.5,
                    lineHeight: 1.55,
                    marginBottomPx: 16,
                  },
                },
                {
                  kind: 'text',
                  key: 'experience_heading',
                  variant: 'label',
                  style: {
                    background: '#ecebe3',
                    color: '#1f1f1f',
                    fontSizePx: 18,
                    fontWeight: 500,
                    letterSpacingPx: 2.2,
                    textTransform: 'uppercase',
                    paddingTopPx: 6,
                    paddingRightPx: 10,
                    paddingBottomPx: 6,
                    paddingLeftPx: 10,
                    marginTopPx: 4,
                    marginBottomPx: 14,
                  },
                },
                {
                  kind: 'list',
                  key: 'experience',
                  itemGapPx: 22,
                  itemBlocks: [
                    {
                      kind: 'text',
                      key: 'date_range',
                      variant: 'body',
                      style: {
                        color: '#202020',
                        fontSizePx: 14,
                        fontWeight: 500,
                        marginBottomPx: 4,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'company',
                      variant: 'body',
                      style: {
                        color: '#202020',
                        fontSizePx: 14,
                        marginBottomPx: 2,
                      },
                    },
                    {
                      kind: 'text',
                      key: 'role',
                      variant: 'subheading',
                      style: {
                        color: '#1f1f1f',
                        fontSizePx: 14.5,
                        fontWeight: 600,
                        marginBottomPx: 6,
                      },
                    },
                    {
                      kind: 'list',
                      key: 'bullet_lines',
                      itemGapPx: 5,
                      itemBlocks: [
                        {
                          kind: 'text',
                          key: 'value',
                          variant: 'body',
                          style: {
                            color: '#232323',
                            fontSizePx: 13,
                            lineHeight: 1.5,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  kind: 'text',
                  key: 'certifications_heading',
                  variant: 'label',
                  style: {
                    background: '#ecebe3',
                    color: '#1f1f1f',
                    fontSizePx: 18,
                    fontWeight: 500,
                    letterSpacingPx: 2.2,
                    textTransform: 'uppercase',
                    paddingTopPx: 6,
                    paddingRightPx: 10,
                    paddingBottomPx: 6,
                    paddingLeftPx: 10,
                    marginTopPx: 12,
                    marginBottomPx: 14,
                  },
                },
                {
                  kind: 'richText',
                  key: 'certifications_text',
                  style: {
                    color: '#232323',
                    fontSizePx: 13.5,
                    lineHeight: 1.55,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const BUILT_IN_RESUME_TEMPLATES: ResumeTemplateRecord[] = [
  {
    id: 'builtin-carter-classic',
    slug: 'carter-classic',
    name: 'Carter Classic',
    description: 'Classic editorial resume inspired by the provided reference layout.',
    category: 'Simple',
    thumbnailUrl: carterClassicThumbnail,
    isActive: true,
    definition: carterClassicDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'builtin-black-white-professional',
    slug: 'black-white-professional',
    name: 'Black & White Professional',
    description: 'Monochrome resume with a profile photo, bold section headers, and structured experience rows.',
    category: 'Simple',
    thumbnailUrl: blackWhiteProfessionalThumbnail,
    isActive: true,
    definition: blackWhiteProfessionalDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'builtin-blue-gray-professional',
    slug: 'blue-gray-professional',
    name: 'Blue Gray Professional',
    description: 'Two-column professional CV with a blue accent system and a soft gray sidebar.',
    category: 'Professional',
    thumbnailUrl: blueGraySimpleProfessionalThumbnail,
    isActive: true,
    definition: blueGraySimpleProfessionalDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'builtin-accounting-executive',
    slug: 'accounting-executive',
    name: 'Accounting Executive',
    description: 'Minimal two-column executive resume with elegant spacing and customizable accent color.',
    category: 'Professional',
    thumbnailUrl: accountingExecutiveThumbnail,
    isActive: true,
    definition: accountingExecutiveDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'builtin-minimalist-modern',
    slug: 'minimalist-modern',
    name: 'Minimalist Modern',
    description: 'Warm modern CV with a blush hero header, dark sidebar, and balanced editorial layout.',
    category: 'Professional',
    thumbnailUrl: minimalistModernProfessionalThumbnail,
    isActive: true,
    definition: minimalistModernProfessionalDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'builtin-marketing-manager-cv',
    slug: 'marketing-manager-cv',
    name: 'Marketing Manager CV',
    description: 'Minimal professional CV with a soft gray sidebar, bold name treatment, and timeline-style experience.',
    category: 'Professional',
    thumbnailUrl: simpleProfessionalMarketingManagerThumbnail,
    isActive: true,
    definition: simpleProfessionalMarketingManagerDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'builtin-lavender-executive',
    slug: 'lavender-executive',
    name: 'Lavender Executive',
    description: 'Elegant single-column resume with lavender headings, centered contact line, and clean executive spacing.',
    category: 'Professional',
    thumbnailUrl: lavenderExecutiveThumbnail,
    isActive: true,
    definition: lavenderExecutiveDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'builtin-clean-manager',
    slug: 'clean-manager',
    name: 'Clean Manager',
    description: 'Classic two-column manager resume with portrait header, editorial bands, and structured sidebar details.',
    category: 'Professional',
    thumbnailUrl: cleanSimpleProfessionalManagerThumbnail,
    isActive: true,
    definition: cleanSimpleProfessionalManagerDefinition,
    createdBy: 'system',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

export const BUILT_IN_RESUME_TEMPLATE_CARDS = BUILT_IN_RESUME_TEMPLATES.map((template) => ({
  name: template.slug,
  slug: template.slug,
  displayName: template.name,
  thumbnailUrl: template.thumbnailUrl ?? undefined,
}));

export const mergeResumeTemplateRecords = (records: ResumeTemplateRecord[]) => {
  const merged = new Map<string, ResumeTemplateRecord>();
  BUILT_IN_RESUME_TEMPLATES.forEach((template) => {
    merged.set(template.slug, template);
  });
  records.forEach((template) => {
    merged.set(template.slug, template);
  });
  return Array.from(merged.values());
};
