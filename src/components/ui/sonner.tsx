import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-black group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-gray-850 group-[.toaster]:shadow-[0_0_20px_rgba(255,255,255,0.1)] animate-slide-in-right",
          description: "group-[.toast]:text-gray-400",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:hover:bg-gray-200 group-[.toast]:font-medium group-[.toast]:tracking-wider",
          cancelButton: "group-[.toast]:bg-gray-900 group-[.toast]:text-gray-400 group-[.toast]:border group-[.toast]:border-gray-850 group-[.toast]:hover:text-white group-[.toast]:hover:border-white",
          success: "group-[.toaster]:border-white group-[.toaster]:shadow-[0_0_30px_rgba(255,255,255,0.2)]",
          error: "group-[.toaster]:border-gray-200 group-[.toaster]:shadow-[0_0_30px_rgba(200,200,200,0.2)]",
          warning: "group-[.toaster]:border-gray-400",
          info: "group-[.toaster]:border-gray-600",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
