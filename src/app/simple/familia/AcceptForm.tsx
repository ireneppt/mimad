"use client";

import { useActionState, useState } from "react";
import { BigInput, BigLabel, Hint, PrimarySubmit } from "@/components/simple/ui";
import { acceptInvite, type AcceptState } from "./actions";

// Caja grande para el código: acepta "ABC-DEF", "abc def"… y lo enseña como ABC-DEF
export default function AcceptForm() {
  const [state, action] = useActionState<AcceptState, FormData>(acceptInvite, {});
  const [code, setCode] = useState("");
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const shown = clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <BigLabel htmlFor="codigo">El código</BigLabel>
        <BigInput
          id="codigo"
          name="codigo"
          value={shown}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ABC-DEF"
          className="text-center font-mono text-3xl tracking-[0.3em]"
        />
      </div>
      {state.error && <Hint tone="error">{state.error}</Hint>}
      {clean.length === 6 && !state.error && <Hint tone="ok">Muy bien. Ahora toca «Unirme».</Hint>}
      <PrimarySubmit>Unirme</PrimarySubmit>
    </form>
  );
}
