"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La home no tiene contenido propio -- el panel real empieza en /activos.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/activos");
  }, [router]);

  return null;
}
