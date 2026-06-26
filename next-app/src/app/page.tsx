import { HomeHero } from "@/components/HomeHero";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <HomeHero />
        <p className={styles.hint}>
          Edit <code>src/app/page.tsx</code> to get started.
        </p>
      </main>
    </div>
  );
}
