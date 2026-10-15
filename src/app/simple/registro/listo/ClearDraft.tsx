"use client";

// La cuenta ya está creada: se borra del móvil lo que se guardó mientras se rellenaba
import { useEffect } from "react";
import { DRAFT_KEY } from "../SimpleSignup";

export default function ClearDraft() {
  useEffect(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, []);
  return null;
}
