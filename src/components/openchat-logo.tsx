import Image from "next/image";

export function OpenChatLogo({ className }: { className?: string }): React.JSX.Element {
  return (
    <Image
      src="/logo-dark.svg"
      alt="SecondStream Logo"
      className={`object-contain dark:invert ${className}`}
      height={32}
      priority
      style={{ height: "100%", width: "auto" }}
      width={160}
    />
  );
}
