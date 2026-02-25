import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <SignUp appearance={{ elements: { card: "shadow-none border" } }} />
    </div>
  );
}
