# `eng.traineddata`

The English model the on-device text recogniser reads slides with. Fetched by `src/lib/noteOcr.ts`
when — and only when — somebody taps "Add text from image" in Sermon Notes.

- **What it is:** Tesseract 4 `tessdata_fast` English, from
  <https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz>, decompressed. 4,113,088 bytes.
  Apache-2.0, same as Tesseract itself.
- **Why `fast` and not `best`:** `fast` is the integer-quantised LSTM model. It is half the size of
  the standard model and roughly twice the speed on a phone, and the accuracy it gives up is on
  handwriting and degraded scans — not on projected slide text, which is the only thing this reads.
- **Why decompressed:** the recogniser can unpack a `.gz` itself, saving about 2 MB — but only if
  the host does not *also* serve it with `Content-Encoding: gzip`, in which case the browser unpacks
  it first and the recogniser is handed bytes it cannot read. That failure would only ever appear in
  production. A plain file cannot go wrong either way, and transport compression gets most of the
  saving back regardless.
- **Why it is committed rather than fetched from a CDN:** the recogniser runs on the device on
  purpose (cost, no signal in a church basement, and not shipping a photograph of someone's church
  to a third party). Leaving the model on somebody else's CDN would put a third party back in the
  path on a Sunday morning.

Downloaded once per device and then kept in IndexedDB by tesseract.js. Do not rename it: the
recogniser asks for `<langPath>/eng.traineddata` by that exact name.
