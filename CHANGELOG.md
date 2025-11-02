## [1.31.3](https://github.com/typelets/typelets-app/compare/v1.31.2...v1.31.3) (2025-11-02)


### Bug Fixes

* **mobile:** cache invalidation, startup refresh, and autocorrect ([9570c4d](https://github.com/typelets/typelets-app/commit/9570c4d1fac27c26cda76429b65ec9b179dc41c3))

## [1.31.2](https://github.com/typelets/typelets-app/compare/v1.31.1...v1.31.2) (2025-11-01)


### Bug Fixes

* **mobile:** implement cache invalidation, stale-while-revalidate, and autocorrect ([93bce41](https://github.com/typelets/typelets-app/commit/93bce41d3abf6ca5addc047a14907b2b4c19e688))

## [1.31.1](https://github.com/typelets/typelets-app/compare/v1.31.0...v1.31.1) (2025-11-01)


### Bug Fixes

* update @tailwindcss/vite to fix tar security vulnerability ([591ba34](https://github.com/typelets/typelets-app/commit/591ba347feac9d197ba2ca1dc79b458dab90b467))

# [1.31.0](https://github.com/typelets/typelets-app/compare/v1.30.12...v1.31.0) (2025-11-01)


### Bug Fixes

* **mobile:** fix offline note viewing ([0269dcc](https://github.com/typelets/typelets-app/commit/0269dcce8a685d5bd3a8dd962731ae8b12348481))
* **mobile:** resolve attachment badges, temp note sync, and offline editing issues ([025ac5b](https://github.com/typelets/typelets-app/commit/025ac5b462171540239ff5a6c571a35f36bb0362))


### Features

* **mobile:** implement offline-first architecture with SQLite caching ([84d7d7b](https://github.com/typelets/typelets-app/commit/84d7d7b90552b35adc32422fbe60d29eec2b18c0))


### Performance Improvements

* **mobile:** optimize offline folder counts with caching and indexing ([9eff343](https://github.com/typelets/typelets-app/commit/9eff343b9d938902b7bad4bff2f39db93d0387a0))

## [1.30.12](https://github.com/typelets/typelets-app/compare/v1.30.11...v1.30.12) (2025-10-29)


### Bug Fixes

* add script-src-elem to CSP to allow Clerk authentication scripts ([6976421](https://github.com/typelets/typelets-app/commit/69764210675bd77fbc61b2501d2429d90537648a))

## [1.30.11](https://github.com/typelets/typelets-app/compare/v1.30.10...v1.30.11) (2025-10-29)


### Bug Fixes

* add script-src-elem to CSP to allow Clerk authentication scripts ([cd7fc54](https://github.com/typelets/typelets-app/commit/cd7fc54c8c4d15ba2c7666975a5acc7e0ad77651))

## [1.30.10](https://github.com/typelets/typelets-app/compare/v1.30.9...v1.30.10) (2025-10-29)


### Bug Fixes

* add script-src-elem to CSP to allow Clerk authentication scripts ([1d424f1](https://github.com/typelets/typelets-app/commit/1d424f1817ff754cad2373204eeb55ac61a03ab5))

## [1.30.9](https://github.com/typelets/typelets-app/compare/v1.30.8...v1.30.9) (2025-10-28)


### Bug Fixes

* **mobile:** optimize note list loading with progressive decryption and skeleton UI ([19019bb](https://github.com/typelets/typelets-app/commit/19019bb8d851004630c868a789c2db56f4c5051b))


### Performance Improvements

* **mobile:** add performance logging to identify notes list bottlenecks ([60785be](https://github.com/typelets/typelets-app/commit/60785bee0d6121199b4263706133f9f389d1dd08))

## [1.30.8](https://github.com/typelets/typelets-app/compare/v1.30.7...v1.30.8) (2025-10-28)


### Bug Fixes

* add .dockerignore to exclude mobile apps from the Docker build ([f8df448](https://github.com/typelets/typelets-app/commit/f8df448917532cbfb59685bcaf7b2be9e512b4ea))

## [1.30.7](https://github.com/typelets/typelets-app/compare/v1.30.6...v1.30.7) (2025-10-28)


### Bug Fixes

* **web:** display attachment badges in notes list and disable WebSocket features ([2c2f7ab](https://github.com/typelets/typelets-app/commit/2c2f7ab3672cbcdeb056dd3c023449eb595f7ba2))

## [1.30.6](https://github.com/typelets/typelets-app/compare/v1.30.5...v1.30.6) (2025-10-28)


### Bug Fixes

* **mobile:** implement native scrolling for note editor ([feb8564](https://github.com/typelets/typelets-app/commit/feb85644df6deaa4e492620f727a0a8391fc956e))

## [1.30.5](https://github.com/typelets/typelets-app/compare/v1.30.4...v1.30.5) (2025-10-28)


### Bug Fixes

* **mobile:** resolve editor Enter key behavior and improve code quality ([12769de](https://github.com/typelets/typelets-app/commit/12769de919222b0c526c24ea20b47e0db32228b7))
* **mobile:** resolve editor Enter key behavior and improve code quality ([14eefa7](https://github.com/typelets/typelets-app/commit/14eefa708559f4ff9fbb8a5af8b8c02c7b9475de))

## [1.30.4](https://github.com/typelets/typelets-app/compare/v1.30.3...v1.30.4) (2025-10-26)


### Bug Fixes

* **mobile:** resolve Android crash caused by NewRelic instrumentation ([e735203](https://github.com/typelets/typelets-app/commit/e7352035b5a4a53031405f279b1b3231f7c97218))

## [1.30.3](https://github.com/typelets/typelets-app/compare/v1.30.2...v1.30.3) (2025-10-26)


### Bug Fixes

* **mobile:** disable Sentry mobile replay to prevent crashes ([8a001db](https://github.com/typelets/typelets-app/commit/8a001db42858dbff3fac12a3c484273daa88523d))

## [1.30.2](https://github.com/typelets/typelets-app/compare/v1.30.1...v1.30.2) (2025-10-26)


### Bug Fixes

* **mobile:** enhance Sentry monitoring with comprehensive error tracking and performance monitoring ([bb93acf](https://github.com/typelets/typelets-app/commit/bb93acf8504248addc9df3e8dc8d6aacdadc5e81))
* **mobile:** enhance Sentry monitoring with comprehensive error tracking and performance monitoring ([721f79e](https://github.com/typelets/typelets-app/commit/721f79ef793141ff2e5a415980bfe9378b62fcf0))

## [1.30.1](https://github.com/typelets/typelets-app/compare/v1.30.0...v1.30.1) (2025-10-25)


### Bug Fixes

* configure Sentry SDK for mobile app error monitoring ([727cfa3](https://github.com/typelets/typelets-app/commit/727cfa324cfad49b24bd85182e45bc8344a1d750))

# [1.30.0](https://github.com/typelets/typelets-app/compare/v1.29.0...v1.30.0) (2025-10-25)


### Bug Fixes

* replace NodeJS.Timeout types with ReturnType<typeof setTimeout/setInterval> to ensure compatibility with browser environments where setTimeout returns number instead of NodeJS.Timeout ([e7b62ae](https://github.com/typelets/typelets-app/commit/e7b62ae958a1b7e1b7f2f8251e4cacb0ab137cb2))
* resolve TypeScript timeout type errors across editor components ([f01af31](https://github.com/typelets/typelets-app/commit/f01af310ebd6387b7d199f9a0dd410b3ab3a4d21))


### Features

* **mobile:** add native WebView-based WYSIWYG editor with Tiptap compatibility ([0cdfc25](https://github.com/typelets/typelets-app/commit/0cdfc2553ad51bf55f56e7fdf213db19674d434f))
* **mobile:** add native WebView-based WYSIWYG editor with Tiptap compatibility ([d7cd580](https://github.com/typelets/typelets-app/commit/d7cd580ab3ae2a399386b8c109d67171a5ec048b))

# [1.29.0](https://github.com/typelets/typelets-app/compare/v1.28.16...v1.29.0) (2025-10-24)


### Features

* integrate Sentry monitoring and improve error handling ([a29c98b](https://github.com/typelets/typelets-app/commit/a29c98bfc118da0917235ff54c5a01a14065f96a))

## [1.28.16](https://github.com/typelets/typelets-app/compare/v1.28.15...v1.28.16) (2025-10-23)


### Bug Fixes

* **mobile:** exclude deleted and archived notes from folder and all views ([381ff8b](https://github.com/typelets/typelets-app/commit/381ff8beb705e68e43a2980b8e39f2fd99830038))

## [1.28.15](https://github.com/typelets/typelets-app/compare/v1.28.14...v1.28.15) (2025-10-23)


### Performance Improvements

* **mobile:** implement API caching and server-side filtering for 50-70% faster load times ([99db10a](https://github.com/typelets/typelets-app/commit/99db10a3737bbf70e2dbf28fa302395deb61a6ab))

## [1.28.14](https://github.com/typelets/typelets-app/compare/v1.28.13...v1.28.14) (2025-10-23)


### Bug Fixes

* **mobile:** improve checkbox alignment and remove notification badges ([a41f216](https://github.com/typelets/typelets-app/commit/a41f216a0d40057e5960dbcae84f68b7affb7776))

## [1.28.13](https://github.com/typelets/typelets-app/compare/v1.28.12...v1.28.13) (2025-10-22)


### Bug Fixes

* **mobile:** improve code block visibility and divider consistency ([b82a0f5](https://github.com/typelets/typelets-app/commit/b82a0f5ed9a21d251b5c1a72499428b612b49107))

## [1.28.12](https://github.com/typelets/typelets-app/compare/v1.28.11...v1.28.12) (2025-10-20)


### Bug Fixes

* **mobile,web:** improve UX for text selection, folder navigation, and touch responsiveness ([6157256](https://github.com/typelets/typelets-app/commit/61572562e02035386f614b50651913ca6c576282))

## [1.28.11](https://github.com/typelets/typelets-app/compare/v1.28.10...v1.28.11) (2025-10-19)


### Bug Fixes

* SSL handshake to backend ([7858c87](https://github.com/typelets/typelets-app/commit/7858c87aae2052a70032f4f1e8747b29c8ca21cf))

## [1.28.10](https://github.com/typelets/typelets-app/compare/v1.28.9...v1.28.10) (2025-10-19)


### Bug Fixes

* infinite loop loading attachments causing rate limit errors ([c7c74aa](https://github.com/typelets/typelets-app/commit/c7c74aab253e3a164fa6fabb8e30e869d46f89b2))

## [1.28.9](https://github.com/typelets/typelets-app/compare/v1.28.8...v1.28.9) (2025-10-19)


### Bug Fixes

* remove Tiptap from code splitting to resolve dependency order error ([ccf7220](https://github.com/typelets/typelets-app/commit/ccf7220746cfdf659b90ff16c5cf9b8ce519273f))

## [1.28.8](https://github.com/typelets/typelets-app/compare/v1.28.7...v1.28.8) (2025-10-19)


### Bug Fixes

* improve Monaco editor theming and empty trash UX ([602d58b](https://github.com/typelets/typelets-app/commit/602d58ba45a909acdbf539dad03915879a62f359))
* improve Monaco editor theming, empty trash UX, app performance, and editor stability ([b5714a2](https://github.com/typelets/typelets-app/commit/b5714a2650fabd75e3080350ef57825af38ced9a))

## [1.28.7](https://github.com/typelets/typelets-app/compare/v1.28.6...v1.28.7) (2025-10-18)


### Bug Fixes

* **mobile:** add PIN verification flow to password reset ([efdd4d6](https://github.com/typelets/typelets-app/commit/efdd4d603b384fc38bf31cf1ecdbee1e81747ac0))

## [1.28.6](https://github.com/typelets/typelets-app/compare/v1.28.5...v1.28.6) (2025-10-18)


### Bug Fixes

* **mobile:** add PIN verification flow to password reset ([cd21052](https://github.com/typelets/typelets-app/commit/cd210526a31e0e62aba26b95959710e5fc977c26))

## [1.28.5](https://github.com/typelets/typelets-app/compare/v1.28.4...v1.28.5) (2025-10-18)


### Bug Fixes

* **mobile:** optimize folder loading with parallel pagination ([339a4ff](https://github.com/typelets/typelets-app/commit/339a4ffd1cb6a2a2cab9551a2debc6343c8331a1))
* **mobile:** update Android build for performance improved API ([ef1d046](https://github.com/typelets/typelets-app/commit/ef1d0467df941219426c1139aa918f910e842d7c))

## [1.28.4](https://github.com/typelets/typelets-app/compare/v1.28.3...v1.28.4) (2025-10-17)


### Bug Fixes

* folder counts not updating and performance issues ([b63aae9](https://github.com/typelets/typelets-app/commit/b63aae98ebfce2b4a86129dfac2226c6b0b1680e))

## [1.28.3](https://github.com/typelets/typelets-app/compare/v1.28.2...v1.28.3) (2025-10-16)


### Bug Fixes

* **notes:** improve NEW badge UX and add star button loading state ([2adb5b0](https://github.com/typelets/typelets-app/commit/2adb5b04c93f1a7ff6bb51f8df39e8cc95557e04))

## [1.28.2](https://github.com/typelets/typelets-app/compare/v1.28.1...v1.28.2) (2025-10-15)


### Bug Fixes

* **web:** add version notification system for What's New ([6f0af0d](https://github.com/typelets/typelets-app/commit/6f0af0d2eb907b6f5515d0b98241d08f3594eb4b))

## [1.28.1](https://github.com/typelets/typelets-app/compare/v1.28.0...v1.28.1) (2025-10-15)


### Bug Fixes

* **mobile:** optimize home screen loading with counts endpoint ([0a26610](https://github.com/typelets/typelets-app/commit/0a26610191d5496f91eb6862e6e09a6ae161f1d4))

# [1.28.0](https://github.com/typelets/typelets-app/compare/v1.27.0...v1.28.0) (2025-10-15)


### Features

* **mobile/web:** add version notification system for What's New ([bf72044](https://github.com/typelets/typelets-app/commit/bf72044914c93df5d034362f0aca840e220e2ebf))

# [1.27.0](https://github.com/typelets/typelets-app/compare/v1.26.1...v1.27.0) (2025-10-15)


### Features

* **mobile/web:** add version notification system for What's New ([dcdc4c7](https://github.com/typelets/typelets-app/commit/dcdc4c798fa56468b79957e72ddb551c865874c4))

## [1.26.1](https://github.com/typelets/typelets-app/compare/v1.26.0...v1.26.1) (2025-10-15)


### Bug Fixes

* improve mobile app download page UX and add web access ([f02adc9](https://github.com/typelets/typelets-app/commit/f02adc96830525123aefc1c32bb482f009e49e85))

# [1.26.0](https://github.com/typelets/typelets-app/compare/v1.25.1...v1.26.0) (2025-10-15)


### Features

* improve mobile app download page UX and web access ([5939b80](https://github.com/typelets/typelets-app/commit/5939b805a9cf9ec0d945eb702e15f6720c44ddff))

## [1.25.1](https://github.com/typelets/typelets-app/compare/v1.25.0...v1.25.1) (2025-10-15)


### Bug Fixes

* improve type safety, theme consistency, and Android UI issues ([f944356](https://github.com/typelets/typelets-app/commit/f944356bceb5d1ea306b9ed4c7d46d1b263c5fe4))

# [1.25.0](https://github.com/typelets/typelets-app/compare/v1.24.7...v1.25.0) (2025-10-14)


### Features

* **mobile:** add attachment support for new notes and UI improvements ([d7ed215](https://github.com/typelets/typelets-app/commit/d7ed215a4a8f23d30ce195afe3daa9bdc75f6976))

## [1.24.7](https://github.com/typelets/typelets-app/compare/v1.24.6...v1.24.7) (2025-10-14)


### Bug Fixes

* **mobile:** enable editor interaction for new notes ([74b256e](https://github.com/typelets/typelets-app/commit/74b256e3ab65c645b450efb9cd888de8dca1d3b1))

## [1.24.6](https://github.com/typelets/typelets-app/compare/v1.24.5...v1.24.6) (2025-10-14)


### Bug Fixes

* **mobile:** improve authentication UX and iPad layout ([fe16d12](https://github.com/typelets/typelets-app/commit/fe16d123d8f4e1d5ec7694665ee5e663077ada8b))

## [1.24.5](https://github.com/typelets/typelets-app/compare/v1.24.4...v1.24.5) (2025-10-13)


### Bug Fixes

* **mobile:** remove border above editor toolbar on keyboard open ([c6234d1](https://github.com/typelets/typelets-app/commit/c6234d10be45ffc3e7d40e7fd6136a5716f41955))

## [1.24.4](https://github.com/typelets/typelets-app/compare/v1.24.3...v1.24.4) (2025-10-13)


### Bug Fixes

* **mobile:** improve note editor UX and theme consistency ([458fd0c](https://github.com/typelets/typelets-app/commit/458fd0c6ad7a04f78aacb0266fd8520d30f63292))

## [1.24.3](https://github.com/typelets/typelets-app/compare/v1.24.2...v1.24.3) (2025-10-13)


### Bug Fixes

* **mobile:** improve UI/UX and fix iOS-specific issues ([d5d2791](https://github.com/typelets/typelets-app/commit/d5d27918a7dc72bd12f6b2bfe04ed0a8cf26ae0d))

## [1.24.2](https://github.com/typelets/typelets-app/compare/v1.24.1...v1.24.2) (2025-10-13)


### Bug Fixes

* **mobile:** improve UI alignment and error handling ([cf00862](https://github.com/typelets/typelets-app/commit/cf00862145d4578ba33231fafb028dee7eda1a9d))

## [1.24.1](https://github.com/typelets/typelets-app/compare/v1.24.0...v1.24.1) (2025-10-13)


### Bug Fixes

* **mobile:** improve keyboard handling and add custom icon ([219576b](https://github.com/typelets/typelets-app/commit/219576b8e71d315b3db85d435f64358572b8c9ec))

# [1.24.0](https://github.com/typelets/typelets-app/compare/v1.23.0...v1.24.0) (2025-10-13)


### Features

* **mobile:** add iOS support and fix editor loading issues ([8022b3a](https://github.com/typelets/typelets-app/commit/8022b3a7eda9fe36fd7352b24da9385add5a9f0b))

# [1.23.0](https://github.com/typelets/typelets-app/compare/v1.22.9...v1.23.0) (2025-10-12)


### Features

* **mobile:** add attachment badges to note cards with backend integration ([b74f81c](https://github.com/typelets/typelets-app/commit/b74f81cd50c5a39de64593b97f45b49f648acb52))

## [1.22.9](https://github.com/typelets/typelets-app/compare/v1.22.8...v1.22.9) (2025-10-11)


### Bug Fixes

* **mobile:** improve TypeScript type safety across authentication and navigation ([595fd91](https://github.com/typelets/typelets-app/commit/595fd91109dddb0c17623d558b19abe5b98a15ce))
* **mobile:** resolve all high priority type safety issues ([076000d](https://github.com/typelets/typelets-app/commit/076000d3ff740e9c573163197d575c48241bc73e))

## [1.22.8](https://github.com/typelets/typelets-app/compare/v1.22.7...v1.22.8) (2025-10-11)


### Bug Fixes

* **mobile:** prevent cursor from hiding behind keyboard and toolbar on Android ([a11e835](https://github.com/typelets/typelets-app/commit/a11e835a89a6c1c6ba52f84b2f8babd35d197b21))

## [1.22.7](https://github.com/typelets/typelets-app/compare/v1.22.6...v1.22.7) (2025-10-10)


### Bug Fixes

* **mobile:** prevent master password screen freeze during user transitions ([2f149c3](https://github.com/typelets/typelets-app/commit/2f149c3f0931ba597b0f65ce35650d97b60a5e9c))

## [1.22.6](https://github.com/typelets/typelets-app/compare/v1.22.5...v1.22.6) (2025-10-10)


### Bug Fixes

* **mobile:** integrate NewRelic monitoring with comprehensive logging ([f5ac870](https://github.com/typelets/typelets-app/commit/f5ac870880c95552b47bbc6d9a041b986d686fb2))

## [1.22.5](https://github.com/typelets/typelets-app/compare/v1.22.4...v1.22.5) (2025-10-10)


### Bug Fixes

* **mobile:** resolve master password stuck button and improve editor toolbar ([08e64ea](https://github.com/typelets/typelets-app/commit/08e64ea90f4893a33b5157fbb9fcda2a77819a76))

## [1.22.4](https://github.com/typelets/typelets-app/compare/v1.22.3...v1.22.4) (2025-10-09)


### Bug Fixes

* **mobile:** improve code block readability and New Relic integration ([83c6e52](https://github.com/typelets/typelets-app/commit/83c6e5247f3cddd2879f4bb048e0cf81a8db3c09))

## [1.22.3](https://github.com/typelets/typelets-app/compare/v1.22.2...v1.22.3) (2025-10-09)


### Bug Fixes

* **mobile:** reset loading state on master password screen mount ([cedac17](https://github.com/typelets/typelets-app/commit/cedac17fa1dc52212ebff385b3ef88a50c9c25ba))
* **mobile:** reset loading state on master password screen mount ([09b7493](https://github.com/typelets/typelets-app/commit/09b7493952ceb68fc4218557352b0b7b54d4145a))

## [1.22.2](https://github.com/typelets/typelets-app/compare/v1.22.1...v1.22.2) (2025-10-09)


### Bug Fixes

* implement unified versioning for main and mobile apps ([9cee425](https://github.com/typelets/typelets-app/commit/9cee4257d6b643648b51006a7ec5521647e8d957))

## [1.22.1](https://github.com/typelets/typelets-app/compare/v1.22.0...v1.22.1) (2025-10-09)


### Bug Fixes

* **mobile:** resolve master password setup hang and add New Relic monitoring ([343ef33](https://github.com/typelets/typelets-app/commit/343ef33ad62964b5b5d496c3bd6b079eb022fb9c))

# [1.22.0](https://github.com/typelets/typelets-app/compare/v1.21.1...v1.22.0) (2025-10-09)


### Bug Fixes

* **mobile:** correct version bump calculation to check commits since last bump ([233f6b4](https://github.com/typelets/typelets-app/commit/233f6b43537884488de0dc33931ab072016ec74b))
* **mobile:** improve code consistency in view mode loader ([f8bb08e](https://github.com/typelets/typelets-app/commit/f8bb08e3115777d3093d46328d5e9f1fce8f89f3))
* **mobile:** improve view mode preference error handling ([da67f39](https://github.com/typelets/typelets-app/commit/da67f399bae706f8280de3d131e7b96978540e33))
* **mobile:** replace all arrayBufferToBase64 usage with node-forge ([29cf11e](https://github.com/typelets/typelets-app/commit/29cf11ecc9caa20f5f522d8cf8f5f7672baec7eb))
* **mobile:** resolve infinite loop in folder-notes screen ([80c79f6](https://github.com/typelets/typelets-app/commit/80c79f620bf85131fac33096324c027c170f1b2f))
* **mobile:** resolve master password mode and pagination issues ([22ab604](https://github.com/typelets/typelets-app/commit/22ab604b59ad6c633ce2d211fc86614331698511))
* **mobile:** resolve node-forge type compatibility in key derivation ([588df9c](https://github.com/typelets/typelets-app/commit/588df9cc3509c22753575eb15c7c0a2eeea020d6))
* **mobile:** resolve TypeScript errors and remove unused code ([7b47f37](https://github.com/typelets/typelets-app/commit/7b47f37b7ea166ab22e984db1a22cf0c45dffd1a))
* **mobile:** update privacy policy URL to app subdomain ([c875258](https://github.com/typelets/typelets-app/commit/c87525800c064b9997f375751d668fd07d475398))


### Features

* **mobile:** add dynamic version display in settings ([5f27ed8](https://github.com/typelets/typelets-app/commit/5f27ed8237f9bb28590a8df803eabae4e7c6b052))
* **mobile:** add dynamic version display in settings ([df9b70c](https://github.com/typelets/typelets-app/commit/df9b70cb6b374f109a9d49702ee11b54edf17501))
* **mobile:** enhance authentication flow and fix note viewing ([83ce1f8](https://github.com/typelets/typelets-app/commit/83ce1f806fcceb3a5e68ef7dbec4bfd8e4299475))

## [1.21.1](https://github.com/typelets/typelets-app/compare/v1.21.0...v1.21.1) (2025-10-07)


### Bug Fixes

* **ci:** improve mobile-only commit detection in release workflow ([2711b1b](https://github.com/typelets/typelets-app/commit/2711b1b00bbeb391a8aade3c863091b56347b9c5))

# [1.21.0](https://github.com/typelets/typelets-app/compare/v1.20.0...v1.21.0) (2025-10-07)


### Features

* **mobile:** improve app store description ([df5a4fc](https://github.com/typelets/typelets-app/commit/df5a4fc256c4c1cc8950743024a502005ae172ef))

# [1.20.0](https://github.com/typelets/typelets-app/compare/v1.19.1...v1.20.0) (2025-10-07)


### Bug Fixes

* **mobile:** sync mobile app version and enable automatic version bumping ([5a4703e](https://github.com/typelets/typelets-app/commit/5a4703ecb68320726c8f968bc3daa982058d8b02))
* **mobile:** sync mobile app version and enable automatic version bumping ([1db1c04](https://github.com/typelets/typelets-app/commit/1db1c0406cee189ddaa397705803c4ad7710ba4d))


### Features

* **mobile:** configure independent mobile and web versioning ([2d6fcbc](https://github.com/typelets/typelets-app/commit/2d6fcbcb2bd6539919eed6c326ce980a405218fd))

## [1.19.1](https://github.com/typelets/typelets-app/compare/v1.19.0...v1.19.1) (2025-10-07)


### Bug Fixes

* **mobile:** sync mobile app version and enable automatic version bumping ([278dfc4](https://github.com/typelets/typelets-app/commit/278dfc42d83a9629e85688389220958508268e7a))

# [1.19.0](https://github.com/typelets/typelets-app/compare/v1.18.9...v1.19.0) (2025-10-07)


### Bug Fixes

* **mobile:** resolve security vulnerabilities and remove sensitive logging ([2cdd4df](https://github.com/typelets/typelets-app/commit/2cdd4df95bb99fea75b639a2e9b987719bc0969e))
* **mobile:** resolve security vulnerabilities and remove sensitive logging ([46e6ea9](https://github.com/typelets/typelets-app/commit/46e6ea91b4ed047108078518b7b41211cf9cd620))


### Features

* add mobile app v1 ([abc3d54](https://github.com/typelets/typelets-app/commit/abc3d548b7cb5ce9b7da4cfff32b92e7c04f7a3e))
* **mobile:** initial React Native mobile app with encryption ([eca837a](https://github.com/typelets/typelets-app/commit/eca837a3a4a9117bf21ecd04d52bf10dd7019fda))

## [1.18.9](https://github.com/typelets/typelets-app/compare/v1.18.8...v1.18.9) (2025-10-07)


### Bug Fixes

* handle API responses without pagination metadata ([993d4cf](https://github.com/typelets/typelets-app/commit/993d4cfbdffba45f07b7af65f624d51a8863ed29))

## [1.18.8](https://github.com/typelets/typelets-app/compare/v1.18.7...v1.18.8) (2025-10-07)


### Bug Fixes

* improve pagination to fetch all notes and folders ([eb2e701](https://github.com/typelets/typelets-app/commit/eb2e701d090c998f1eb49a4e818c9130c28e583f))

## [1.18.7](https://github.com/typelets/typelets-app/compare/v1.18.6...v1.18.7) (2025-09-25)


### Bug Fixes

* enforce encrypted data validation to prevent plaintext exposure ([1436fa8](https://github.com/typelets/typelets-app/commit/1436fa8826e9f226706cae025525820d926bca86))

## [1.18.6](https://github.com/typelets/typelets-app/compare/v1.18.5...v1.18.6) (2025-09-25)


### Bug Fixes

* enforce encrypted data validation to prevent plaintext exposure ([7b1f799](https://github.com/typelets/typelets-app/commit/7b1f7991f171b5fd27607549192fc88b464a3712))

## [1.18.5](https://github.com/typelets/typelets-app/compare/v1.18.4...v1.18.5) (2025-09-24)


### Bug Fixes

* resolve WebSocket authentication failures and timing issues ([d0b8dbf](https://github.com/typelets/typelets-app/commit/d0b8dbf3a737bb6673878df98a2b40838a53ef36))

## [1.18.4](https://github.com/typelets/typelets-app/compare/v1.18.3...v1.18.4) (2025-09-24)


### Bug Fixes

* resolve WebSocket authentication timeout and type errors ([9283e11](https://github.com/typelets/typelets-app/commit/9283e118f613b8c5a6751ef0a0d6ced23e3fc04b))

## [1.18.3](https://github.com/typelets/typelets-app/compare/v1.18.2...v1.18.3) (2025-09-23)


### Bug Fixes

* improve title input UX and toolbar performance ([2175e45](https://github.com/typelets/typelets-app/commit/2175e45c5e17e8e4c0825fbe138acf7cb7236059))

## [1.18.2](https://github.com/typelets/typelets-app/compare/v1.18.1...v1.18.2) (2025-09-22)


### Bug Fixes

* resolve TipTap v3 compatibility issues and clean up Monaco editor sync ([dcbde51](https://github.com/typelets/typelets-app/commit/dcbde5101183a365f8e431ce53f4e8dfe459f061))

## [1.18.1](https://github.com/typelets/typelets-app/compare/v1.18.0...v1.18.1) (2025-09-22)


### Bug Fixes

* resolve TipTap v3 compatibility and CSS import order issues ([898e245](https://github.com/typelets/typelets-app/commit/898e245d987b691585d1ab38629a3387726d9697))
* resolve TypeScript 5.9 crypto API compatibility issues ([e424192](https://github.com/typelets/typelets-app/commit/e424192580c2bfb51b7307bcf0a7ff5410e49159))

# [1.18.0](https://github.com/typelets/typelets-app/compare/v1.17.4...v1.18.0) (2025-09-20)


### Features

* add executable code blocks with 15+ languages, Monaco editor, and secure backend proxy ([c84c858](https://github.com/typelets/typelets-app/commit/c84c858520bed8c24f6fd51168e92efece1a2be3))
* add executable code blocks with 15+ programming languages ([4d2febc](https://github.com/typelets/typelets-app/commit/4d2febcfe531e1af52380348e43adbfe95402087))

## [1.17.4](https://github.com/typelets/typelets-app/compare/v1.17.3...v1.17.4) (2025-09-19)


### Bug Fixes

* implement secure error handling system and improve README badges ([8930dc9](https://github.com/typelets/typelets-app/commit/8930dc9c092f948108d53d75aac0ba610ff087a5))

## [1.17.3](https://github.com/typelets/typelets-app/compare/v1.17.2...v1.17.3) (2025-09-19)


### Bug Fixes

* improve status bar display and scrollbar styling ([4cdeb8e](https://github.com/typelets/typelets-app/commit/4cdeb8e6b4a74a6092221e2a810f166395e2ac38))

## [1.17.2](https://github.com/typelets/typelets-app/compare/v1.17.1...v1.17.2) (2025-09-19)


### Bug Fixes

* restore status bar word count and remove note ID display ([9d53e60](https://github.com/typelets/typelets-app/commit/9d53e6088ff6f37420938bb37d9b6e2a1de4f2c0))
* restore status bar word count and remove note ID display ([881d69a](https://github.com/typelets/typelets-app/commit/881d69ac2e59eba702bff993b33c340e0155209d))

## [1.17.1](https://github.com/typelets/typelets-app/compare/v1.17.0...v1.17.1) (2025-09-19)


### Bug Fixes

* switch to workflow_run trigger for automatic desktop builds ([c6c284f](https://github.com/typelets/typelets-app/commit/c6c284fe4de3c940e6001837eae068836ee0bb90))

# [1.17.0](https://github.com/typelets/typelets-app/compare/v1.16.15...v1.17.0) (2025-09-19)


### Features

* implement repository_dispatch for automated desktop builds ([ec5b5ad](https://github.com/typelets/typelets-app/commit/ec5b5ad2ae2d938b5f4a62315b09530a141f7754))

## [1.16.15](https://github.com/typelets/typelets-app/compare/v1.16.14...v1.16.15) (2025-09-19)


### Bug Fixes

* remove problematic empty environment variables for Windows build ([27fbe0a](https://github.com/typelets/typelets-app/commit/27fbe0a5817eb00cd592399ac3555fc408472bdb))


### Reverts

* use Windows runners for Windows builds ([7d82289](https://github.com/typelets/typelets-app/commit/7d822893af35085b4812b620a22a531bb61267c5))

## [1.16.14](https://github.com/typelets/typelets-app/compare/v1.16.13...v1.16.14) (2025-09-19)


### Bug Fixes

* install Wine for Windows builds on Ubuntu ([f98529f](https://github.com/typelets/typelets-app/commit/f98529fff62f2a52f19fe772bcb3a01da614c7ac))

## [1.16.13](https://github.com/typelets/typelets-app/compare/v1.16.12...v1.16.13) (2025-09-19)


### Bug Fixes

* enable asset attachment for manual workflow triggers ([60262d6](https://github.com/typelets/typelets-app/commit/60262d6c2a563b68960824eeb5bda6dab624a9b6))

## [1.16.12](https://github.com/typelets/typelets-app/compare/v1.16.11...v1.16.12) (2025-09-19)


### Bug Fixes

* run Windows desktop build on Ubuntu to avoid permission issues ([1820e56](https://github.com/typelets/typelets-app/commit/1820e565c5e646bf2568334e702f82b7be185718))

## [1.16.11](https://github.com/typelets/typelets-app/compare/v1.16.10...v1.16.11) (2025-09-19)


### Bug Fixes

* improve desktop workflow debugging and artifact upload ([af95e42](https://github.com/typelets/typelets-app/commit/af95e42fe410d40e2478eb2488d5c0563b967e19))

## [1.16.10](https://github.com/typelets/typelets-app/compare/v1.16.9...v1.16.10) (2025-09-19)


### Bug Fixes

* test desktop workflow trigger for v1.16.10 ([633dce3](https://github.com/typelets/typelets-app/commit/633dce37409ee96237c8efbf20d935deb2ca214d))

## [1.16.9](https://github.com/typelets/typelets-app/compare/v1.16.8...v1.16.9) (2025-09-19)


### Bug Fixes

* remove conflicting desktop build job from release workflow ([b95f426](https://github.com/typelets/typelets-app/commit/b95f42662fbd9fd41de179b2425f933530d61128))

## [1.16.8](https://github.com/typelets/typelets-app/compare/v1.16.7...v1.16.8) (2025-09-19)


### Bug Fixes

* desktop build workflow artifact paths for release attachment ([36671c6](https://github.com/typelets/typelets-app/commit/36671c6449f703bc1c66b4f5e5c9ac319aa62cbc))
* sync desktop app version to 1.16.6 ([c87e730](https://github.com/typelets/typelets-app/commit/c87e730a8c0d807d6fb51cef2c747663f9b48b3b))

## [1.16.8](https://github.com/typelets/typelets-app/compare/v1.16.7...v1.16.8) (2025-09-19)


### Bug Fixes

* desktop build workflow artifact paths for release attachment ([36671c6](https://github.com/typelets/typelets-app/commit/36671c6449f703bc1c66b4f5e5c9ac319aa62cbc))
* sync desktop app version to 1.16.6 ([c87e730](https://github.com/typelets/typelets-app/commit/c87e730a8c0d807d6fb51cef2c747663f9b48b3b))

## [1.16.8](https://github.com/typelets/typelets-app/compare/v1.16.7...v1.16.8) (2025-09-19)


### Bug Fixes

* sync desktop app version to 1.16.6 ([7450817](https://github.com/typelets/typelets-app/commit/7450817b8e13821f28ac1c207279b3f8516252df))

## [1.16.7](https://github.com/typelets/typelets-app/compare/v1.16.6...v1.16.7) (2025-09-19)


### Bug Fixes

* include desktop package.json in semantic-release assets and add build debugging ([ab67482](https://github.com/typelets/typelets-app/commit/ab674820929dbe8fea78b17dd52d578bf5e82192))

## [1.16.6](https://github.com/typelets/typelets-app/compare/v1.16.5...v1.16.6) (2025-09-19)


### Bug Fixes

* sync desktop app version and use current version for release uploads ([e900ec9](https://github.com/typelets/typelets-app/commit/e900ec9b1e066430fa9ae0d51fe118a06f878ab4))

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
