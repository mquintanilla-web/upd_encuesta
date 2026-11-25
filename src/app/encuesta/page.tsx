"use client";

import dynamic from "next/dynamic";

// El borrador vive en localStorage, así que el formulario se dibuja solo en el cliente.
const Formulario = dynamic(() => import("./formulario"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#f6f9fb]" />,
});

export default function EncuestaPage() {
  return <Formulario />;
}
