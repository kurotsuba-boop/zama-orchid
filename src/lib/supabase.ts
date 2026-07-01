import { createBrowserClient } from '@supabase/ssr'

// noStore: true のとき、この client の全 fetch を cache: 'no-store' にする。
// （従業員リストなどで古いキャッシュ応答を掴まないための保険。既定は従来通り。）
type CreateClientOptions = { noStore?: boolean }

export function createClient(options?: CreateClientOptions) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?.noStore
      ? {
          global: {
            fetch: (input: RequestInfo | URL, init?: RequestInit) =>
              fetch(input, { ...init, cache: 'no-store' }),
          },
        }
      : undefined
  )
}
