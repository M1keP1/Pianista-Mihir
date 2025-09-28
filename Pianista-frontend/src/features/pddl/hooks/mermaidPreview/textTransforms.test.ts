import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fixProblemEdges, maybeFixMermaid } from "./textTransforms";

const base = `flowchart TD
  a --> |label| goal
`;

describe("textTransforms", () => {
  it("inserts a goal node when problem edges target goal placeholders", () => {
    const input = `flowchart TD\n  foo --> |something|\n`;
    const result = fixProblemEdges(input);
    assert.match(result, /goal\(\(goal\)\)/);
    assert.match(result, /foo --> goal/);
  });

  it("does not duplicate goal nodes if one already exists", () => {
    const input = `flowchart TD\n  goal((goal))\n  foo --> |gap| goal\n`;
    const result = fixProblemEdges(input);
    const matches = result.match(/goal\(\(goal\)\)/g) ?? [];
    assert.strictEqual(matches.length, 1);
  });

  it("only fixes problem mermaid when the mode is problem", () => {
    const problemResult = maybeFixMermaid("P", `flowchart TD\n  foo --> |gap|\n`);
    const domainResult = maybeFixMermaid("D", base);
    assert.match(problemResult, /goal/);
    assert.strictEqual(domainResult, base);
  });
});
