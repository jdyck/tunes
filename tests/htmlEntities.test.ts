import assert from "node:assert/strict";
import test from "node:test";
import { decodeHtmlEntities } from "../src/utils/htmlEntities.ts";

test("decodes named and numeric HTML entities", () => {
  assert.equal(
    decodeHtmlEntities("Ella &amp; Louis &#8211; Don&#x27;t Be That Way"),
    "Ella & Louis – Don't Be That Way"
  );
});

test("leaves ordinary metadata unchanged", () => {
  assert.equal(decodeHtmlEntities("Beyoncé & Jay-Z"), "Beyoncé & Jay-Z");
});
