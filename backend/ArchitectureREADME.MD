backend/
├── .env
├── .env.example
├── .gitignore
├── package.json
│
├── test/
│   ├── auth.test.js
│   ├── auth.integration.test.js
│   ├── user.integration.test.js
│   ├── vault.integration.test.js
│   └── encryption.test.js
│
└── src/
    ├── app.js
    ├── server.js
    │
    ├── config/
    │   ├── env.js
    │   ├── db.js
    │   ├── cookies.js
    │   ├── cors.js
    │   └── rate-limit.js
    │
    ├── middlewares/
    │   ├── error.middleware.js
    │   ├── not-found.middleware.js
    │   └── request-id.middleware.js
    │
    ├── utils/
    │   ├── appError.js
    │   ├── catchAsync.js
    │   └── response.js
    │
    ├── infrastructure/
    │   ├── kms/
    │   │   ├── kms.provider.js
    │   │   ├── local-kms.provider.js
    │   │   ├── cloud-kms.provider.js
    │   │   └── kms.factory.js
    │   │
    │   ├── email/
    │   │   ├── email.provider.js
    │   │   ├── development-email.provider.js
    │   │   └── cloud-email.provider.js
    │   │
    │   └── storage/
    │       ├── local-storage.provider.js
    │       └── cloud-storage.provider.js
    │
    ├── services/
    │   ├── encryption.service.js
    │   └── email.service.js
    │
    └── features/
        ├── auth/
        │   ├── auth.model.js
        │   ├── auth.session.model.js
        │   ├── auth.controller.js
        │   ├── auth.services.js
        │   ├── auth.route.js
        │   ├── auth.middleware.js
        │   ├── csrf.middleware.js
        │   ├── role.middleware.js
        │   ├── permissions.middleware.js
        │   └── authorization.middleware.js
        │
        ├── users/
        │   ├── user.controller.js
        │   ├── user.services.js
        │   ├── user.route.js
        │   └── user.validation.js
        │
        ├── vaults/
        │   ├── vault.model.js
        │   ├── vault-member.model.js
        │   ├── vault.controller.js
        │   ├── vault.services.js
        │   ├── vault.route.js
        │   ├── vault.middleware.js
        │   └── vault.validation.js
        │
        ├── secrets/
        │   ├── secret.model.js
        │   ├── secret.controller.js
        │   ├── secret.services.js
        │   ├── secret.route.js
        │   └── secret.validation.js
        │
        ├── password-generator/
        │   ├── generator.controller.js
        │   ├── generator.services.js
        │   └── generator.route.js
        │
        ├── security/
        │   ├── security.controller.js
        │   ├── security.services.js
        │   └── security.route.js
        │
        ├── two-factor/
        │   ├── totp.model.js
        │   ├── totp.controller.js
        │   ├── totp.services.js
        │   └── totp.route.js
        │
        ├── sharing/
        │   ├── share.model.js
        │   ├── share.controller.js
        │   ├── share.services.js
        │   └── share.route.js
        │
        ├── audit/
        │   ├── audit-log.model.js
        │   ├── audit.controller.js
        │   ├── audit.services.js
        │   └── audit.route.js
        │
        ├── files/
        │   ├── file.model.js
        │   ├── file.controller.js
        │   ├── file.services.js
        │   └── file.route.js
        │
        └── admin/
            ├── admin.controller.js
            ├── admin.services.js
            ├── admin.route.js
            └── admin.middleware.js