export const AuthViews = {
    LOGIN: "login",
    REGISTER: "register",
} as const;

export type AuthView = typeof AuthViews[keyof typeof AuthViews];
