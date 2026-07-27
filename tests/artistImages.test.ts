import assert from "node:assert/strict";
import test from "node:test";
import { selectWikidataImageFile } from "../src/lib/artistImages.ts";

const claim = (
  value: string,
  rank: "preferred" | "normal" | "deprecated" = "normal"
) => ({ rank, mainsnak: { datavalue: { value } } });

test("prefers a preferred Wikidata Artist image over an earlier normal image", () => {
  assert.equal(
    selectWikidataImageFile([
      claim("first.jpg"),
      claim("preferred.jpg", "preferred"),
    ]),
    "preferred.jpg"
  );
});

test("uses the first ordinary image and ignores deprecated values", () => {
  assert.equal(
    selectWikidataImageFile([
      claim("old.jpg", "deprecated"),
      claim("portrait.jpg"),
      claim("alternate.jpg"),
    ]),
    "portrait.jpg"
  );
});

test("returns null when Wikidata has no usable Artist image", () => {
  assert.equal(selectWikidataImageFile(undefined), null);
  assert.equal(selectWikidataImageFile([claim("old.jpg", "deprecated")]), null);
});
