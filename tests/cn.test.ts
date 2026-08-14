import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("mescla classes e descarta valores falsy", () => {
    expect(cn("a", undefined, "b", false && "c", 0 && "d")).toBe("a b");
  });

  it("resolve conflitos de tailwind-merge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
