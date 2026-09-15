import AppError from '../../../utils/appError.js';

const ensureObject = (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new AppError('Secret payload must be an object', 400);
    }
};

const rejectUnknownFields = (input, allowedFields) => {
    const unknownFields = Object.keys(input).filter(
        (field) => !allowedFields.includes(field)
    );

    if (unknownFields.length > 0) {
        throw new AppError(`Unsupported fields: ${unknownFields.join(', ')}`, 400);
    }
};

const validateText = (
    value,
    field,
    maxLength,
    required = false,
    trim = true
) => {
    if (value === undefined && !required) return undefined;

    if (typeof value !== 'string') {
        throw new AppError(`${field} must be text`, 400);
    }

    const cleanValue = trim ? value.trim() : value;

    if (required && cleanValue.length === 0) {
        throw new AppError(`${field} is required`, 400);
    }

    if (cleanValue.length > maxLength) {
        throw new AppError(
            `${field} cannot exceed ${maxLength} characters`,
            400
        );
    }

    return cleanValue;
};

const validateTags = (tags = []) => {
    if (!Array.isArray(tags)) {
        throw new AppError('Tags must be an array', 400);
    }

    if (tags.length > 20) {
        throw new AppError(
            'A secret cannot have more than 20 tags',
            400
        );
    }

    return tags.map((tag) => {
        if (typeof tag !== 'string') {
            throw new AppError('Every tag must be text', 400);
        }

        const cleanTag = tag.trim();

        if (cleanTag.length === 0 || cleanTag.length > 40) {
            throw new AppError(
                'Each tag must contain between 1 and 40 characters',
                400
            );
        }

        return cleanTag;
    });
};

export const validateLoginInput = (input) => {
    ensureObject(input);

    rejectUnknownFields(input, [
        'title', 'website', 'username', 'password',
        'url', 'notes', 'tags'
    ]);

    return {
        title: validateText(input.title, 'Title', 120, true),
        website: validateText(input.website, 'Website', 200, true),
        username: validateText(input.username, 'Username', 300, true),
        password: validateText(input.password, 'Password', 2000, true, false),
        url: validateText(input.url, 'URL', 2048),
        notes: validateText(input.notes, 'Notes', 5000),
        tags: validateTags(input.tags)
    };
};

export const validateSecureNoteInput = (input) => {
    ensureObject(input);

    rejectUnknownFields(input, [
        'title', 'content', 'tags'
    ]);

    return {
        title: validateText(input.title, 'Title', 120, true),
        content: validateText(input.content, 'Content', 50000, true),
        tags: validateTags(input.tags)
    };
};

const secretValidators = {
    api_key: (input) => {
        ensureObject(input);
        rejectUnknownFields(input, [
            'title', 'service', 'apiKey', 'secret',
            'environment', 'expiration', 'notes', 'tags'
        ]);

        return {
            title: validateText(input.title, 'Title', 120, true),
            service: validateText(input.service, 'Service', 200, true),
            apiKey: validateText(input.apiKey, 'API key', 5000, true, false),
            secret: validateText(input.secret, 'Secret', 5000, false, false),
            environment: validateText(input.environment, 'Environment', 100),
            expiration: validateText(input.expiration, 'Expiration', 100),
            notes: validateText(input.notes, 'Notes', 5000),
            tags: validateTags(input.tags)
        };
    },

    ssh_key: (input) => {
        ensureObject(input);
        rejectUnknownFields(input, [
            'title', 'username', 'host', 'port',
            'privateKey', 'publicKey', 'passphrase', 'tags'
        ]);

        return {
            title: validateText(input.title, 'Title', 120, true),
            username: validateText(input.username, 'Username', 300, true),
            host: validateText(input.host, 'Host', 255, true),
            port: validateText(input.port, 'Port', 10),
            privateKey: validateText(input.privateKey, 'Private key', 20000, true, false),
            publicKey: validateText(input.publicKey, 'Public key', 10000, false, false),
            passphrase: validateText(input.passphrase, 'Passphrase', 2000, false, false),
            tags: validateTags(input.tags)
        };
    },

    wifi_credential: (input) => {
        ensureObject(input);
        rejectUnknownFields(input, [
            'title', 'ssid', 'password', 'securityType', 'notes', 'tags'
        ]);

        return {
            title: validateText(input.title, 'Title', 120, true),
            ssid: validateText(input.ssid, 'SSID', 255, true),
            password: validateText(input.password, 'Password', 2000, true, false),
            securityType: validateText(input.securityType, 'Security type', 100, true),
            notes: validateText(input.notes, 'Notes', 5000),
            tags: validateTags(input.tags)
        };
    },

    software_license: (input) => {
        ensureObject(input);
        rejectUnknownFields(input, [
            'title', 'software', 'licenseKey', 'email',
            'expiration', 'notes', 'tags'
        ]);

        return {
            title: validateText(input.title, 'Title', 120, true),
            software: validateText(input.software, 'Software', 200, true),
            licenseKey: validateText(input.licenseKey, 'License key', 5000, true, false),
            email: validateText(input.email, 'Email', 320),
            expiration: validateText(input.expiration, 'Expiration', 100),
            notes: validateText(input.notes, 'Notes', 5000),
            tags: validateTags(input.tags)
        };
    },

    recovery_codes: (input) => {
        ensureObject(input);
        rejectUnknownFields(input, ['title', 'service', 'codes', 'notes', 'tags']);

        if (!Array.isArray(input.codes) || input.codes.length === 0) {
            throw new AppError('Codes must be a non-empty array', 400);
        }

        if (input.codes.length > 100) {
            throw new AppError('Recovery codes cannot exceed 100 entries', 400);
        }

        const codes = input.codes.map((code) => {
            if (typeof code !== 'string' || code.length === 0 || code.length > 500) {
                throw new AppError('Every recovery code must be text up to 500 characters', 400);
            }
            return code;
        });

        return {
            title: validateText(input.title, 'Title', 120, true),
            service: validateText(input.service, 'Service', 200, true),
            codes,
            notes: validateText(input.notes, 'Notes', 5000),
            tags: validateTags(input.tags)
        };
    }
};

