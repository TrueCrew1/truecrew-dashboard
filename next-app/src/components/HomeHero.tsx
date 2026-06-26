import { getPublicEnv } from "@/lib/env";

export function HomeHero() {
  const { appUrl } = getPublicEnv();

  return (
    <section>
      <h1>Next.js 14 App</h1>
      <p>TypeScript · App Router · ESLint</p>
      <p>
        Running at <code>{appUrl}</code>
      </p>
    </section>
  );
}
