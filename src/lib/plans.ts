export type PlanId = 'free' | 'standard' | 'custom';

type PlanDetails = {
    name: string;
    limits: {
        modules: number;
        tenants: number;
        users: number;
    };
};

export const planLimits: Record<PlanId, PlanDetails> = {
    free: {
        name: 'Free',
        limits: {
            modules: 1,
            tenants: 1,
            users: 5,
        },
    },
    standard: {
        name: 'Standard',
        limits: {
            modules: 3,
            tenants: 5,
            users: 50,
        },
    },
    custom: {
        name: 'Custom',
        limits: {
            modules: Infinity,
            tenants: Infinity,
            users: Infinity,
        },
    },
};