export const validateSecretInput = (type, input) => {
    if (type === 'login') return validateLoginInput(input);
    if (type === 'secure_note') return validateSecureNoteInput(input);

    const validator = secretValidators[type];
    if (!validator) throw new AppError('Invalid secret type', 400);
    return validator(input);
};

const validateOptionalText = (
    input,
    field,
    maxLength,
    trim = true
) => {
    if (!Object.hasOwn(input, field)) return undefined;

    return validateText(
        input[field],
        field,
        maxLength,
        false,
        trim
    );
};

const ensurePatchHasFields = (input) => {
    ensureObject(input);

    if (Object.keys(input).length === 0) {
        throw new AppError(
            'At least one field is required',
            400
        );
    }
};

export const validateLoginUpdateInput = (input) => {
    ensurePatchHasFields(input);

    rejectUnknownFields(input, [
        'title', 'website', 'username', 'password',
        'url', 'notes', 'tags'
    ]);

    return {
        title: validateOptionalText(input, 'title', 120),
        website: validateOptionalText(input, 'website', 200),
        username: validateOptionalText(input, 'username', 300),
        password: validateOptionalText(input, 'password', 2000, false),
        url: validateOptionalText(input, 'url', 2048),
        notes: validateOptionalText(input, 'notes', 5000),
        tags: Object.hasOwn(input, 'tags')
            ? validateTags(input.tags)
            : undefined
    };
};

export const validateSecureNoteUpdateInput = (input) => {
    ensurePatchHasFields(input);

    rejectUnknownFields(input, [
        'title', 'content', 'tags'
    ]);

    return {
        title: validateOptionalText(input, 'title', 120),
        content: validateOptionalText(input, 'content', 50000),
        tags: Object.hasOwn(input, 'tags')
            ? validateTags(input.tags)
            : undefined
    };
};

export const validateSecretUpdateInput = (type, input) => {
    ensurePatchHasFields(input);

    // Update validation uses the same field rules while allowing every field
    // to be omitted. Required fields remain required on create only.
    const allowed = {
        login: ['title', 'website', 'username', 'password', 'url', 'notes', 'tags'],
        secure_note: ['title', 'content', 'tags'],
        api_key: ['title', 'service', 'apiKey', 'secret', 'environment', 'expiration', 'notes', 'tags'],
        ssh_key: ['title', 'username', 'host', 'port', 'privateKey', 'publicKey', 'passphrase', 'tags'],
        wifi_credential: ['title', 'ssid', 'password', 'securityType', 'notes', 'tags'],
        software_license: ['title', 'software', 'licenseKey', 'email', 'expiration', 'notes', 'tags'],
        recovery_codes: ['title', 'service', 'codes', 'notes', 'tags']
    }[type];

    if (!allowed) throw new AppError('Invalid secret type', 400);
    rejectUnknownFields(input, allowed);

    if (Object.hasOwn(input, 'tags')) {
        input.tags = validateTags(input.tags);
    }

    if (Object.hasOwn(input, 'codes')) {
        if (!Array.isArray(input.codes) || input.codes.length === 0 || input.codes.length > 100) {
            throw new AppError('Codes must contain between 1 and 100 entries', 400);
        }
        input.codes = input.codes.map((code) => {
            if (typeof code !== 'string' || code.length === 0 || code.length > 500) {
                throw new AppError('Every recovery code must be text up to 500 characters', 400);
            }
            return code;
        });
    }

    const limits = {
        title: 120, website: 200, username: 300, password: 2000,
        url: 2048, notes: 5000, content: 50000, service: 200,
        apiKey: 5000, secret: 5000, environment: 100, expiration: 100,
        host: 255, port: 10, privateKey: 20000, publicKey: 10000,
        passphrase: 2000, ssid: 255, securityType: 100,
        software: 200, licenseKey: 5000, email: 320
    };

    for (const [field, maxLength] of Object.entries(limits)) {
        if (Object.hasOwn(input, field)) {
            input[field] = validateText(
                input[field], field, maxLength, false,
                ['password', 'apiKey', 'secret', 'privateKey', 'publicKey', 'passphrase', 'licenseKey'].includes(field)
                    ? false
                    : true
            );
        }
    }

    return input;
};
