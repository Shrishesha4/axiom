import * as React from "react";
import { SmoothCaretInput } from "@/components/ui/smooth-caret-input";

function Input(props: React.ComponentProps<typeof SmoothCaretInput>) {
  return <SmoothCaretInput {...props} />;
}

export { Input, SmoothCaretInput };
