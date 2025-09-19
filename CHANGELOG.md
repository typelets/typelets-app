## [1.16.5](https://github.com/typelets/typelets-app/compare/v1.16.4...v1.16.5) (2025-09-19)


### Bug Fixes

* use cross-platform GitHub script for getting latest release tag ([eb1c53d](https://github.com/typelets/typelets-app/commit/eb1c53d57a0e9be8b1d22891c519af18588b4f8a))

## [1.16.4](https://github.com/typelets/typelets-app/compare/v1.16.3...v1.16.4) (2025-09-19)


### Bug Fixes

* ensure desktop builds always run on main pushes and use latest release tag ([a17d907](https://github.com/typelets/typelets-app/commit/a17d907bc261f19b4785fa9d6d299f7e013a4e82))

## [1.16.3](https://github.com/typelets/typelets-app/compare/v1.16.2...v1.16.3) (2025-09-19)


### Bug Fixes

* integrate desktop builds directly into release workflow ([14c068a](https://github.com/typelets/typelets-app/commit/14c068a963adee82346f5df116b6353d804f0370))

## [1.16.2](https://github.com/typelets/typelets-app/compare/v1.16.1...v1.16.2) (2025-09-19)


### Bug Fixes

* only run attach-assets job for release events ([48bd108](https://github.com/typelets/typelets-app/commit/48bd1084cfbed3edf72d93ba0796d6ba64dac55f))

## [1.16.1](https://github.com/typelets/typelets-app/compare/v1.16.0...v1.16.1) (2025-09-19)


### Bug Fixes

* trigger desktop builds on release events ([a6f8c23](https://github.com/typelets/typelets-app/commit/a6f8c23be72d5ddbffd4d7c8112aebf6dd1b7440))

# [1.16.0](https://github.com/typelets/typelets-app/compare/v1.15.5...v1.16.0) (2025-09-18)


### Features

* complete desktop app integration with unified versioning ([ae440f8](https://github.com/typelets/typelets-app/commit/ae440f8dce6950ad891d0eb9c97e020adc5548c6))

## [1.15.5](https://github.com/typelets/typelets-app/compare/v1.15.4...v1.15.5) (2025-09-18)


### Bug Fixes

* update desktop build workflow to detect version changes in constants file ([ac7af63](https://github.com/typelets/typelets-app/commit/ac7af637c2e07a58707e4e13acf45bc7db53005d))

## [1.15.4](https://github.com/typelets/typelets-app/compare/v1.15.3...v1.15.4) (2025-09-18)


### Bug Fixes

* implement unified versioning system and fix desktop app loading ([5e09b78](https://github.com/typelets/typelets-app/commit/5e09b781a2769c643f4a2fe542986d3c53411584))

## [1.15.3](https://github.com/typelets/typelets-app/compare/v1.15.2...v1.15.3) (2025-09-18)


### Bug Fixes

* align desktop app version with main app and use main version for releases ([845a69f](https://github.com/typelets/typelets-app/commit/845a69fc94751e2827f94366363348e147dcf52a))

## [1.15.2](https://github.com/typelets/typelets-app/compare/v1.15.1...v1.15.2) (2025-09-18)


### Bug Fixes

* check desktop package.json for version changes in workflow ([f109f1f](https://github.com/typelets/typelets-app/commit/f109f1ffe71d258bb052c3708d6a99466a74f88d))

## [1.15.1](https://github.com/typelets/typelets-app/compare/v1.15.0...v1.15.1) (2025-09-18)


### Bug Fixes

* exclude desktop dist directory from ESLint ([b4f784b](https://github.com/typelets/typelets-app/commit/b4f784ba5c4e0e5a7a668eedd54990e17cfb3a92))

# [1.15.0](https://github.com/typelets/typelets-app/compare/v1.14.5...v1.15.0) (2025-09-18)


### Bug Fixes

* create proper multi-resolution ICO file for Windows builds ([f5e0d96](https://github.com/typelets/typelets-app/commit/f5e0d967543c37091bde3af5545aa118e401d375))
* resolve eslint issues in Electron TypeScript code ([d728bd3](https://github.com/typelets/typelets-app/commit/d728bd3ca0d6f492d25571a55168e14365854728))
* use proper 256x256 PNG icon for Linux builds ([e1086f1](https://github.com/typelets/typelets-app/commit/e1086f1d2077bd73fcffb10650a6a1203e35369c))


### Features

* add desktop app and UI improvements ([4cd03de](https://github.com/typelets/typelets-app/commit/4cd03de1b0f3dd86bc1e547cde25324dc129a201))

## [1.14.5](https://github.com/typelets/typelets-app/compare/v1.14.4...v1.14.5) (2025-09-18)


### Bug Fixes

* enable real-time sync for notes and folders across tabs ([d546bc2](https://github.com/typelets/typelets-app/commit/d546bc2c61b54dc2ef6463b3976221189c861a91))
* enable real-time sync for notes and folders across tabs ([3c78591](https://github.com/typelets/typelets-app/commit/3c7859163260724332b5805ff240f5720fd6b9ae))

## [1.14.4](https://github.com/typelets/typelets-app/compare/v1.14.3...v1.14.4) (2025-09-16)


### Bug Fixes

* resolve API validation and WebSocket message issues ([eb5588c](https://github.com/typelets/typelets-app/commit/eb5588c9baa32afd0890e39eff15c1cafa9949eb))
* resolve WebSocket message issues ([f441405](https://github.com/typelets/typelets-app/commit/f441405cd3dc03406736f89b66e9162828540b47))

## [1.14.3](https://github.com/typelets/typelets-app/compare/v1.14.2...v1.14.3) (2025-09-16)


### Bug Fixes

* remove undefined title/content fields from note creation request ([be5cad2](https://github.com/typelets/typelets-app/commit/be5cad2a33c363f6cf655838c125da6b5ea90073))

## [1.14.2](https://github.com/typelets/typelets-app/compare/v1.14.1...v1.14.2) (2025-09-15)


### Bug Fixes

* add VITE_WEBSOCKET_URL build argument to Docker configuration ([acd2558](https://github.com/typelets/typelets-app/commit/acd255849ff381c44792284525fbd1aad6f5fb5e))

## [1.14.1](https://github.com/typelets/typelets-app/compare/v1.14.0...v1.14.1) (2025-09-15)


### Bug Fixes

* **editor:** resolve Node naming conflict in TableOfContents ([96f0a60](https://github.com/typelets/typelets-app/commit/96f0a6077d99d3c1a5deba47a1a8ff562d56d70b))
* remove unused keyInitialized variable in messageAuth ([0629ea0](https://github.com/typelets/typelets-app/commit/0629ea0b5e08ba23d901e0f79b367e11ce6dcc09))
* resolve critical XSS vulnerabilities and code quality issues ([cf62e72](https://github.com/typelets/typelets-app/commit/cf62e724d433e3c8c0b6e836b27b543e521531a7))
* resolve critical XSS vulnerabilities and code quality issues ([af9c758](https://github.com/typelets/typelets-app/commit/af9c758f71d735961aebc57a776f39cb007c89ff))

# [1.14.0](https://github.com/typelets/typelets-app/compare/v1.13.0...v1.14.0) (2025-09-15)


### Features

* implement WebSocket real-time sync with HMAC message authentication ([469bfa9](https://github.com/typelets/typelets-app/commit/469bfa9c15f78997fe557b6abda31c020d57b36d))

# [1.13.0](https://github.com/typelets/typelets-app/compare/v1.12.0...v1.13.0) (2025-09-12)


### Features

* enhance editor with UI components and fix usage display ([2502db7](https://github.com/typelets/typelets-app/commit/2502db71175c7b6485960b22887bd1fe7b360755))

# [1.12.0](https://github.com/typelets/typelets-app/compare/v1.11.0...v1.12.0) (2025-09-10)


### Features

* add usage tracking, password template, and fix folder pagination ([efd1989](https://github.com/typelets/typelets-app/commit/efd1989d62b2e84f1f726c069dbf411882a41004))

# [1.11.0](https://github.com/typelets/typelets-app/compare/v1.10.4...v1.11.0) (2025-09-08)


### Bug Fixes

* resolve TypeScript errors - update tippy.js types and add hiddenCount prop ([920bb11](https://github.com/typelets/typelets-app/commit/920bb11f5d2d675a903283b4227a1daae51af4a0))


### Features

* implement hidden notes filtering and improve type safety ([8a013f4](https://github.com/typelets/typelets-app/commit/8a013f49811d22293e9c9adfa5e1da7a683b15a5))

## [1.10.4](https://github.com/typelets/typelets-app/compare/v1.10.3...v1.10.4) (2025-09-07)


### Bug Fixes

* increase nginx client_max_body_size to 50M for file uploads ([cb5a2bf](https://github.com/typelets/typelets-app/commit/cb5a2bfaf07fd1ad4152be1a174c71fc03a47535))

## [1.10.3](https://github.com/typelets/typelets-app/compare/v1.10.2...v1.10.3) (2025-09-06)


### Bug Fixes

* resolve file encryption issues and add note ID to status bar ([aa91bbc](https://github.com/typelets/typelets-app/commit/aa91bbcea97ada9a5d0191d56480e60a288c2c3d))

## [1.10.2](https://github.com/typelets/typelets-app/compare/v1.10.1...v1.10.2) (2025-09-06)


### Bug Fixes

* resolve clear-text storage of encryption secrets ([2d43ceb](https://github.com/typelets/typelets-app/commit/2d43cebeb58dc85fb1af0f4157a5a8e708158ac5))

## [1.10.1](https://github.com/typelets/typelets-app/compare/v1.10.0...v1.10.1) (2025-09-06)


### Bug Fixes

* resolve master password prompt issues for new and returning users ([e006899](https://github.com/typelets/typelets-app/commit/e006899a79f287946166131a1b1f24c749494d75))

# [1.10.0](https://github.com/typelets/typelets-app/compare/v1.9.0...v1.10.0) (2025-09-05)


### Bug Fixes

* remove unused index parameter in template mapping ([6b6768c](https://github.com/typelets/typelets-app/commit/6b6768cd6b9e73566cb28931f22a5ac0e3fdaeeb))


### Features

* add document templates for quick note creation ([163100e](https://github.com/typelets/typelets-app/commit/163100e257dadb8a35ef7088b6583994a684a6a3))

# [1.9.0](https://github.com/typelets/typelets-app/compare/v1.8.1...v1.9.0) (2025-09-05)


### Bug Fixes

* resolve build errors and implement VSCode-style status bar ([82e3ebb](https://github.com/typelets/typelets-app/commit/82e3ebb8ff8677b891a62d1265d53e7edea906b1))
* resolve ESLint warning by properly typing ResizableImage component props ([f6cb992](https://github.com/typelets/typelets-app/commit/f6cb99234252451acec3d86d8bd0c17bd326a349))
* resolve ReactNodeViewRenderer type compatibility with proper type assertion ([80c177c](https://github.com/typelets/typelets-app/commit/80c177c3078efe08510726fcda49084216c92afa))


### Features

* enhance editor with comprehensive features, filtering, and auto-save ([bd0527c](https://github.com/typelets/typelets-app/commit/bd0527ce4261f95f513de8683314018c01953f7a))

## [1.8.1](https://github.com/typelets/typelets-app/compare/v1.8.0...v1.8.1) (2025-09-05)


### Bug Fixes

* replace mobile tabs with native sidebar drawer navigation and enhance user experience ([cd7701f](https://github.com/typelets/typelets-app/commit/cd7701f1e8f78671d9a29cb187ee430b69b2e245))

# [1.8.0](https://github.com/typelets/typelets-app/compare/v1.7.0...v1.8.0) (2025-09-04)


### Features

* modernize mobile layout with shadcn/ui tabs and improved navigation ([f2dba7e](https://github.com/typelets/typelets-app/commit/f2dba7e0b8be938c496e075f1e5106d8a41040a0))

# [1.7.0](https://github.com/typelets/typelets-app/compare/v1.6.0...v1.7.0) (2025-09-04)


### Features

* add print functionality to note dropdown menu ([1b07def](https://github.com/typelets/typelets-app/commit/1b07defb58a956290e30c30d5c3cc5ec9bddd12e))

# [1.6.0](https://github.com/typelets/typelets-app/compare/v1.5.0...v1.6.0) (2025-09-04)


### Features

* add attachment indicators to notes list and fix star toggle preservation ([02c4f78](https://github.com/typelets/typelets-app/commit/02c4f786095ec15dbcb07086ee468e5eb08d8623))

# [1.5.0](https://github.com/typelets/typelets-app/compare/v1.4.0...v1.5.0) (2025-09-04)


### Bug Fixes

* Fix linting errors and warnings ([2b6381f](https://github.com/typelets/typelets-app/commit/2b6381fd47af3eb13b4c0d14c6460d7a2273524b))


### Features

* add encrypted file attachments with drag-and-drop upload ([f526c31](https://github.com/typelets/typelets-app/commit/f526c316185ec68f0d3aba0502b42fdee5109ae2))

# [1.4.0](https://github.com/typelets/typelets-app/compare/v1.3.2...v1.4.0) (2025-08-14)


### Features

* Add master password change functionality with encryption key management ([051159c](https://github.com/typelets/typelets-app/commit/051159c9dadf7e6994645b4c2c709511ad268217))

## [1.3.2](https://github.com/typelets/typelets-app/compare/v1.3.1...v1.3.2) (2025-08-14)


### Bug Fixes

* display folder name and color in note cards ([26722fc](https://github.com/typelets/typelets-app/commit/26722fc1f567a8b2b79277c6f081a78a92c0e0f6))
* display folder name and color in note cards ([ba240db](https://github.com/typelets/typelets-app/commit/ba240dbdc88161a6bfa0a1f6d09b79f90a270533))

## [1.3.1](https://github.com/typelets/typelets-app/compare/v1.3.0...v1.3.1) (2025-08-14)


### Bug Fixes

* display folder name and color indicator in note cards ([9d55047](https://github.com/typelets/typelets-app/commit/9d550478ba5b5c28afff3854e2b1c1b3a3db549b))

# [1.3.0](https://github.com/typelets/typelets-app/compare/v1.2.0...v1.3.0) (2025-08-14)


### Bug Fixes

* display folder name and color in note cards ([aa853d7](https://github.com/typelets/typelets-app/commit/aa853d73b3a4587abace503a1372738a99c8fbc9))
* display folder name and color in note cards ([b5341fb](https://github.com/typelets/typelets-app/commit/b5341fb51a3d333dc3d29ad7b7839da5664e7417))
* display folder name and color in note cards ([3fbfc19](https://github.com/typelets/typelets-app/commit/3fbfc197a5309615c8679f0cb570cf452b4a3c7b))


### Features

* add E2E encryption with master password and server-side data masking ([da5ff9a](https://github.com/typelets/typelets-app/commit/da5ff9ab01f765e5b1e5b8a8e187fed84ba7b14b))

# [1.2.0](https://github.com/typelets/typelets-app/compare/v1.1.1...v1.2.0) (2025-08-14)


### Features

* send [ENCRYPTED] placeholders for title/content to server while storing actual encrypted data separately ([2d3c11f](https://github.com/typelets/typelets-app/commit/2d3c11ffd017e12150f2673150bc98e9e8b2ef4d))

## [1.1.1](https://github.com/typelets/typelets-app/compare/v1.1.0...v1.1.1) (2025-08-13)


### Bug Fixes

* resolve security vulnerability in tmp package via pnpm override ([e5f203d](https://github.com/typelets/typelets-app/commit/e5f203d699fdc7cbdd057e7b37e31cd72546e461))

# [1.1.0](https://github.com/typelets/typelets-app/compare/v1.0.0...v1.1.0) (2025-08-13)


### Features

* add move functionality for notes and folders with tree-view selection ([a434c41](https://github.com/typelets/typelets-app/commit/a434c411386fbe414f12fd10a0561a9867fa368a))
* add move note to folder functionality with modal interface ([aea639f](https://github.com/typelets/typelets-app/commit/aea639fce0e25bfc6590304f8e56de5e507b87fc))

# 1.0.0 (2025-08-12)


### Features

* initial open source release of TypeLets ([348afaa](https://github.com/typelets/typelets-app/commit/348afaa7ef190f7403813f3d3fc6485ba6b0bd9b))

# Changelog

All notable changes to this project will be documented in this file.
