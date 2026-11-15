# Arabic-only interface, 15 November 2026

The application and standalone design preview use Arabic and RTL exclusively. Language-switch buttons and language selection state have been removed. Both roots explicitly set the document language to `ar` and direction to `rtl`, and the embedded homepage has no language override. Student views, leader management, creation forms, exported table headings and scanner controls receive the Arabic setting. Screen-reader navigation, close, logout, recovery and QR labels are Arabic too.

Phone numbers, codes, email addresses and URL fields keep LTR field direction for readability. Dark/light mode, existing content, authentication, contact restrictions, dress codes, attendance and backend behavior are unchanged.

Verification: build and TypeScript passed; student/leader regression, leader workflows and HISS motion browser suites passed at mobile and desktop widths with Arabic-only/RTL assertions, language-switch absence, dark mode and no browser errors. Browser fixtures isolate all test mutations.
