// Actual "nothing selected" rendering lives in DetailPaneGate, which gates
// on pathname directly rather than trusting this slot resolves promptly —
// see that file for why.
export default function DetailSlotDefault() {
  return null;
}
