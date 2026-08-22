# Assets Directory

This directory contains frontend assets like branding logos and custom local fonts.

## Structure
```text
assets/
├── branding/
│   └── logos/
│       ├── uni-nexus/
│       ├── uni-inside-studio/
│       └── uni-inside-craft/
└── fonts/
```

## Rules
- Application logos belong under `src/assets/branding/logos/`
- Custom local fonts belong under `src/assets/fonts/`
- Favicon/browser icons belong under `/public`
- Source-code components should import app logos from `src/assets`
- Favicon files should be referenced using root paths such as `/favicon.svg`
