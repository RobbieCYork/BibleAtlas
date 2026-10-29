/**
 * Shows --fixtures: run with
 *   node scripts/signed-in-harness/run.mjs --persona member --fixtures scripts/signed-in-harness/examples/fixtures-override.json --script scripts/signed-in-harness/examples/fixtures-override.mjs
 * The JSON replaces the named tables and pins the named rpc results for the whole run.
 */
export default async function (h) {
  h.section("Fixture overrides");
  await h.click('[aria-label="Settings and account"]');
  await h.sleep(300);
  h.assert(/Overridden Name/.test(await h.evaluate(() => document.body.innerText)), "profile row came from the JSON file");
  const rows = h.backend.tables.feature_release.length;
  h.assert(rows === 1, `feature_release was replaced wholesale by the file (${rows} row) - a missing row reads as Live`);
}
