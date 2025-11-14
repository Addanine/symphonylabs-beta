import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    BTCPAY_API_KEY: z.string().min(1),
    BTCPAY_STORE_ID: z.string().min(1),
    BTCPAY_HOST: z.string().min(1),
    BTCPAY_ALLOW_INSECURE: z.string().optional(),
    ADMIN_USERNAME: z.string().min(1),
    ADMIN_PASSWORD: z.string().min(1),
    MAILGUN_API_KEY: z.string().min(1),
    MAILGUN_DOMAIN: z.string().min(1),
    JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
    MONERO_WALLET_RPC_URL: z.string().url().optional(),
    MONERO_WALLET_ADDRESS: z.string().min(1).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BTCPAY_API_KEY: process.env.BTCPAY_API_KEY,
    BTCPAY_STORE_ID: process.env.BTCPAY_STORE_ID,
    BTCPAY_HOST: process.env.BTCPAY_HOST,
    BTCPAY_ALLOW_INSECURE: process.env.BTCPAY_ALLOW_INSECURE,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    JWT_SECRET: process.env.JWT_SECRET,
    MONERO_WALLET_RPC_URL: process.env.MONERO_WALLET_RPC_URL,
    MONERO_WALLET_ADDRESS: process.env.MONERO_WALLET_ADDRESS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
