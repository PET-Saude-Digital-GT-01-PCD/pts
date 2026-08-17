import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Logo } from "@/components/ui/logo";

describe("Logo", () => {
  it("renderiza monograma e marca", () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain("PTS Digital");
    expect(html).toContain("<svg");
  });

  it("hideWordmark omite o texto da marca", () => {
    const html = renderToStaticMarkup(<Logo hideWordmark />);
    expect(html).not.toContain("PTS Digital");
  });
});