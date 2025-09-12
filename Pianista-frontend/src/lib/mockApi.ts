import toast from "react-hot-toast";

export async function mockApiToast(name: string, ms = 900, failRate = 0) {
  toast.loading(`Sending ${name}…`, { id: name });
  await new Promise(r => setTimeout(r, ms));
  const failed = Math.random() < failRate;
  toast.dismiss(name);
  if (failed) {
    toast.error(`${name} failed`);
    throw new Error(`${name} failed`);
  }
  toast.success(`${name} ✓`);
}
